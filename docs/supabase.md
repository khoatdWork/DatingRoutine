# Supabase cho Đi cùng nhau

## Tạo database

1. Tạo tài khoản ở https://supabase.com và chọn **New project**. Dùng project riêng cho DatingRoutine; ghi lại mật khẩu database ở nơi an toàn.
2. Mở **SQL Editor → New query**, dán và chạy toàn bộ [migration chuyến đi](../supabase/migrations/20261121000000_trip_workspaces.sql). Migration tạo `trip_workspaces`, RLS và RPC `write_trip_workspace`. Không cần chạy migration ghi chú mẫu để dùng app.
3. Lấy **Project URL** và **Publishable key** trong Project Settings → API/Data API hoặc Connect. Không lấy secret/service_role key để đưa vào app.

## Đăng nhập Google

1. Tạo project Google Cloud, cấu hình OAuth consent screen và OAuth client loại **Web application**. Nếu ở chế độ thử nghiệm, thêm hai email của bạn vào danh sách test users.
2. Trong Supabase **Authentication → Sign In / Providers → Google**, bật Google; nhập Client ID và Client Secret của Google.
3. Sao chép callback Supabase hiển thị, dạng `https://YOUR_REF.supabase.co/auth/v1/callback`, vào **Authorized redirect URIs** của Google OAuth client.
4. Trong Supabase **Authentication → URL Configuration**, đặt Site URL:

```text
https://khoatdwork.github.io/DatingRoutine/
```

Thêm URL trên và `http://localhost:3000/` vào Redirect URLs. Nếu xem production cục bộ dưới base path, thêm `http://localhost:3000/DatingRoutine/`. Giữ dấu `/` cuối. Google callback là URL Supabase, còn app redirect là URL GitHub Pages.

## Cấu hình app và GitHub

Trên máy:

```powershell
Copy-Item .env.example .env.local
```

Điền `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` trong `.env.local`. Chạy lại `npm run dev`. Sau đó thêm đúng hai giá trị vào repository **Settings → Secrets and variables → Actions → Variables** và chạy **Deploy GitHub Pages** lại. Publishable key dành cho trình duyệt, quyền dữ liệu được bảo vệ bởi RLS.

Để thêm ảnh, làm tiếp [hướng dẫn Cloudinary](cloudinary.md).

## Đồng bộ

Mỗi uid có một workspace riêng. App ghi local trước. Vào Cài đặt → Tài khoản & đồng bộ → **Đồng bộ ngay** để gửi/nhận snapshot. RPC kiểm quyền, schema và expected version trong một giao dịch. Khi thiết bị và cloud thay đổi riêng, app chặn ghi đè; xuất bản sao lưu trước khi chọn tải cloud có xác nhận.

Dữ liệu khách không tự nhập vào tài khoản. Tài khoản khác nhau chưa dùng chung nhật ký. Dữ liệu không phụ thuộc repo public/private.

## Kiểm tra sau thiết lập

Đăng nhập, tạo một chuyến, tải một ảnh, lưu và đồng bộ. Mở app ở một trình duyệt sạch, đăng nhập cùng tài khoản rồi bấm Đồng bộ ngay để nhận lại. Tài khoản khác phải thấy workspace trống. Xác nhận ảnh mở được và URL ảnh bỏ chữ ký bị từ chối.

`npm run test:db:supabase` kiểm schema/RLS/RPC bằng PostgreSQL cục bộ PGlite, có mô phỏng JWT. Đây không phải kiểm thử Supabase Auth/PostgREST thật. Browser mock:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = 'https://template-test.supabase.invalid'
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mock_test'
$env:NEXT_PUBLIC_BASE_PATH = '/DatingRoutine'
npm run build
npm run test:e2e:supabase
```

Các giá trị trên chỉ là fixture giả; bỏ biến khỏi terminal trước khi build bản thật.
