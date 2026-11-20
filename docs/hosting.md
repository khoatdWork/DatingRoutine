# Triển khai PWA

Chạy `npm run setup` và chọn nơi triển khai cho dự án. Commit `project.config.json` để các lần build và CI dùng cùng lựa chọn. Ví dụ sau dùng dữ liệu local và Cloudflare Pages.

```powershell
npm run setup -- --data local --hosting cloudflare --name "Tên ứng dụng"
```

| Nơi triển khai    | Giá trị `--hosting` |
| ----------------- | ------------------- |
| Cloudflare Pages  | `cloudflare`        |
| GitHub Pages      | `github-pages`      |
| Firebase Hosting  | `firebase`          |
| Máy chủ tĩnh khác | `static`            |

Mỗi lựa chọn triển khai dùng được với `local`, `firebase` hoặc `supabase`. Nếu dùng cloud, nhập các biến `NEXT_PUBLIC_*` của provider vào môi trường **trước khi build**. Các giá trị này xuất hiện trong mã client. Chỉ nhập khóa web Firebase hoặc khóa Supabase publishable (hoặc anon cũ) theo `.env.example`.

Triển khai toàn bộ nội dung của `out/`, kể cả `_next/` và `sw.js`. PWA dùng HTTPS hoặc `localhost`. Nếu app đặt dưới `/ten-app`, đặt `NEXT_PUBLIC_BASE_PATH=/ten-app` trước khi build và phục vụ `out/` tại đúng đường dẫn đó. Với domain riêng ở root, để biến này trống.

## Cloudflare Pages

- Tạo dự án Pages và kết nối repository. Chọn preset **None**, đặt build command `node scripts/check-project.mjs --hosting cloudflare && npm run build`, output directory `out` và biến `NODE_VERSION=26.4.0`. Thêm biến môi trường provider dữ liệu nếu có. Dùng root directory chứa `package.json`.
- Nếu dùng Direct Upload, chạy các lệnh sau với tên dự án Pages đã tạo.

```powershell
node scripts/check-project.mjs --hosting cloudflare
npm run build
npx wrangler pages deploy out --project-name YOUR_PAGES_PROJECT
```

## GitHub Pages

Trong **Settings → Pages**, chọn source **GitHub Actions**. Với project Pages, workflow mặc định dùng `/ten-repo`. Với domain riêng hoặc repo `owner.github.io`, đặt repository variable `PAGES_BASE_PATH` thành `/`. Thêm biến môi trường provider dữ liệu trong **Settings → Secrets and variables → Actions → Variables**.

Chạy **Deploy GitHub Pages** từ tab **Actions**. Workflow kiểm `project.config.json` trước khi build và triển khai. Gói GitHub cần hỗ trợ Pages cho repository private nếu dự án dùng repo private.

## Firebase Hosting

Tạo hoặc chọn Firebase project có bật Hosting. Build cho đường dẫn root và triển khai bằng project ID cụ thể.

```powershell
node scripts/check-project.mjs --hosting firebase
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting --project YOUR_HOSTING_PROJECT_ID
```

`firebase.json` trỏ Hosting vào `out/`. Nếu dữ liệu cũng dùng Firestore, triển khai rules vào project dữ liệu theo [hướng dẫn Firebase](firebase.md). Firebase Hosting có thể dùng chung hoặc dùng project riêng với Firestore.

## Máy chủ tĩnh khác

```powershell
node scripts/check-project.mjs --hosting static
npm run build
npm start
```

`npm start` để xem bản build trên máy. Truyền cùng `NEXT_PUBLIC_BASE_PATH` đã dùng lúc build nếu chạy app dưới đường dẫn con. Trên host, phục vụ thư mục `out/` với `index.html` cho đường dẫn thư mục và `404.html` cho HTTP 404. Phục vụ `sw.js` dưới dạng JavaScript và đặt `Cache-Control: no-cache` cho file này nếu host cho phép cấu hình header.
