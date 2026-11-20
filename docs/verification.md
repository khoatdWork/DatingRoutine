# Kiểm chứng Đi cùng nhau — 21/11/2026

## Kết quả trên máy phát triển

| Kiểm tra                                                                                                                                                              | Kết quả                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Chọn dự án bằng setup: Đi cùng nhau / namespace dating-routine-v1 / Supabase / GitHub Pages                                                                           | PASS                                               |
| ESLint, TypeScript strict + Next route types, Prettier                                                                                                                | PASS                                               |
| Unit: schema, ngày, tiền, backup, namespace, quota, local version, adapter và Cloudinary Edge Function                                                                | 37/37 PASS                                         |
| Setup CLI: tổ hợp dịch vụ/hosting, namespace, xác nhận, giữ env                                                                                                       | 7/7 PASS                                           |
| PostgreSQL/PGlite: migration ghi chú nền và chuyến đi, RLS/RPC owner-only, guest/anonymous/khác uid, invalid schema, expected version                                 | 8/8 PASS                                           |
| Static export và PWA tại root và `/DatingRoutine/`                                                                                                                    | PASS                                               |
| Chromium + WebKit: CRUD chuyến đi, ngày không hợp lệ, chi phí/hạng mục/người trả, lưu qua reload, tìm theo ghi chú, lọc năm                                           | PASS                                               |
| Chromium + WebKit: guard nháp, theme, profile, backup/reset/import schema/confirm, editor cũ giữa hai tab                                                             | PASS                                               |
| Axe WCAG2A/AA/2.1AA, màn 320px/390px, desktop max480px                                                                                                                | PASS trong các màn đã kiểm                         |
| Chromium PWA: shell/font offline, tạo và đọc lại chuyến đi offline, manifest/icon dưới subpath                                                                        | PASS                                               |
| Chromium với Supabase và Cloudinary API giả: phiên tài khoản, guest/account isolation, upload PNG/authorization/MIME, preview, lưu metadata, chờ RPC mới báo xác nhận | PASS                                               |
| Chromium API giả: đọc lỗi, xung đột, xác nhận tải cloud, đăng xuất từ tab khác vẫn giữ nháp và lưu vào đúng owner                                                     | PASS                                               |
| Edge Function: thiếu auth, MIME giả, quá 8MiB, UID-scoped public ID, SHA-256 signature, authenticated delivery, lỗi Cloudinary                                        | 4/4 unit PASS (nằm trong 37 unit)                  |
| Edge TypeScript với Deno check                                                                                                                                        | PASS                                               |
| npm audit --omit=dev                                                                                                                                                  | 0 lỗ hổng dependency production tại thời điểm kiểm |

Browser fixture và ảnh chụp nằm ở `output/`, không commit. API giả không dùng dữ liệu người dùng, Supabase project hoặc Cloudinary account thật. Bản guest không phát request ra dịch vụ ngoài. Trình duyệt thực thi JavaScript production, không chỉ kiểm HTML.

## GitHub

Repo public `khoatdWork/DatingRoutine` đã tạo riêng từ template; remote `template` giữ URL gốc. Pages chọn source GitHub Actions, HTTPS, URL `https://khoatdwork.github.io/DatingRoutine/`.

Workflow Deploy GitHub Pages chạy trên push main, kiểm lint/types/unit/setup/SQL rồi build theo repo base path. Verify DatingRoutine kiểm format và Chromium/WebKit, thêm job Supabase/Cloudinary mock độc lập. Kết quả workflow thực được cập nhật sau lần push đầu.

## Giới hạn thực

- Chưa tạo Supabase project/Cloudinary account theo lựa chọn người dùng. Chưa nghiệm thu OAuth Google, Auth/PostgREST, upload/delivery Cloudinary hoặc quota thật. Bản public ban đầu dùng guest local; sau khi cấu hình dịch vụ phải build/deploy lại.
- PGlite mô phỏng auth.uid/JWT trên PostgreSQL WASM; không thay thế kiểm Supabase đầy đủ hoặc hai session database độc lập.
- Chưa cài trên điện thoại vật lý. WebKit không tương đương Safari iPhone thật; native install prompt và cập nhật qua hai release chưa kiểm riêng.
- localStorage version check không phải transaction liên tab nguyên tử. Khi lỗi dung lượng hoặc dữ liệu hỏng, app giữ nháp và không báo đã lưu. Khi storage event hỏng dữ liệu, hook giữ snapshot đọc được gần nhất để tránh unmount editor; ghi tiếp vẫn bị chặn.
- Mỗi tài khoản có nhật ký riêng, chưa chia sẻ nhật ký giữa hai uid. Đồng bộ thủ công cả snapshot, không tự merge.
- Ảnh authenticated có URL ký không hết hạn, người giữ URL có thể mở. Gỡ ảnh/bỏ nháp/xóa chuyến chỉ xóa tham chiếu. Cần xóa asset không dùng bằng Cloudinary Console. Ảnh không được service worker cache để dùng offline.
