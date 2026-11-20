# App shell

Next App Router route chỉ render StarterApp (tên giữ từ template). StarterApp khôi phục Auth rồi mount JourneyWorkspace theo storageKey riêng của guest hoặc Supabase project/uid. Navigation Nhật ký / Chuyến đi / Chi phí / Cài đặt. Business domain và lưu trữ nằm trong modules/trips.

Shell giữ local version lúc mở editor và xác nhận destructive action. Guard nháp khi đổi tab, quay lại, tạo/sửa chuyến khác và cập nhật app; beforeunload khi có thay đổi. Các thao tác nhập/xóa/tải cloud chụp expected version và kiểm lại lúc commit. Không toast save trước repository thành công. Chuyển account remount toàn bộ trạng thái màn hình.

Be Vietnam Pro, khung max480px, bottom navigation và safe area. Supabase chưa cấu hình cho phép guest local; ảnh yêu cầu auth + Edge Function. Không tự chuyển guest sang account, không auto sync. Kết quả thực ở docs/verification.md.

## Bảo vệ nháp khi trạng thái bên ngoài đổi

StarterApp giữ owner hiện tại nếu có nháp khi phiên đổi từ tab khác; hiển thị thông báo và tắt upload cho phiên không khớp. Lưu hoặc xác nhận bỏ nháp xong mới remount owner mới. Bản nháp không tự chuyển sang tài khoản khác. Hook giữ snapshot đọc được gần nhất khi tab khác ghi dữ liệu hỏng, vẫn báo lỗi và chặn ghi.
