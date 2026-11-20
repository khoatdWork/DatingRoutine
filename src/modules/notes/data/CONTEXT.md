# Data & sync

repository.ts đọc và ghi Envelope {localVersion, cloudVersion, dirty, snapshot}. Khách giữ khóa hiện có theo appConfig.storageKey. Khóa tài khoản dùng workspace-v2 với dịch vụ, định danh dự án và UID. Định danh Firebase là project ID. Định danh Supabase là origin và đường dẫn của URL API, bỏ thông tin xác thực, query và fragment. Khóa Firebase cũ chỉ có UID nên app giữ nguyên bản đó trong localStorage để tránh gán nhầm sang dự án khác. Có thể xuất JSON từ bản app cũ rồi nhập có xác nhận trong đúng tài khoản ở bản mới.

Khi dữ liệu local bị hỏng, UI báo lỗi và cho xuất bản gốc. Kiểm version trước khi ghi để tránh ghi từ cửa sổ cũ. localStorage thiếu transaction liên tab nguyên tử.

Chế độ lưu trên thiết bị và không gian khách lưu local. Đồng bộ từ tài khoản dùng adapter của dịch vụ đã chọn và bắt đầu khi người dùng bấm nút. sync-policy cho tải khi local sạch, cho gửi khi local đã sửa và phiên bản cloud khớp, báo xung đột khi hai bên có thay đổi riêng. Tải cloud thay dữ liệu có xác nhận. Chỉ đánh dấu local đã đồng bộ khi server xác nhận và ghi local thành công. Khi tab khác sửa local trong lúc chờ server, giữ thay đổi đó và báo lỗi.

Đổi owner remount hook. Import/reset giữ cloudVersion để lần sync tiếp theo vẫn kiểm cạnh tranh. Raw damaged backup có thể xuất từ UI để khôi phục thủ công.

cloud.ts lazy-load adapter đã chọn. Firebase dùng getDocFromServer và transaction, không có persistent offline queue. Supabase đọc theo owner_id dưới RLS, chỉ ghi qua RPC write_note_workspace với expected version; server kiểm owner, schema và xung đột nguyên tử. SQL migration và tests/database/supabase.test.ts kiểm quyền trên PostgreSQL/PGlite, chưa tương đương nghiệm thu toàn bộ Supabase Auth/PostgREST thật.
