import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { handleCloudinary } from "../../supabase/functions/cloudinary/index";

const owner = "aa223333-4444-5555-6666-777788889999";
const secret = "test-secret";
const settings: Record<string, string> = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-key",
  CLOUDINARY_API_SECRET: secret,
};
const env = (name: string) => settings[name];
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

function uploadRequest(bytes = jpg, mime = "image/jpeg") {
  return new Request("https://example.test/cloudinary?public_id=another-owner", {
    method: "POST",
    headers: { Authorization: "Bearer session", "Content-Type": mime },
    body: bytes,
  });
}

describe("Cloudinary upload function", () => {
  it("allows CORS preflight and rejects unauthorized requests before upload", async () => {
    const upstream = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 403 }));
    const preflight = await handleCloudinary(
      new Request("https://example.test", { method: "OPTIONS" }),
      env,
      upstream,
    );
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const response = await handleCloudinary(uploadRequest(), env, upstream);
    expect(response.status).toBe(401);
    expect(upstream).toHaveBeenCalledExactlyOnceWith(
      "https://example.supabase.co/auth/v1/user",
      expect.objectContaining({
        headers: { authorization: "Bearer session", apikey: "test-anon-key" },
      }),
    );
  });

  it("rejects forged MIME and oversized bytes before any upload", async () => {
    for (const [request, status] of [
      [uploadRequest(jpg, "image/png"), 415],
      [uploadRequest(new Uint8Array(8 * 1024 * 1024 + 1)), 413],
    ] as const) {
      const upstream = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ id: owner }));
      const response = await handleCloudinary(request, env, upstream);
      expect(response.status).toBe(status);
      expect(upstream).toHaveBeenCalledTimes(1);
    }
  });

  it("signs only owner-scoped authenticated uploads and delivers a signed Cloudinary URL", async () => {
    const upstream = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: owner }))
      .mockImplementationOnce(async (url, init) => {
        expect(url).toBe("https://api.cloudinary.com/v1_1/test-cloud/image/upload");
        const body = init?.body as FormData;
        const publicId = body.get("public_id");
        expect(publicId).toMatch(new RegExp("^dating-routine-v1/" + owner + "/[a-f0-9-]{36}$"));
        expect(body.get("overwrite")).toBe("false");
        expect(body.get("type")).toBe("authenticated");
        expect(body.get("allowed_formats")).toBe("jpg");
        const canonical = [...body.entries()]
          .filter(([name]) => !["signature", "api_key", "file"].includes(name))
          .map(([key, value]) => key + "=" + value)
          .sort()
          .join("&");
        expect(body.get("signature")).toBe(
          createHash("sha256")
            .update(canonical + secret)
            .digest("hex"),
        );
        expect(await (body.get("file") as File).bytes()).toEqual(jpg);
        return Response.json({
          public_id: publicId,
          width: 12,
          height: 34,
          version: 123,
          format: "jpg",
          type: "authenticated",
        });
      });
    const response = await handleCloudinary(uploadRequest(), env, upstream);
    expect(response.status).toBe(200);
    const photo = await response.json();
    const signature = createHash("sha256")
      .update(photo.publicId + ".jpg" + secret)
      .digest("base64url")
      .slice(0, 32);
    expect(photo).toEqual({
      id: photo.publicId.split("/").at(-1),
      publicId: photo.publicId,
      url:
        "https://res.cloudinary.com/test-cloud/image/authenticated/s--" +
        signature +
        "--/v123/" +
        photo.publicId +
        ".jpg",
      width: 12,
      height: 34,
      caption: "",
    });
  });

  it("returns an upload error when Cloudinary rejects the request", async () => {
    const upstream = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: owner }))
      .mockResolvedValueOnce(
        Response.json({ error: { message: "provider detail" } }, { status: 500 }),
      );
    const response = await handleCloudinary(uploadRequest(), env, upstream);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "upload_failed" });
  });
});
