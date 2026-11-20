# Auth

`useAuth` khôi phục phiên trước khi mount workspace và chỉ tải adapter của dịch vụ đã chọn. Firebase dùng Google popup với IndexedDB/local persistence. Supabase dùng Google OAuth với PKCE và quay về `appRoot` trên cùng origin. Phiên Supabase có khóa lưu trữ theo namespace app và host của dự án Supabase.

Chế độ lưu trên thiết bị và dịch vụ đám mây thiếu biến môi trường dùng workspace khách. Mỗi uid mở namespace riêng. Đăng nhập và đăng xuất giữ nguyên dữ liệu đã lưu trên thiết bị. Xem phạm vi kiểm thử trong [verification.md](../../../docs/verification.md).
