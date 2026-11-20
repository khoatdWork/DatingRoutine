# Đi cùng nhau

Cuốn nhật ký chuyến đi của hai đứa: lưu những nơi đã đến, ảnh kỷ niệm, ghi chú và từng khoản chi. Tạo từ [Web Mobile App PWA Template](https://github.com/khoatdWork/Web-Mobile-App-PWA-Template).

- **App:** https://khoatdwork.github.io/DatingRoutine/
- **Mã nguồn:** https://github.com/khoatdWork/DatingRoutine
- Next.js App Router, React, TypeScript strict, shadcn/Radix, Be Vietnam Pro, PWA static export.
- **Dữ liệu:** Supabase PostgreSQL + Google Auth. **Ảnh:** Cloudinary qua Supabase Edge Function. **Deploy:** GitHub Actions → GitHub Pages.

## Có thể làm gì?

- Tạo, sửa, tìm và lọc chuyến đi theo năm; lưu địa điểm, ngày đi/về, cảm xúc và ghi chú.
- Thêm album ảnh, chú thích, xem ảnh lớn; tối đa 30 ảnh/chuyến, JPEG/PNG/WebP tối đa 8 MiB/ảnh.
- Ghi chi phí bằng VND: di chuyển (vé máy bay, taxi…), ăn uống, lưu trú, vé, mua sắm và khoản khác. Đánh dấu Mình / Bạn ấy / Cả hai trả; tổng hợp theo chuyến, hạng mục và người trả.
- Dùng trên thiết bị khi chưa đăng nhập, đọc/ghi chuyến đi offline sau lần mở có mạng. Ảnh cần mạng và tài khoản đã cấu hình.
- Lưu local trước, chủ động đồng bộ Supabase, kiểm phiên bản để chặn ghi đè khi xung đột.
- Giao diện sáng/tối/theo thiết bị, cài ra màn hình chính, sao lưu/khôi phục JSON có xác nhận.

## Chạy trên máy

Node **26.4.x**, npm **11.17.0**.

```powershell
npm ci
npm run dev
```

Mở http://localhost:3000. `project.config.json` đã chọn **Supabase** và **GitHub Pages**, namespace riêng `dating-routine-v1`. Không cần chạy lại setup. Khi chưa cấu hình Supabase, app vẫn cho ghi chuyến đi, chi phí và xuất sao lưu trong trình duyệt. Không có dữ liệu mẫu được lưu sẵn.

## Thiết lập dịch vụ lần đầu

1. [Tạo Supabase, schema và đăng nhập Google](docs/supabase.md).
2. [Tạo Cloudinary và deploy hàm tải ảnh](docs/cloudinary.md).
3. Trong [GitHub Actions Variables](https://github.com/khoatdWork/DatingRoutine/settings/variables/actions), thêm `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Push lên `main`, hoặc chạy **Deploy GitHub Pages** trong Actions để build lại.

Trên máy, copy `.env.example` thành `.env.local`, điền hai biến Supabase rồi chạy lại dev/build. API Secret Cloudinary chỉ đặt trong Supabase Edge Function secrets. Không đặt Cloudinary secret hoặc Supabase service*role trong biến `NEXT_PUBLIC*\*`, repository hoặc GitHub Pages.

## Deploy tự động

[Workflow Pages](.github/workflows/pages.yml) kiểm lint, types, unit, setup và SQL rồi build static export với base path `/DatingRoutine`. Mỗi push `main` sẽ deploy thư mục `out/`. Chi tiết tại [hướng dẫn deploy](docs/hosting.md).

```powershell
# Xem production dưới đúng đường dẫn của GitHub Pages
$env:NEXT_PUBLIC_BASE_PATH = '/DatingRoutine'
npm run build
npm start
```

Mở http://localhost:3000/DatingRoutine/. Build chưa có biến Supabase là bản dùng trên thiết bị; sau khi thêm biến phải deploy lại.

## Dữ liệu và quyền riêng tư

Repo public chỉ chứa mã nguồn. Nhật ký của mỗi tài khoản có workspace riêng, RLS owner-only. Hai tài khoản khác nhau chưa chia sẻ chung một nhật ký. Dữ liệu khách nằm riêng trong trình duyệt; đăng nhập/đăng xuất không tự chuyển hoặc ghép dữ liệu. Muốn chuyển, xuất JSON ở guest rồi nhập vào tài khoản và đồng bộ.

Ảnh có delivery type `authenticated`; URL có chữ ký có thể mở bởi người giữ URL. Bản sao lưu chứa các URL này, không chứa ảnh gốc. Gỡ ảnh, xóa chuyến đi hoặc bỏ nháp chỉ xóa tham chiếu; ảnh đã tải vẫn giữ trong Cloudinary Console. Ảnh không được cache trong service worker, nên xem ảnh offline không được bảo đảm.

Bản local có giới hạn 2 MB, 300 chuyến đi, 200 khoản chi/chuyến. Trình duyệt có thể dọn dữ liệu; nên xuất sao lưu và đồng bộ. App không tự merge hoặc tự ghi đè hai bản xung đột.

## Kiểm tra và phát triển tiếp

```powershell
npm run verify
npm run format:check
python -m pip install -r requirements-dev.txt
python -m playwright install chromium webkit
npm run test:e2e
```

Xem kết quả thực tại [docs/verification.md](docs/verification.md). Đọc [AGENTS.md](AGENTS.md), [Design.md](Design.md), và `CONTEXT.md` trước khi sửa.

```text
src/modules/trips/core/      Schema và kiểm sao lưu, ngày, số tiền, URL ảnh
src/modules/trips/data/      Repository local, sync có kiểm phiên bản, Supabase adapter
src/modules/trips/           Home, danh sách, editor, chi tiết và chi phí
src/modules/media/           Client upload qua Edge Function
src/modules/app-shell/       Ghép màn hình, guard nháp, điều hướng
src/modules/auth/            Adapter xác thực của template
src/modules/settings/        Hồ sơ, tài khoản, theme, PWA, sao lưu
supabase/migrations/         Schema/RLS/RPC chuyến đi
supabase/functions/cloudinary/ Tải ảnh đã xác thực và ký URL Cloudinary
```

Các module ghi chú, Firebase và gallery gốc được giữ làm tham chiếu và kiểm thử nền tảng; app này sử dụng module `trips`, Supabase và Cloudinary.
