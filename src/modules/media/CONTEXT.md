# Ảnh chuyến đi

`uploadTripPhoto(file, signal?)` xác minh kiểu và dung lượng ảnh ở trình duyệt, sau đó chuyển ảnh cùng token phiên Supabase sang Edge Function. `cloudinaryConfigured` biểu thị Supabase đã cấu hình trên client. Edge Function xác minh người dùng, kiểm lại dữ liệu rồi ký lệnh upload Cloudinary. Kết quả là metadata có thể lưu trong chuyến đi.

Chi tiết triển khai, quyền truy cập qua URL và vòng đời ảnh có trong [Cloudinary](../../../docs/cloudinary.md). Kiểm thử unit dùng các response giả lập. Bản triển khai Supabase và Cloudinary cần cấu hình môi trường riêng.
