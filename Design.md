# Thiết kế Đi cùng nhau

Ứng dụng dành cho một cặp đôi lưu các chuyến đi, hình ảnh và chi phí. Giao diện là cuốn album nhỏ trên điện thoại, không phải dashboard desktop. Giữ khung 320–430px, tối đa 480px, bottom navigation, safe areas và font tự host của template.

## Token và bố cục

- Nền giấy xanh rất nhạt #F4F7FB, surface trắng #FFFFFF, chữ xanh mực #152B46, chữ phụ #53657B, primary #2257C7, đường biên #D8E1EC.
- Dark mode #111E30, surface #1A2A40, chữ #E6EDF7 và primary #8FB4FF.
- Be Vietnam Pro xuyên suốt; tiêu đề 24–26px, body 14px, input 16px. Khoảng trắng và kích thước chữ thể hiện cấp bậc, không dùng nhãn in hoa trang trí.
- Trang chủ: lời chào → postcard minh họa và nút tạo chuyến → thống kê → album gần đây. Căn trái nội dung, số liệu căn rõ ràng.
- Bốn tab Nhật ký / Chuyến đi / Chi phí / Cài đặt. Chi tiết chuyến có cover, thông tin, ghi chú, album và chi phí. Editor chia nhóm thông tin, ảnh và khoản chi.

```text
[Trái tim] Đi cùng nhau      [Máy ảnh]
           Cuốn nhật ký của hai đứa
Nhật ký của hai bạn
Đi cùng nhau
[Postcard núi + đường bay / Chuyến đi mới]
Chuyến đi | Điểm đến | Chi phí
Chuyến đi gần đây
[Ảnh cover / tên / địa điểm / ngày]
[Nhật ký] [Chuyến đi] [Chi phí] [Cài đặt]
```

Điểm nhấn duy nhất là postcard với đường bay và tấm ảnh núi. Phần còn lại giữ nền yên, không gradient trang trí hay hiệu ứng vào trang. Ảnh thật của người dùng là nội dung chính sau khi có chuyến đi. Trạng thái rỗng không dựng dữ liệu giả.

Review trước build: bố cục và type tuân thủ template; thay giấy ghi chú chung bằng postcard du lịch để đúng đối tượng. Không thêm bản đồ giả, marketing hero hoặc thống kê mẫu. Các số chỉ tính từ dữ liệu đã lưu. Chi phí ghi theo người trả, không suy diễn nợ hay chia đôi.

## Tương tác

Mọi thao tác xóa/gỡ ảnh/bỏ nháp/nhập backup/tải cloud/cập nhật có xác nhận. Dữ liệu được ghi local thành công trước toast. Đăng nhập remount workspace riêng theo dịch vụ/project/uid. Ảnh upload trực tuyến qua Supabase Edge Function đến Cloudinary; không đưa chi tiết hạ tầng vào luồng ghi nhật ký.

Focus rõ, nhãn form, Radix dialog trap, bàn phím mở/đóng album, reduced motion, vùng chạm 44px. Kiểm 320px, 390px và desktop max480. Header giữ thương hiệu; trạng thái cloud nằm trong Cài đặt.
