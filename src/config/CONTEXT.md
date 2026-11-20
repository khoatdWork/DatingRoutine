# DatingRoutine project configuration

project.config.json đã thiết lập Đi cùng nhau, namespace dating-routine-v1, Supabase và GitHub Pages bằng npm run setup. Đây là lựa chọn của người tạo dự án; không tự đổi hoặc chạy setup lại trong CI.

app.ts tập trung thương hiệu/locale/Asia/Ho_Chi_Minh. services.ts quyết định adapter. Credentials không thuộc project.config.json. NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY được đưa vào build GitHub Pages; mọi secret Cloudinary chỉ có trong Supabase Edge Function.

App nghiệp vụ hiện dùng Supabase trips. Các adapter Firebase/notes của template vẫn giữ làm tham chiếu. Đổi provider cho app trips cần triển khai adapter tương ứng, không chỉ đổi project config.
