# Chỉ dẫn cho dự án tạo từ template

Đọc README.md, Design.md và CONTEXT.md của module liên quan trước khi sửa.

- Next.js App Router, static export, TypeScript strict, shadcn/ui (Radix Nova).
- Trước khi bắt đầu dự án mới, chạy `npm run setup` để người tạo chọn rõ dữ liệu và hosting độc lập; không tự chọn Firebase hoặc suy đoán dịch vụ từ env. Commit `project.config.json` đã chọn. Đổi lựa chọn/namespace có xác nhận, không tự chuyển dữ liệu giữa dịch vụ.
- Route chỉ ghép màn hình; nghiệp vụ nằm trong module/core, lưu dữ liệu trong module/data. Auth/cloud đi qua adapter theo `src/config/services.ts`; Firebase client trong lib/firebase, Supabase client trong lib/supabase.
- Giữ giao diện mobile 320–430px, max-width 480px trên desktop, Be Vietnam Pro, bottom navigation và safe areas.
- Dùng src/config/app.ts cho thương hiệu và múi giờ, lấy tên/namespace từ project.config.json. Tạo namespace riêng khi tạo app mới, kể cả sao chép app đã setup.
- Lưu local thành công trước khi báo đã lưu. Chỉ báo nhà cung cấp cloud xác nhận sau khi server trả về.
- Tách dữ liệu theo uid, giữ riêng guest. Không tự ghép hoặc ghi đè bản cloud khi có xung đột.
- JSON import phải kiểm schema/kích thước trước và xác nhận trước khi thay dữ liệu. Xóa, bỏ nháp, tải bản cloud, cập nhật có xác nhận.
- Không commit .env.local, credentials, dữ liệu người dùng, node_modules, out hoặc output. Firebase rules và Supabase RLS/RPC phải owner-only. Không đưa Supabase service_role/secret key vào client.
- Kiểm lint/typecheck/build/unit/setup và browser khi sửa hành vi; test Firestore rules bằng emulator, Supabase RLS/RPC bằng PostgreSQL cục bộ khi sửa quyền dữ liệu.
- Cập nhật module CONTEXT và docs/verification.md với kết quả thực; không tuyên bố đã kiểm tài khoản Firebase thật hoặc điện thoại thật nếu chưa chạy.
