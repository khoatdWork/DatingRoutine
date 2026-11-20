import { dataProvider } from "@/config/services";
import { supabaseClient } from "@/lib/supabase/client";
import { supabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/config";
import type { TripPhoto } from "@/modules/trips/core/domain";

const photoTypes = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const PHOTO_ACCEPT = photoTypes.join(",");
export const cloudinaryConfigured = dataProvider === "supabase" && supabaseConfigured;

const messages: Record<number, string> = {
  401: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tải ảnh.",
  413: "Ảnh phải có dung lượng từ 1 byte đến 8 MB.",
  415: "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.",
  503: "Máy chủ chưa được cấu hình để tải ảnh lên Cloudinary.",
};

export async function uploadTripPhoto(file: File, signal?: AbortSignal): Promise<TripPhoto> {
  if (!cloudinaryConfigured || !supabaseUrl || !supabaseKey)
    throw new Error("Chưa cấu hình Supabase để tải ảnh lên Cloudinary.");
  if (!file.size || file.size > MAX_PHOTO_BYTES) throw new Error(messages[413]);
  if (!photoTypes.includes(file.type)) throw new Error(messages[415]);

  signal?.throwIfAborted();
  const { data, error } = await supabaseClient().auth.getSession();
  if (error || !data.session) throw new Error("Hãy đăng nhập để tải ảnh lên Cloudinary.");

  let response: Response;
  try {
    response = await fetch(supabaseUrl.replace(/\/$/, "") + "/functions/v1/cloudinary", {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: "Bearer " + data.session.access_token,
        "Content-Type": file.type,
      },
      body: file,
      signal,
    });
  } catch {
    signal?.throwIfAborted();
    throw new Error("Không kết nối được máy chủ tải ảnh. Hãy thử lại.");
  }
  if (!response.ok)
    throw new Error(messages[response.status] ?? "Cloudinary chưa xác nhận tải ảnh. Hãy thử lại.");

  const photo = (await response.json().catch(() => null)) as TripPhoto | null;
  if (
    !photo ||
    typeof photo.id !== "string" ||
    typeof photo.publicId !== "string" ||
    typeof photo.url !== "string" ||
    !photo.url.startsWith("https://res.cloudinary.com/") ||
    !Number.isSafeInteger(photo.width) ||
    photo.width <= 0 ||
    !Number.isSafeInteger(photo.height) ||
    photo.height <= 0
  ) {
    throw new Error("Máy chủ trả về thông tin ảnh không hợp lệ.");
  }
  return { ...photo, caption: "" };
}
