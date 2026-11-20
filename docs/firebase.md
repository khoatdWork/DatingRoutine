# Firebase tùy chọn

1. Tạo Firebase project riêng và thêm Web App.
2. Bật Authentication → Google. Thêm localhost và domain host vào Authorized domains; Firebase Auth popup cần mạng và trình duyệt cho phép mở cửa sổ.
3. Tạo Firestore, chọn location phù hợp. Schema: `users/{uid}/workspaces/default` chứa `{ version, snapshot: { schemaVersion, profile, notes }, updatedAt }`.
4. Sao chép cấu hình Web App vào `.env.local` theo `.env.example`. Đây là Firebase Web config phía client; không đưa service-account/private key vào `NEXT_PUBLIC_*`.
5. Cài Java21+ để kiểm rules, chạy `npm run test:db`. Khi sẵn sàng deploy rules, dùng `npx firebase-tools login` rồi `npx firebase-tools deploy --only firestore:rules --project YOUR_PROJECT_ID`.
6. Build lại. Vào Cài đặt → Tài khoản & đồng bộ → Đăng nhập với Google.

GitHub Pages: thêm các giá trị `NEXT_PUBLIC_FIREBASE_*` vào repository **Variables** có cùng tên, rồi chạy workflow Pages. Không commit `.env.local`. Template không chứa `.firebaserc` để tránh trỏ nhầm project thật.

Rules chỉ cho uid chủ sở hữu đọc/tạo/cập nhật workspace; version phải tăng đúng1, timestamp phải từ server và fields cấp cao bị giới hạn. Từng phần tử ghi chú được kiểm phía client. Khi bổ sung quyền chia sẻ hoặc yêu cầu chống client độc hại, mở rộng schema/rules hoặc dùng backend kiểm từng bản ghi; không coi validator client là ranh giới bảo mật.

Luồng đồng bộ: server read → so phiên bản → transaction (nếu có local dirty) → xác nhận server → đánh dấu local sạch. Có xung đột thì giữ cả hai bản, xuất JSON hiện tại trước khi chọn tải bản cloud. Không gọi Firebase khi app chưa được cấu hình. Chưa kiểm OAuth/cloud trên tài khoản thật cho template này.
