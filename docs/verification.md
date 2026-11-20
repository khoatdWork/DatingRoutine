# Kiểm chứng template — 20/11/2026

## Đã chạy trên máy phát triển cho thay đổi đa dịch vụ

| Kiểm tra                                                                                                                                                                         | Kết quả                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| ESLint, TypeScript strict + Next route types, Prettier, git diff whitespace                                                                                                      | PASS                                              |
| Unit: schema/import/local/version/sync, namespace theo dịch vụ/project/uid, chọn adapter, Supabase read/RPC                                                                      | 27/27 PASS                                        |
| Setup CLI: bắt buộc chọn tên/dữ liệu/hosting, đủ 12 tổ hợp, namespace riêng, chặn schema/provider lỗi, xác nhận đổi lựa chọn, giữ env                                            | 7/7 PASS                                          |
| Chạy `npm run dev` khi template chưa setup                                                                                                                                       | Bị chặn, hướng dẫn chạy `npm run setup`           |
| Production static export + service worker: Local root, Firebase và Supabase dưới `/template-test`                                                                                | PASS                                              |
| Firestore Emulator với Java 21: owner read/write, guest/other-user denial, schema/version/path denial                                                                            | 3/3 PASS                                          |
| PostgreSQL/PGlite áp dụng Supabase migration: owner-only read/RPC, chặn guest/anonymous/khác uid/ghi trực tiếp, schema/kích thước/version                                        | 4/4 PASS                                          |
| Chromium + WebKit trên bản Local, Firebase và Supabase thiếu env: CRUD, nháp, lưu qua reload, filter/search, theme, backup/import/reset, chặn editor cũ                          | PASS                                              |
| Axe WCAG2A/AA/2.1AA: Trang chủ, Ghi chú, Thành phần, Cài đặt, theme tối, tài khoản 320px trên ba bản trên                                                                        | PASS trong phạm vi kiểm tra                       |
| Responsive 320px không tràn ngang; desktop giới hạn 480px; manifest/icon/root và subpath                                                                                         | PASS                                              |
| Chromium: service worker, reload offline, tạo/đọc lại ghi chú khi offline, không gọi dịch vụ cloud trên bản thiếu env/Local                                                      | PASS                                              |
| Chromium, Supabase với phiên/API mô phỏng: tách guest/tài khoản, local-first, chờ RPC mới báo thành công, giữ local khi đọc lỗi/xung đột, xác nhận tải cloud, đăng xuất về guest | PASS dưới `/template-test`                        |
| Firebase Hosting JSON, workflow YAML, kiểm Pages đúng hosting đã chọn                                                                                                            | Kiểm cấu trúc và CLI cục bộ PASS; chưa triển khai |

Các bản kiểm tra dùng namespace fixture, public key giả và demo Firebase project. Không dùng tài khoản hoặc dữ liệu người dùng thật. Ảnh/backup fixture nằm trong `output/` (ignored). Cấu hình template được trả về các trường `null` sau nghiệm thu để buộc người tạo dự án chọn trước khi bắt đầu.

Wizard tương tác cũng đã chạy trong fixture `output/setup-interactive`: hỏi tên, từ chối lựa chọn trống, chọn Supabase + Cloudflare bằng số và tạo namespace riêng thành công.

## CI

Workflow Verify template chỉ khởi tạo Local + host tĩnh cho schema 1 còn toàn bộ trường lựa chọn trống. Với cấu hình đã chọn, CI giữ nguyên và kiểm tính hợp lệ. Kiểm lint/format/types/unit/setup, Firestore emulator, Supabase SQL, build dưới subpath và Chromium/WebKit. Job Supabase browser dùng cấu hình fixture và API bị intercept riêng, không deploy.

Workflow Deploy GitHub Pages yêu cầu lựa chọn `github-pages` trước build/deploy; truyền public env của provider đã chọn. Cloudflare Pages, Firebase Hosting và host tĩnh dùng hướng dẫn tại [hosting.md](hosting.md).

Chưa chạy các workflow mới trên GitHub trong lần thay đổi này. Kết quả CI cũ tại [run 44713034699](https://github.com/khoatdWork/Web-Mobile-App-PWA-Template/actions/runs/44713034699) chỉ phản ánh commit `adb59824e75e3369321b3a7576f368fbd19b40a8` trước thay đổi đa dịch vụ.

## Giới hạn đã biết

- Chưa cấu hình Firebase/Supabase project thật: Google OAuth, redirect/authorized domains, Auth/PostgREST và đồng bộ qua mạng thật cần nghiệm thu trước triển khai. Browser Supabase dùng phiên/API mô phỏng.
- PGlite chạy PostgreSQL trong WASM với mô phỏng `auth.uid()`/JWT. Bài version kiểm hai lệnh cạnh tranh qua cùng kết nối; chưa kiểm hai session PostgreSQL độc lập hoặc toàn bộ Supabase stack.
- Chưa deploy Cloudflare Pages, GitHub Pages hoặc Firebase Hosting thật; chưa chạy workflow mới trên remote.
- Chưa cài trên điện thoại vật lý. WebKit không tương đương Safari iPhone thật; offline chỉ kiểm Chromium. Native install prompt và tình huống hai release/failed worker install chưa nghiệm thu riêng.
- LocalStorage version check chặn editor cũ nhưng không có transaction liên tab nguyên tử. Nhu cầu ghi song song cường độ cao cần IndexedDB transaction.
- Khóa tài khoản Firebase cũ chỉ có uid không tự gán sang namespace mới vì thiếu định danh project gốc. Dữ liệu cũ vẫn được giữ; xuất từ bản cũ và nhập có xác nhận ở bản mới. Đổi dịch vụ không tự di chuyển dữ liệu cloud.
- Đồng bộ là snapshot/version và thao tác thủ công; không tự merge. Supabase RPC kiểm schema/phần tử/kích thước; Firestore rules hiện kiểm quyền và cấu trúc cấp cao, phần tử note kiểm ở client. Mở rộng rules/server validation nếu có yêu cầu chặt hơn.
