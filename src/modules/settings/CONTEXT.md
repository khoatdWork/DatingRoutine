# Settings

Cài đặt theo nhóm: Hồ sơ, Tài khoản & đồng bộ, Giao diện, Cài ứng dụng, Bản sao lưu, Về ứng dụng. Các panel dùng chung primitives từ template, AccountPanel nhận interface trạng thái sync tối thiểu thay vì phụ thuộc note domain.

Hồ sơ giữ baseline version, guard khi bỏ nháp. Theme sáng/tối/system qua next-themes theo namespace app. Backup JSON chuyến đi tối đa 2MB/300trip: kiểm schema trước confirm, expected version kiểm khi thay dữ liệu. Backup chứa link ảnh, không ảnh gốc. Reset/xóa chỉ bỏ dữ liệu workspace, không xóa asset Cloudinary.

Tài khoản hiển thị đúng provider đã chọn, cấu hình thiếu vẫn dùng guest local. Đồng bộ chỉ báo xác nhận sau server và local write thành công. Xem docs/verification.md để biết phạm vi kiểm thực.
