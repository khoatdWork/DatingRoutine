# Supabase

1. Chọn **Supabase** cho dịch vụ dữ liệu khi cấu hình dự án.
2. Tạo project Supabase riêng. Áp dụng [migration](../supabase/migrations/20261120000000_note_workspaces.sql) bằng SQL Editor hoặc quy trình migration Supabase CLI của dự án. Migration tạo bảng, chính sách đọc và RPC để ghi.
3. Trong Supabase Dashboard, bật **Authentication → Sign In / Providers → Google**. Trong Google Cloud, tạo OAuth client loại **Web application**. Thêm callback URL do Supabase Dashboard cung cấp vào **Authorized redirect URIs** của Google OAuth client. Nhập Client ID và Client Secret vào phần Google provider của Supabase.
4. Trong **Authentication → URL Configuration**, đặt Site URL theo địa chỉ đã triển khai. Thêm URL về app vào danh sách Redirect URLs, ví dụ `http://localhost:3000/` cho phát triển, `https://app.example.com/` cho domain riêng hoặc `https://owner.github.io/ten-repo/` cho GitHub Pages. Giữ dấu `/` cuối đúng với đường dẫn đã build. Phiên PKCE được hoàn tất trong cùng trình duyệt đã khởi tạo đăng nhập.
5. Đặt `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` trước khi build. Dự án dùng khóa cũ có thể đặt `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Hai loại khóa này dành cho client. Giữ Google Client Secret trong Dashboard và giữ khóa bí mật Supabase ngoài bản build.

Mỗi tài khoản có một workspace riêng. Postgres RLS giới hạn quyền đọc theo uid. RPC kiểm chủ sở hữu, dữ liệu và phiên bản trong cùng giao dịch. Phiên bản `0` tạo mới khi workspace chưa tồn tại. Phiên bản dương chỉ cập nhật khi khớp bản đang lưu. Xung đột giữ nguyên bản đám mây và bản đang có trên thiết bị.

Chạy `npm run test:db:supabase` để áp dụng migration và kiểm quyền trong PostgreSQL cục bộ qua PGlite. Bài kiểm tạo các vai trò và mô phỏng thông tin JWT do Supabase truyền cho PostgreSQL. Đăng nhập Google, Supabase Auth và PostgREST cần được kiểm trên project thử nghiệm đã cấu hình khi triển khai.

Kiểm tra tích hợp trình duyệt với API mô phỏng (không kết nối project thật):

```powershell
npm run setup -- --name "Supabase test" --data supabase --hosting static
$env:NEXT_PUBLIC_SUPABASE_URL = "https://template-test.supabase.invalid"
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_mock_test"
npm run build
npm run test:e2e:supabase
```

Nếu đang có cấu hình, setup yêu cầu xác nhận; dùng bản checkout thử nghiệm để tránh đổi lựa chọn dự án đang phát triển. Giữ `NEXT_PUBLIC_SUPABASE_URL` giống giá trị build khi chạy test. Test khôi phục phiên giả, chặn API Supabase bằng Playwright và kiểm lưu local trước, chờ RPC, lỗi/xung đột, xác nhận tải cloud và đăng xuất. Service worker bị tắt riêng trong test này để kiểm soát intercept; PWA offline được kiểm bởi `test:e2e` ở bản không có credentials cloud. CI có job fixture riêng cho luồng Supabase mô phỏng.
