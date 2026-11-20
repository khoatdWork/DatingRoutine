# Kiểm chứng template — 20/11/2026

## Đã chạy trên máy phát triển

| Kiểm tra                                                                                         | Kết quả                                   |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| ESLint                                                                                           | PASS                                      |
| TypeScript strict + Next route types                                                             | PASS                                      |
| Prettier                                                                                         | PASS                                      |
| Production static export + sinh service worker                                                   | PASS                                      |
| Unit: schema, import, lưu local, namespace, phiên bản, chính sách sync                           | 18/18 PASS                                |
| Firestore Emulator Java21: owner read/write, guest/other-user denial, schema/version/path denial | 3/3 PASS                                  |
| Chromium + WebKit: tạo/sửa/hoàn tất/tìm/lọc ghi chú                                              | PASS                                      |
| Giữ nháp, xác nhận bỏ nháp, local persistence qua reload                                         | PASS                                      |
| Export → reset → import lại hồ sơ/ghi chú, từ chối JSON lỗi                                      | PASS                                      |
| Hai cửa sổ: chặn editor cũ và giữ nháp                                                           | PASS                                      |
| Theme sáng/tối và ghi nhớ qua reload                                                             | PASS                                      |
| Axe WCAG2A/AA/2.1AA: Trang chủ, Ghi chú, Thành phần, Cài đặt, theme tối, tài khoản320px          | PASS, không có vi phạm trong phạm vi test |
| Không tràn ngang320px; desktop giới hạn480px                                                     | PASS                                      |
| Manifest, icon URLs, scope/start_url                                                             | PASS                                      |
| Chromium: service worker, offline reload, tạo ghi chú khi offline, đọc lại sau reload            | PASS                                      |
| Chromium: cache không chứa Firebase/Auth requests                                                | PASS                                      |

Ảnh và backup fixture nằm ở output/ (ignored). Ảnh giới thiệu sạch nằm trong docs/screenshots/. Không sao chép dữ liệu người dùng từ WorkingTimeTracking. Chỉ lấy primitives và hạ tầng PWA/static server; nghiệp vụ ghi chú, namespace và Firebase project cấu hình lại riêng.

## CI

Workflow Verify template chạy cùng lint/type/unit/rules/browser trên Ubuntu, build với base path `/template-test` để kiểm sử dụng dưới đường dẫn con.

**PASS toàn bộ** tại [GitHub Actions run 44713034699](https://github.com/khoatdWork/Web-Mobile-App-PWA-Template/actions/runs/44713034699), source commit `adb59824e75e3369321b3a7576f368fbd19b40a8`. Chromium/WebKit, 18 unit test, 3 rules test và build dưới đường dẫn con đều thành công. Phần cập nhật sau commit này chỉ gồm tài liệu và ảnh minh họa Cài đặt.

## Giới hạn đã biết

- Chưa cấu hình Firebase project thật cho template: Google OAuth, đồng bộ cloud qua mạng thật và authorized domains chưa nghiệm thu.
- Chưa cài trên điện thoại vật lý; WebKit regression không tương đương Safari iPhone thật. Offline đã kiểm bằng Chromium; WebKit chỉ UI/manifest.
- Service worker update kế thừa cơ chế app gốc; chưa chạy tình huống hai release/failed-install riêng trong template. Không xác nhận native install prompt hoặc update trên thiết bị thật.
- LocalStorage version check chặn editor cũ nhưng không có transaction liên tab nguyên tử. Với nhu cầu ghi song song cường độ cao, đổi repository sang IndexedDB transaction.
- Snapshot cloud dùng transaction/version và đồng bộ thủ công; xung đột không tự merge. Rules xác nhận quyền owner và cấu trúc cấp cao; phần tử note được validator client kiểm, cần mở rộng phía server khi có yêu cầu dữ liệu không tin cậy.
- Không tự deploy website hoặc Firebase production. Workflow Pages là opt-in; quyền Pages repo private phụ thuộc gói GitHub.
