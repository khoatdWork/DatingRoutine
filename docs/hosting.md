# GitHub Pages

Repo này đã chọn `github-pages` trong `project.config.json`. Workflow **Deploy GitHub Pages** chạy mỗi push `main` và có nút **Run workflow**. Bản tĩnh nằm ở `out/`; base path mặc định lấy tên repo `/DatingRoutine`.

## Thiết lập

1. Repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Repository Settings → Secrets and variables → Actions → **Variables**, thêm:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Actions → Deploy GitHub Pages → Run workflow trên nhánh `main` (hoặc push code).
4. Mở https://khoatdwork.github.io/DatingRoutine/.

Chưa có Supabase thì bỏ trống các biến; app vẫn deploy và dùng trên thiết bị. Muốn kích hoạt tài khoản sau đó, điền biến rồi chạy deploy lại. Cloudinary secret đặt trong Supabase Edge Function, không đặt vào Pages.

Để dùng custom domain ở root, đặt repository variable `PAGES_BASE_PATH` thành `/`, cấu hình domain trong Pages rồi cập nhật Supabase Site URL/Redirect URLs. Không đặt dấu `/` cuối cho base path dạng `/DatingRoutine`.

## Chạy production cục bộ

```powershell
$env:NEXT_PUBLIC_BASE_PATH = '/DatingRoutine'
npm run build
npm start
```

Mở http://localhost:3000/DatingRoutine/. `npm run dev` không đăng ký service worker. PWA cần HTTPS hoặc localhost; mở một lần có mạng để cache shell và font. Ảnh Cloudinary và request riêng tư không được cache trong service worker.

Workflow Verify DatingRoutine chạy lint/format/types/unit/setup/SQL, build dưới subpath, Chromium + WebKit và luồng Supabase/Cloudinary mô phỏng. Workflow deploy có kiểm lint/types/unit/setup/SQL trước khi xuất bản.
