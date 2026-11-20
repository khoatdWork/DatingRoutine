# Firebase cho dữ liệu

Chọn `firebase` cho dữ liệu khi chạy `npm run setup`. Chọn bất kỳ nền tảng triển khai nào trong cùng bước, rồi cấu hình Firebase theo hướng dẫn này. Cài đặt triển khai riêng nằm trong [hướng dẫn hosting](hosting.md).

1. Tạo Firebase project riêng và thêm Web App.
2. Bật Authentication → Google. Thêm localhost và domain host vào Authorized domains; Firebase Auth popup cần mạng và trình duyệt cho phép mở cửa sổ.
3. Tạo Firestore, chọn location phù hợp. Schema: `users/{uid}/workspaces/default` chứa `{ version, snapshot: { schemaVersion, profile, notes }, updatedAt }`.
4. Sao chép cấu hình Web App vào `.env.local` theo `.env.example`. Đây là Firebase Web config phía client; không đưa service-account/private key vào `NEXT_PUBLIC_*`.
5. Cài Java21+ để kiểm rules, chạy `npm run test:db`. Khi sẵn sàng deploy rules, dùng `npx firebase-tools login` rồi `npx firebase-tools deploy --only firestore:rules --project YOUR_PROJECT_ID`.
6. Build lại. Vào Cài đặt → Tài khoản & đồng bộ → Đăng nhập với Google.

Trên GitHub Pages, thêm các giá trị `NEXT_PUBLIC_FIREBASE_*` vào repository **Variables** có cùng tên trước khi chạy workflow. Trên Cloudflare Pages, nhập các giá trị đó vào biến môi trường build. Khi build trên máy để tải `out/` lên host, dùng `.env.local` hoặc môi trường của shell. Không commit `.env.local`. Chỉ định đúng Firebase project qua `--project` mỗi lần triển khai rules.

Rules chỉ cho uid chủ sở hữu đọc/tạo/cập nhật workspace; version phải tăng đúng1, timestamp phải từ server và fields cấp cao bị giới hạn. Từng phần tử ghi chú được kiểm phía client. Khi bổ sung quyền chia sẻ hoặc yêu cầu chống client độc hại, mở rộng schema/rules hoặc dùng backend kiểm từng bản ghi; không coi validator client là ranh giới bảo mật.

App đọc bản server, so phiên bản, dùng transaction nếu local có thay đổi rồi đánh dấu local sạch sau khi server xác nhận. Có xung đột thì giữ cả hai bản, xuất JSON hiện tại trước khi chọn tải bản cloud. App chỉ khởi tạo Firebase khi chọn provider `firebase` và đã nhập cấu hình web. Chưa kiểm OAuth/cloud trên tài khoản thật cho template này.
