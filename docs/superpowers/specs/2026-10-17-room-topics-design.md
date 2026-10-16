# Topic con trong phòng (thiết kế)

Ngày 2026-10-17. Ý của chủ repo (giống forum topic của Telegram) để hệ thống chỉ giao cho mỗi agent phần ngữ cảnh cần thiết. Nghiên cứu: core-improve. Viết: Planner. Áp cho mọi phòng và mọi agent; không hard-code tên phòng, topic hay agent.

## Vì sao

Mỗi tin giao tới agent nằm lại context cả phiên và bị đọc lại ở mọi lượt sau. Sau khi tin không gọi tên chỉ còn giao một dòng (261bf4f) vẫn còn các vòng nhắn chéo giữa nhóm giao diện và nhóm hub: đo tối 2026-10-17, khoảng 40% số tin là chuyện giao diện mà chỉ frontend và người dùng cần đọc.

## Hành vi

- `Message.topic?: string`, thiếu nghĩa là `"chung"`. Tin trả lời (`replyTo`) lấy topic của tin gốc.
- Topic tạo khi có tin đầu tiên gửi vào (tên chữ thường, `[a-z0-9-]{1,32}`); không có bước tạo riêng, không xoá được ở giai đoạn đầu.
- Thành viên theo dõi một topic khi: topic là `chung`; hoặc thành viên đã gửi tin vào topic đó; hoặc bị @ trong topic đó; hoặc tự đăng ký theo dõi. Có thể bỏ theo dõi. Trưởng phòng luôn theo dõi tất cả.
- Tin ở topic KHÔNG theo dõi không giao; chỉ gộp thành một dòng cuối lượt giao: "3 tin mới ở #tên-topic". @ vẫn luôn giao đầy đủ và đánh thức (@ cũng tự cho theo dõi).
- Tin từ người dùng không gắn topic thì vào `chung` như hiện nay. Tin cũ không có topic coi như `chung`, không cần di trú dữ liệu.
- Biên bản (`room_note`) giữ theo phòng; note có thể gắn tag topic tuỳ chọn, chỉ giao cho người theo dõi topic đó (giai đoạn sau).

## Giao diện (ui/index.html)

Thanh chip topic phía trên khung chat (Tất cả · chung · …), ô soạn tin có chọn topic, số tin chưa đọc theo topic. Bấm chip thì lọc khung chat. Chuỗi dùng `t()` theo hạ tầng song ngữ.

## MCP

`room_send` và `room_read` nhận `topic` tuỳ chọn; thêm `room_topics` (liệt kê topic + người theo dõi, đăng ký/bỏ theo dõi). Agent quên chọn topic thì tin rơi vào `chung`, vẫn chạy được.

## Giai đoạn

1. Hub + MCP: `Message.topic`, lưu jsonl, subscription theo session (`Session.topics`), lọc ở `formatDelivery` và đường giao, `room_topics`, test với tên giả. (@coder)
2. Giao diện: chip, chọn topic khi soạn, chưa đọc theo topic. (@frontend, sau I2)
3. Note theo topic (có thể bỏ nếu không cần).

## Không làm / rủi ro

Không dịch hay di chuyển tin cũ; không bắt buộc topic. Rủi ro: agent không theo dõi bỏ lỡ thông tin quan trọng trong topic con, nên dòng tóm tắt cuối lượt giao luôn có và `room_read` đọc được mọi topic.
