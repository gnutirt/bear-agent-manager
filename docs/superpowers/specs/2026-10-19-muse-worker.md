# Worker tầng 3 qua MCP: Muse (hỏi đáp / nghiên cứu web)

Nguồn: plan workforce-v2 Task 16 (đã duyệt, chủ repo chấp nhận rủi ro ở biên bản [3] ngày 2026-10-16: tự động hoá web UI của Meta có thể trái điều khoản của họ và vỡ khi Meta đổi giao diện). Tool dùng để HỎI ĐÁP / NGHIÊN CỨU, không giao việc có hành động thật.

- **Server MCP riêng `muse`** (`mcp/muse.ts`, khai báo trong `plugin.json`, chạy qua shim): `room` hỏng thì `muse` không chết theo. Hai tool: `muse_ask({prompt, timeout_s?=180})` → text; `muse_status()` → `{chrome, loggedIn, busy}`.
- **CDP, không npm dep:** `http://127.0.0.1:9222/json` (Chrome debug do chủ repo mở, profile riêng đã đăng nhập) + WebSocket gốc của Node. Chỉ nói chuyện với tab có HOST đúng `muse.ai` hoặc `*.muse.ai` (so host đã parse, không `includes`); KHÔNG đụng tab khác, không đọc cookie/storage; mọi script chạy là chuỗi cố định, prompt đi vào dưới dạng JSON string.
- **Quy trình `muse_ask`:** đếm item trước → gán textarea bằng native setter + `input` → đợi 300 ms → click Send → poll 1 s: xong khi không còn nút Stop, item cuối là assistant có "Copy response", text ổn định ≥ 2 s → gộp các item assistant sau item user đầu tiên có index ≥ số item trước khi gửi (`joinAnswer(items, fromIndex)`). Quá `timeout_s` → trả phần đã có + `[timeout]`.
- **Hàng đợi:** một `muse_ask` tại một lúc (trong process). Prompt tối đa 8000 ký tự.
- **Lỗi rõ:** Chrome chưa mở → "mở Chrome debug :9222"; tab muse.ai không có → "mở muse.ai trong Chrome debug"; URL đăng nhập (instagram/facebook login) → "chưa đăng nhập Muse".
- **Bảng worker:** mỗi lần hỏi ghi `start`/`end` vào `workers.jsonl` (`kind:'muse'`, `provider:'muse'`, `tier:'free'`, tóm tắt "muse_ask (N ký tự)", KHÔNG ghi prompt hay câu trả lời).
- **Mô tả tool cảnh báo agent:** kết quả là claim chưa kiểm chứng; không gửi secret/key/file đăng nhập/dữ liệu khách hàng (prompt rời máy sang Meta); không giao việc có hành động thật.
- **Ngoài phạm vi:** mở chat mới / side chat, giới hạn tốc độ gói free, UI tab Worker (frontend thêm `KIND.muse`).
- **Test:** hàm thuần (`isDone`, `joinAnswer`, `isMuseUrl`) + CDP giả: Chrome tắt, chưa đăng nhập, timeout trả phần đã có, hai lần hỏi chạy lần lượt, tab lạ không bị động tới.
