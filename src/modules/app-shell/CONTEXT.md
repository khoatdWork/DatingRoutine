# App shell

Tham chiếu WorkingTimeTracking: Next16 static export, một route ghép bốn màn hình, max480px, bottom nav, safe-area, Be Vietnam Pro. Brand ở config; global tokens ở globals.css. ThemeProvider + Sonner ở providers.tsx. Trang chủ dùng module ghi chú, Thành phần là gallery có thể bỏ.

StarterApp khôi phục Firebase Auth rồi mount workspace có key uid/guest để state và editor không rò sang tài khoản khác. WorkspaceApp giữ tab/settings section/editor, guard nháp, confirmation dialogs và focus heading khi đổi màn. View navigation chưa ghi URL; reload quay về Trang chủ.

Không đưa trạng thái local/cloud thường trực lên header. Cập nhật PWA dẫn tới Cài đặt → Cài ứng dụng qua guard nháp. Kiểm chứng thực ở docs/verification.md.
