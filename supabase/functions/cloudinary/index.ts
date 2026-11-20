declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const maxBytes = 8 * 1024 * 1024;
const formats = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const ownerPattern = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const responseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function fail(status: number, error: string) {
  return Response.json({ error }, { status, headers: responseHeaders });
}

function matchesFormat(bytes: Uint8Array, format: string) {
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((value, index) => bytes[offset + index] === value);
  if (format === "jpg") return startsWith([0xff, 0xd8, 0xff]);
  if (format === "png") return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8);
}

async function readImage(request: Request) {
  if (Number(request.headers.get("content-length")) > maxBytes) return null;
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(new Uint8Array(chunk.value));
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

async function sha256(text: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

export async function handleCloudinary(
  request: Request,
  env: (name: string) => string | undefined,
  requestUpstream: typeof fetch = fetch,
) {
  if (request.method === "OPTIONS") return new Response(null, { headers: responseHeaders });
  if (request.method !== "POST") return fail(405, "method_not_allowed");
  const authorization = request.headers.get("Authorization");
  if (!authorization || !/^Bearer \S+$/i.test(authorization)) return fail(401, "unauthorized");

  const supabaseUrl = env("SUPABASE_URL");
  const supabaseKey = env("SUPABASE_ANON_KEY");
  const cloudName = env("CLOUDINARY_CLOUD_NAME");
  const apiKey = env("CLOUDINARY_API_KEY");
  const apiSecret = env("CLOUDINARY_API_SECRET");
  if (
    !supabaseUrl ||
    !supabaseKey ||
    !cloudName ||
    !/^[\w-]+$/.test(cloudName) ||
    !apiKey ||
    !apiSecret
  )
    return fail(503, "upload_unavailable");

  try {
    // Supabase Auth verifies the bearer token and returns the canonical user ID.
    const auth = await requestUpstream(supabaseUrl.replace(/\/$/, "") + "/auth/v1/user", {
      headers: { authorization, apikey: supabaseKey },
      signal: request.signal,
    });
    if (!auth.ok) return fail(auth.status >= 500 ? 503 : 401, "auth_failed");
    const user = await auth.json();
    if (typeof user.id !== "string" || !ownerPattern.test(user.id) || user.is_anonymous === true)
      return fail(401, "unauthorized");

    const mime = request.headers.get("Content-Type") ?? "";
    const format = formats.get(mime);
    if (!format) return fail(415, "unsupported_format");
    const bytes = await readImage(request);
    if (!bytes || !bytes.length) return fail(413, "invalid_size");
    if (!matchesFormat(bytes, format)) return fail(415, "unsupported_format");

    const id = crypto.randomUUID();
    const publicId = "dating-routine-v1/" + user.id + "/" + id;
    const params = new URLSearchParams({
      allowed_formats: format,
      overwrite: "false",
      public_id: publicId,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      type: "authenticated",
    });
    const canonical = Array.from(params, ([key, value]) => key + "=" + value).join("&");
    const signature = Array.from(await sha256(canonical + apiSecret), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const form = new FormData();
    params.forEach((value, key) => form.set(key, value));
    form.set("api_key", apiKey);
    form.set("signature", signature);
    form.set("file", new Blob([bytes], { type: mime }), "photo." + format);

    const upload = await requestUpstream(
      "https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload",
      {
        method: "POST",
        body: form,
        signal: request.signal,
      },
    );
    if (!upload.ok) return fail(502, "upload_failed");
    const {
      public_id: uploadedId,
      width,
      height,
      version,
      format: uploadedFormat,
      type,
    } = await upload.json();
    if (
      uploadedId !== publicId ||
      uploadedFormat !== format ||
      type !== "authenticated" ||
      !Number.isSafeInteger(version) ||
      version < 1 ||
      !Number.isSafeInteger(width) ||
      width < 1 ||
      !Number.isSafeInteger(height) ||
      height < 1
    )
      return fail(502, "invalid_upload_response");

    const deliveryPath = publicId + "." + format;
    const signed = btoa(String.fromCharCode(...(await sha256(deliveryPath + apiSecret))))
      .slice(0, 32)
      .replaceAll("/", "_")
      .replaceAll("+", "-");
    const url =
      "https://res.cloudinary.com/" +
      cloudName +
      "/image/authenticated/s--" +
      signed +
      "--/v" +
      version +
      "/" +
      deliveryPath;

    return Response.json(
      { id, publicId, url, width, height, caption: "" },
      { headers: responseHeaders },
    );
  } catch {
    return fail(502, "upload_failed");
  }
}

if (typeof Deno !== "undefined") {
  Deno.serve((request) => handleCloudinary(request, (name) => Deno.env.get(name)));
}
