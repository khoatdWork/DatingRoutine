# Thiết kế template

Tham chiếu trực tiếp WorkingTimeTracking: app cá nhân ưu tiên mobile, không gian tập trung vào một hành động mỗi màn hình.

- Màu sáng: nền #F4F7FB; surface #FFFFFF; chữ #152B46; phụ #53657B; primary #2257C7; border #D8E1EC. Success #087561 và warning #965100 luôn có nhãn chữ.
- Màu tối: nền #111E30; surface #1A2A40; chữ #E6EDF7; phụ #A9BBD1; primary #8FB4FF; border #344860. Chọn theme qua next-themes, lưu riêng từng app.
- Be Vietnam Pro tự host; body 14px, tiêu đề 26px, nội dung phụ 11–12px. Trường nhập 16px để tránh iOS tự zoom.
- Một cột max480px; Trang chủ / Ghi chú / Thành phần / Cài đặt ở thanh dưới. Header chỉ thương hiệu; trạng thái lưu/cloud ở Tài khoản & đồng bộ.
- Control radius10px, nhóm17px, vùng nội dung chính24px. Vùng chạm>=44px. Không shadow từng hàng.
- Trang chủ dùng trang giấy/ý tưởng làm điểm nhấn thay đồng hồ chấm công. Tổng quan là hai hàng số, không dàn thẻ bằng nhau.
- Cài đặt nhóm dạng iPhone, mỗi hàng mở một mục. Không nhồi mọi form lên cùng màn.
- Focus rõ, skip link, Radix focus trap, reduced motion, nội dung có khoảng tránh bottom nav. Kiểm ở320px và390px.

```
Starter.                         Web & Mobile
Ngày hiện tại
Không gian của bạn.
[Trang giấy + tạo ghi chú]
Tổng quan        ghi chú / hoàn tất
Gần đây          danh sách / trạng thái rỗng
Khám phá thành phần
[Trang chủ] [Ghi chú] [Thành phần] [Cài đặt]
```

Review trước build: giữ bảng màu, font, khung và kiểu Cài đặt app gốc theo yêu cầu. Chỉ đổi nội dung đặc thù chấm công thành ví dụ CRUD tối thiểu có thể bỏ cả module. Không thêm dashboard desktop hay marketing hero. CSS chứa toàn bộ token để đổi thương hiệu dễ dàng.
