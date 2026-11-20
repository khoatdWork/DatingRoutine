# Ảnh Cloudinary

Ảnh chuyến đi cần người dùng đăng nhập Supabase. Trình duyệt gửi tối đa 8 MiB ảnh JPEG, PNG hoặc WebP đến Edge Function `cloudinary`. Function xác minh token với endpoint Supabase Auth `GET /auth/v1/user`, sau đó gọi Cloudinary bằng yêu cầu được ký SHA-256. Public ID có dạng `dating-routine-v1/<uid>/<uuid>`. Supabase lưu thông tin ảnh và URL trong workspace được bảo vệ bằng quyền owner-only.

## Triển khai

1. Tạo product environment của Cloudinary và lấy Cloud Name, API Key và API Secret trong Cloudinary Console. Luồng này dùng signed upload với delivery type `authenticated` và Shared CDN mặc định `res.cloudinary.com`. Không cần tạo unsigned upload preset.
2. Tạo tệp bí mật trên máy, nằm ngoài Git, với ba mục `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Supabase cung cấp `SUPABASE_URL` và `SUPABASE_ANON_KEY` trong Edge Function. Ưu tiên tệp môi trường riêng để tránh để lộ giá trị trong lịch sử lệnh.
3. Tệp bí mật có dạng sau; thay placeholder bằng thông tin trong Cloudinary Console và lưu ngoài repo:

```dotenv
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_API_KEY
CLOUDINARY_API_SECRET=YOUR_API_SECRET
```

4. Dùng Supabase CLI qua `npx` (không cần Docker) để triển khai từ thư mục gốc dự án. Project ref là phần trước `.supabase.co` trong Project URL.

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set --env-file C:/path/to/cloudinary-secrets.env
npx supabase functions deploy cloudinary --use-api
```

`supabase/config.toml` đặt `verify_jwt = false` để kiểm tra token người dùng qua Supabase Auth, hỗ trợ cả khóa ký JWT mới. Upload từ origin GitHub Pages cần public URL và publishable/anon key Supabase khi build. Các giá trị Cloudinary ở bước 2 nằm trong Edge Function secrets.

## Hành vi

URL ảnh có chữ ký riêng cho asset và có thể mở ngoài app bởi người có URL. Chữ ký không hết hạn. URL trần của ảnh authenticated yêu cầu chữ ký hợp lệ. Bỏ ảnh khỏi chuyến đi chỉ bỏ tham chiếu, kể cả khi bỏ nháp sau khi ảnh đã tải. Có thể quản lý các ảnh không còn dùng trong Cloudinary Console. Upload trực tuyến. Chuyến đi vẫn lưu thông tin trên thiết bị và đồng bộ theo luồng hiện có.

Để xác minh với tài khoản thật, đăng nhập trên GitHub Pages, tải một ảnh nhỏ, lưu chuyến đi, đồng bộ và mở trên phiên sạch của cùng tài khoản. Kiểm tra tài khoản khác không đọc được workspace, URL ảnh đã ký hiển thị, URL bỏ chữ ký bị Cloudinary từ chối và Edge Function trả 401 khi thiếu token.
