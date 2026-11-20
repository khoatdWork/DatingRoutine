# Chỉ dẫn cho dự án tạo từ template

Đọc README.md, Design.md và CONTEXT.md của module liên quan trước khi sửa.

- Next.js App Router, static export, TypeScript strict, shadcn/ui (Radix Nova).
- Route chỉ ghép màn hình; nghiệp vụ nằm trong module/core, lưu dữ liệu trong module/data, Firebase client trong lib/firebase.
- Giữ giao diện mobile 320–430px, max-width 480px trên desktop, Be Vietnam Pro, bottom navigation và safe areas.
- Dùng src/config/app.ts cho thương hiệu, namespace storage và múi giờ. Đổi namespace khi tạo app mới.
- Lưu local thành công trước khi báo đã lưu. Chỉ báo Firebase xác nhận sau khi server trả về.
- Tách dữ liệu theo uid, giữ riêng guest. Không tự ghép hoặc ghi đè bản cloud khi có xung đột.
- JSON import phải kiểm schema/kích thước trước và xác nhận trước khi thay dữ liệu. Xóa, bỏ nháp, tải bản cloud, cập nhật có xác nhận.
- Không commit .env.local, credentials, dữ liệu người dùng, node_modules, out hoặc output. Firebase rules phải owner-only.
- Kiểm lint/typecheck/build/unit và browser khi sửa hành vi; test rules bằng emulator khi sửa quyền dữ liệu.
- Cập nhật module CONTEXT và docs/verification.md với kết quả thực; không tuyên bố đã kiểm tài khoản Firebase thật hoặc điện thoại thật nếu chưa chạy.
