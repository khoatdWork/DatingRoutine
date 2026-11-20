# Data & sync

repository.ts đọc/ghi Envelope {localVersion, cloudVersion, dirty, snapshot}; namespace config.storageKey + workspace + uid/guest. Local corruption báo lỗi, không reset; UI có xuất dữ liệu gốc. Kiểm version trước write chống cửa sổ cũ; localStorage không cung cấp transaction liên tab nguyên tử, nên cần IndexedDB transaction nếu ứng dụng sau có ghi đồng thời cường độ cao.

Cloud là adapter tùy chọn, lazy import, getDocFromServer và runTransaction. Không Firestore persistent offline queue. sync-policy là hàm thuần: clean→pull; dirty+matching remote→push; divergent→conflict. Sync chỉ người dùng bấm. Không nhận guest tự động. Không tự merge. Tải cloud thay dữ liệu có xác nhận. Local chưa đánh dấu sạch cho đến khi server xác nhận; nếu tab khác thay local trong khi chờ server thì giữ thay đổi đó và báo lỗi thay vì ghi đè.

Đổi owner remount hook. Import/reset giữ cloudVersion để lần sync tiếp theo vẫn kiểm cạnh tranh. Raw damaged backup có thể xuất từ UI để khôi phục thủ công.
