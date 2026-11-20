# Module ghi chú mẫu

Module có thể thay toàn bộ khi tạo app mới. core/domain.ts là schema1 gồm profile + notes (id, title, body, kind, completed, updatedAt UTC). Dữ liệu ban đầu trống. Tối đa500note, title120ký tự, body5000ký tự, backup1MB. Hiển thị ngày theo config timezone Việt Nam.

notes-view.tsx ghép danh sách/filter/search/editor. Editor giữ version lúc mở; khi tab khác sửa, save bị từ chối và giữ nháp. Xóa qua xác nhận. UI không báo thành công trước localStorage.setItem.

Sửa schema phải cập nhật validator, rules, unit và import/export migration. Không tăng schemaVersion mà bỏ qua việc đọc dữ liệu cũ.
