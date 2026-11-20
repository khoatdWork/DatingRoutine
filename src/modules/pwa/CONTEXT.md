# PWA

Giữ cơ chế từ WorkingTimeTracking, thay branding/cache prefix bằng manifest app mới. Manifest id/start/scope có basePath. Build precache toàn bộ shell/static/font/icon; hash file + worker thành cache version. Worker chỉ phục vụ GET public build assets trong scope, không cache Auth/Firestore/dữ liệu riêng. Icon PNG sinh từ public/icon.svg bằng npm run icons.

Không register ở dev. Install thất bại xóa cache chưa hoàn chỉnh; không skipWaiting tự động. Giữ assets cache cũ khi có tab còn mở. Update chỉ reload tab chủ động chấp nhận; tab khác giữ state/nháp. next-themes/fonts hoàn toàn local nên shell dùng offline. Mở một lần có mạng trước khi dùng offline. Kiểm physical iOS/install prompt thật phải làm riêng.

`project.config.json` lưu lựa chọn host độc lập với dữ liệu. Mọi host phục vụ bản static export `out/`. Khi triển khai dưới thư mục con, thiết lập `NEXT_PUBLIC_BASE_PATH` trước build để manifest, URL tài nguyên và scope service worker cùng một đường dẫn. Xem [hướng dẫn triển khai](../../../docs/hosting.md).
