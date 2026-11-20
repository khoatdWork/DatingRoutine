# Nhật ký chuyến đi

`core/domain.ts` định nghĩa bản lưu phiên bản 1 gồm hồ sơ và tối đa 300 chuyến đi. Mỗi chuyến có ngày đi, ngày về, cảm xúc, ghi chú, tối đa 30 ảnh và 200 khoản chi. Chi tiêu tính bằng đồng Việt Nam nguyên không âm. Tổng chi phí mỗi chuyến nằm trong giới hạn số nguyên an toàn của JavaScript. Bản sao lưu JSON tối đa 2 MB theo UTF-8 và chỉ lưu metadata ảnh Cloudinary. Khi thay schema cần cập nhật validator, migration, bộ đọc bản cũ và kiểm thử.

`data/repository.ts` lưu riêng khách và từng tổ hợp dịch vụ, dự án, UID. Khóa có hậu tố không gian `:trips-v1:`. Envelope gồm phiên bản local, phiên bản cloud, cờ dirty và snapshot. Cửa sổ đang sửa phải gửi phiên bản đã mở và localStorage phải ghi thành công trước khi báo đã lưu. Kiểm tra phiên bản phát hiện bản sửa cũ, còn localStorage không hỗ trợ giao dịch nguyên tử giữa các cửa sổ. Dữ liệu hỏng ngăn ghi và có thể xuất nguyên văn để phục hồi.

`data/use-workspace.ts` chỉ đồng bộ khi được gọi. Khách lưu trên thiết bị. Tài khoản Supabase tải bản cloud khi local sạch, gửi bản local đã sửa nếu phiên bản cloud khớp và báo xung đột nếu hai bên có thay đổi riêng. Tải bản cloud để thay bản local yêu cầu xác nhận cùng phiên bản local mà người dùng đã xem. Hook chỉ báo đã đồng bộ sau khi Supabase phản hồi và bản local cập nhật thành công.

Nếu tab khác ghi dữ liệu hỏng, hook báo lỗi và giữ bản đọc hợp lệ gần nhất để trình sửa giữ nguyên bản nháp. Thao tác lưu vẫn đọc lại localStorage và từ chối ghi đè dữ liệu hỏng. Nếu lỗi xuất hiện ngay lần mở đầu tiên, hook chưa có bản đọc hợp lệ để hiển thị.

Migration `20261121000000_trip_workspaces.sql` cho phép tài khoản sở hữu đọc hàng của mình bằng RLS. RPC `write_trip_workspace` xác minh chủ sở hữu, schema, kích thước và phiên bản trước khi ghi nguyên tử. Unit và PGlite chạy cục bộ đạt 10/10 kiểm thử cho schema, lưu local, quyền đọc/ghi và cạnh tranh phiên bản. Các kiểm thử này dùng PostgreSQL cục bộ, chưa kiểm OAuth, PostgREST hoặc dữ liệu trên Supabase thật.
