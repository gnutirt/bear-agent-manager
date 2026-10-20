# Luồng công việc chạy nhịp nhàng (lead nghiên cứu, 21/10)

Dựa trên những gì đã xảy ra từ 20/10 đến 21/10 trong #bear-agent-manager. Chỉ là đề xuất, chưa sửa code.

## Chỗ nghẽn đã thấy

| # | Chuyện đã xảy ra | Cái giá |
|---|---|---|
| 1 | 5 lần commit cuốn hoặc revert code của người khác: 4443830, 5024490, a79089e, lần đầu của new-planner, HEAD hỏng cú pháp (#101). Nguyên nhân chung: một cây làm việc với một index dùng chung, `GIT_INDEX_FILE` mất khi sang lệnh Bash mới, index tạm dựng từ HEAD cũ. | 6 task sửa chữa (#91, #101, #103, #108, #115…), lead phải audit lại |
| 2 | Chỉ lead tạo được task, nên planner giao bằng @ còn lead tạo task lại: mỗi việc bị đánh thức hai lần. | Tốn lượt, chậm |
| 3 | deepseek không có Bash, nên mọi commit của nó phải chờ một thành viên khác. | deepseek ngồi chờ |
| 4 | Agent post "Đã nhận", "chờ việc", "không có việc" khi không ai hỏi. `@all` đánh thức 12–14 agent. | Hạn mức Claude |
| 5 | Tab IDE hết hạn mức thì "điếc", phải chờ user gõ phím. Chat lead hoặc thành viên phình tới 200–260k token. | Mất nhịp, mỗi lượt đọc lại cả chat |

## Đề xuất (theo thứ tự lợi ích / công sức)

1. **Một đường commit duy nhất: công cụ MCP `room_commit {paths, message}`.** Hub làm đúng một chuỗi trên chính repo của agent: `read-tree HEAD`, add các path đó, chạy test liên quan (tuỳ chọn), commit, rồi kiểm mọi dòng "-" có nằm trong path của mình không. Có dòng lạ thì huỷ và báo lỗi. Code dùng lại `commitPaths` của #98. Không agent nào còn gõ `git commit` tay. deepseek cũng commit được mà không cần Bash, vì hub chỉ commit đúng path nó đã Edit trong cwd. Giải quyết nghẽn 1 và 3.
2. **Vai planner được tạo task** (`room_tasks add` cho `new-planner`, bên cạnh lead). Planner giao trực tiếp bằng task, không @ thêm lần nữa. Khi task xong, hub vẫn gọi lead audit (Q2 của #74). Giải quyết nghẽn 2, khớp note [57].
3. **Lọc tin không cần thiết:** hub giữ lại (không giao, không đánh thức) tin không có @ và ngắn hơn khoảng 80 ký tự kiểu xác nhận, chỉ hiện trong UI. `@all` từ agent thì chỉ được dùng khi có cờ xác nhận. Giải quyết nghẽn 4.
4. **Nhịp audit cố định:** lead audit theo lô, khi có 2–3 việc xong hoặc 20 phút một lần, không audit từng việc ngay lập tức. Mỗi lô chạy test trên một bản checkout sạch (note [51]). Một restart hub cho cả lô.
5. **Song song không đụng nhau:** mỗi agent code giữ một vùng file trong suốt task (task ghi `files:`). Hub cảnh báo khi hai task đang làm cùng đụng một file. Về lâu dài: git worktree riêng cho Copilot và deepseek, lead merge.
6. **Chat gọn:** compact theo #79 khi xong task. Nếu chat lead vượt 200k thì hub nhắc user gõ /compact (đã có). Chuyển phần đọc nặng sang worker (note route-heavy-reads). Phần cơ chế compact để core-improve làm tiếp ở #113(b).

## Đề nghị thứ tự làm

(1) `room_commit`, giao Copilot vì nó cần Bash để test thật. Tiếp theo (2) và (3), giao deepseek vì là sửa code hub nhỏ, Copilot commit. (4) và (5) là quy tắc, lead ghi note ngay.
