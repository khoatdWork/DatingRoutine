# App shell

Tham chiếu WorkingTimeTracking: Next16 static export, một route ghép bốn màn hình, max480px, bottom nav, safe-area, Be Vietnam Pro. Brand ở config; global tokens ở globals.css. ThemeProvider + Sonner ở providers.tsx. Trang chủ dùng module ghi chú, Thành phần là gallery có thể bỏ.

StarterApp khôi phục phiên đăng nhập của dịch vụ đã chọn. WorkspaceApp dùng khóa local của không gian để mount lại khi chuyển giữa khách và tài khoản hoặc khi đổi tài khoản. Mỗi lần mount mở tab Trang chủ và khởi tạo lại màn hình Cài đặt, trình sửa ghi chú và hộp thoại xác nhận.

Không đưa trạng thái local/cloud thường trực lên header. Cập nhật PWA dẫn tới Cài đặt → Cài ứng dụng qua guard nháp. Kiểm chứng thực ở docs/verification.md.
