# Cấu hình dự án

`project.config.json` ở root chứa lựa chọn bắt buộc cho người tạo dự án: tên app, namespace riêng, dataProvider và hostingProvider. Bản template giữ các trường null; `npm run setup` yêu cầu chọn rõ, không suy đoán từ biến môi trường. Lệnh dev/build/start và Next config chặn dự án chưa thiết lập. Chạy setup lại phải xác nhận; namespace giữ nguyên trừ khi đổi rõ bằng `--storage-key`.

`app.ts` lấy tên/namespace từ cấu hình đã chọn; tiếp tục là nơi tập trung thương hiệu, locale và múi giờ. `services.ts` cung cấp lựa chọn cho auth/data/UI; dữ liệu và hosting độc lập. Fallback local chỉ để domain unit chạy được trên template chưa thiết lập, không bỏ qua guard của Next.

Muốn thêm dịch vụ dữ liệu: thêm lựa chọn/validator CLI và kiểu config, auth adapter, cloud adapter, namespace nhận diện project, quyền server và kiểm thử; cập nhật hướng dẫn. Muốn thêm host tĩnh: thêm lựa chọn/kiểu, hướng dẫn hoặc cấu hình triển khai. Không đưa credentials vào project.config.json; các public client env được điền trước build.
