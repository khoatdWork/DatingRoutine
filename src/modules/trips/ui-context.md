# Màn hình nhật ký chuyến đi

- `trip-views.tsx` ghép Trang chủ, Chuyến đi và Chi phí. Tìm theo tên, địa điểm và ghi chú, lọc theo năm của ngày đi. Tổng chi phí dùng VND và cộng bằng BigInt khi tổng hợp nhiều chuyến đi.
- `trip-editor.tsx` giữ bản nháp trong màn hình và báo thay đổi cho app shell. Kiểm tra khoảng ngày, khoản chi và schema trước khi gọi lưu. Hộp thoại xác nhận việc bỏ ảnh hoặc khoản chi khỏi bản ghi.
- Chỉ mở trình chọn ảnh khi có cấu hình Supabase và người dùng có phiên đăng nhập. Màn hình chờ Cloudinary xác nhận từng ảnh trước khi thêm vào nháp và giữ những ảnh đã tải thành công khi một ảnh khác lỗi.
- `trip-detail.tsx` mở ảnh qua Radix Dialog, hỗ trợ phím trái/phải và chuyển tiêu điểm về ảnh đã chọn khi đóng.
- ESLint đã chạy qua bốn tệp giao diện. Kết quả kiểm tra toàn app và trình duyệt nằm trong `docs/verification.md`.
