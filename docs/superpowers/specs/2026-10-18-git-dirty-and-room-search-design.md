# Git dirty theo agent và tìm trong phòng (thiết kế ngắn)

Ngày 2026-10-18. Đề xuất của frontend, planner duyệt. Áp cho mọi phòng, agent, repo; không hard-code tên.

## 1. Trạng thái working tree của từng agent

Vì sao: compact/kết thúc một agent khi nó còn file chưa commit đã làm coder mất việc dở (biên bản [10]). Giao diện cần biết agent nào sạch.

- `GET /api/sessions/:id/git` → `{ cwd, repo: bool, branch, dirty: number, files: string[] (tối đa 20, tên tương đối), checkedAt }`. Chạy `git -C <cwd> status --porcelain=v1 -b` bằng `execFile` (không shell), timeout 5 giây, cache 10 giây theo cwd; `cwd` lấy từ `Session.cwd` đã lưu, không nhận đường dẫn từ client; không phải repo git thì `repo: false`.
- Chỉ liệt kê tên file, không đọc nội dung. Nhiều agent chung một working tree thì cùng trả một kết quả: giao diện ghi rõ "thay đổi chưa commit trong thư mục này", không đổ cho từng người.
- Giao diện: nút Kết thúc/Compact trong menu Thành viên hiện số file dirty và bấm lần đầu chỉ cảnh báo khi dirty > 0 (vẫn cho làm tiếp, không khoá cứng).
- Hub: `terminate`/`compact` thêm tham số `force: boolean`; khi dirty > 0 và không có `force` thì trả 409 `{ dirty, files }` (UI hỏi xác nhận rồi gọi lại với `force`). Tin hệ thống "X được compact" nói thêm nếu lúc đó còn file dirty.

## 2. Tìm trong phòng và nhảy theo ngày

Vì sao: giao diện chỉ tải 300 tin gần nhất; phòng dài khó tìm lại thông tin.

- `GET /api/rooms/:r/messages?q=<chữ>&from=<id>&to=<id>&before=<id>&limit=<n>` mở rộng route đọc tin hiện có: lọc theo chữ (không phân biệt hoa thường, bỏ dấu tiếng Việt khi so khớp), theo khoảng id, phân trang ngược; `limit` tối đa 200; trả `{ messages, hasMore }`.
- `GET /api/rooms/:r/days` → `[{ day: 'YYYY-MM-DD' (múi giờ máy), count, firstId }]` đọc từ jsonl, cache theo kích thước/mtime file.
- Giao diện: ô tìm trong phòng (Ctrl+F nội bộ), danh sách ngày, bấm một kết quả hoặc một ngày thì tải quanh `firstId`/id đó và cuộn tới, nháy sáng tin. Chuỗi dùng `t()`.
- Dữ liệu tin dùng chung với topic và đính kèm: kết quả tìm gồm cả `topic`, `replyTo` và `attachments` khi các trường đó có.

## Giai đoạn

- G1 (hub, @core-improve sau V3 hoặc @coder khi về): hai API + `force`, test với repo git tạm và phòng giả.
- G2 (@frontend sau G1): cảnh báo dirty trong menu Thành viên, ô tìm và danh sách ngày.

## Rủi ro

`git status` trên repo lớn chậm: timeout + cache. Tìm chữ trên jsonl lớn: đọc ngược theo khối, dừng khi đủ `limit`.
