# Tasklist của phòng (thiết kế ngắn)

Ngày 2026-10-18. Yêu cầu của chủ repo: trưởng phòng quét tin của chủ repo, lập tasklist (căn cứ todo), giao frontend bổ sung giao diện; vừa ghi nhớ việc vừa tiết kiệm context; chỉ gọi agent theo từng việc. Áp cho mọi phòng, không hard-code tên.

## Mục tiêu / không làm

Mục tiêu: (1) mọi yêu cầu của chủ repo thành task có chủ, trạng thái, liên kết tin gốc; (2) agent chỉ nhận đúng task của mình (không phải đọc cả chat); (3) chủ repo nhìn một bảng thấy việc nào xong, đang làm, kẹt.
Không làm: tự bỏ task chưa xong; thay thế todoplan.md/todobug.md (nhập được một chiều, xem dưới); chạy việc không qua lead.

## Dữ liệu

`Room.tasks: { id, title, detail?, doneWhen? (tiêu chí xong), fromMsg?: number, owner?: tên agent, status: 'todo'|'doing'|'blocked'|'done', createdAt, updatedAt, doneAt?, commit?, note? }[]`, lưu trong state, giữ 500 task mới nhất, task done quá 30 ngày thì gom vào `tasks-archive.jsonl`. Id tăng dần theo phòng.

## Hub

- `GET /api/rooms/:r/tasks?status=&owner=`; `POST /api/rooms/:r/tasks {title, detail?, fromMsg?, owner?}`; `POST /api/rooms/:r/tasks/:id {status?, owner?, title?, note?, commit?}`; `POST /api/rooms/:r/tasks/:id/delete`.
- MCP `room_tasks`: `list`, `add`, `update`, `next` (nhận việc kế tiếp được giao cho mình). Chỉ trưởng phòng được `add` và đổi `owner`; agent khác chỉ đổi status/note/commit của task của mình.
- Giao việc theo từng task: khi lead đặt `owner`, hub gửi cho agent đó MỘT tin ngắn `Task #n: <title> (+detail) · tin gốc #m`, không kèm phần chat khác; agent đọc thêm bằng `room_read` nếu cần. Agent xong → `update done + commit`, hub báo lead một dòng.
- Trưởng phòng quét: khi chủ repo gửi tin, `leadPrompt` dặn lead tách yêu cầu thành task (mỗi task một việc, ≤1 câu title) rồi `room_tasks add`; chủ repo xem và sửa được ở UI. Chỉ lead được tự thêm; không tạo task cho tin chỉ hỏi đáp.
- Nhập từ todo: `POST /api/rooms/:r/tasks/import {file: 'todoplan.md'|'todobug.md'}` chỉ đọc file trong cwd của lead, mỗi dòng `- [ ]` thành task (bỏ dòng đã `[x]`, không nhập trùng title); một chiều.
- Compact/Kết thúc agent: UI và truong-phong chỉ làm khi task của agent đó đã `done` có `commit` (cảnh báo nếu còn task `doing`).
- Tiết kiệm context: `formatDelivery` không gửi lại tin cũ của task; lead giữ biên bản bằng task thay vì dán lại chat dài; `compact`/clear-lead đưa danh sách task đang mở (title + owner + status) vào hồ sơ bàn giao.

## Giao diện (frontend)

Panel/tab "Việc" của phòng: cột Cần làm · Đang làm · Kẹt · Xong, thẻ có owner (nhãn màu agent), liên kết nhảy tới tin gốc, nút nhận/đổi owner/xong cho chủ repo, thêm tay một task, lọc theo agent, đếm trên sidebar. Chuỗi qua `t()` vi/en.

## Giai đoạn

- K1 (@coder): dữ liệu + API + `room_tasks` MCP + test + import todo + hồ sơ bàn giao.
- K2 (@core-improve): `leadPrompt` tách yêu cầu thành task, giao theo từng task qua tin ngắn, báo lead khi xong.
- K3 (@frontend, sau K1): panel "Việc", đo thật hai ngôn ngữ.

## Rủi ro

Lead tách sai làm task nhiễu: chủ repo sửa/xoá được và lead không tạo task cho tin hỏi đáp. Hai lead cùng phòng: chỉ `Room.lead` đang online được `add`.
