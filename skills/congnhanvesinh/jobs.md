# congnhanvesinh job prompts

Copy one block into the task file, fill the `<…>` slots. Every block fixes the output shape: the worker
answers in exactly that shape, nothing else.

## handoff — dossier for an oversized chat

```
Đọc file <chat.txt> (bản rút gọn của một phiên chat Claude Code; dòng USER/CLAUDE, [tool …] là lệnh đã chạy).
Viết HỒ SƠ BÀN GIAO để một phiên Claude mới làm tiếp mà không cần đọc lại cuộc chat. Trả về đúng các mục sau, tiếng Việt, tối đa 60 dòng:
# Hồ sơ: <tiêu đề chat>
## Mục tiêu — 1-3 dòng: người dùng muốn đạt gì.
## Đã xong — gạch đầu dòng, mỗi dòng một kết quả, kèm file/commit nếu có.
## Quyết định đã chốt — gạch đầu dòng: quyết định + lý do ngắn.
## Đang dở — việc đang làm, bước kế tiếp cụ thể.
## File quan trọng — đường dẫn: vai trò (tối đa 15 dòng).
## Lưu ý/cạm bẫy — lỗi đã gặp, điều không được làm.
Không chép code dài, không kể lại diễn biến theo thời gian.
```

## notes — clean up room notes (biên bản)

```
Đây là biên bản của phòng <room> (JSON: id, text, by): <dán JSON>.
Trả về đúng một khối JSON: {"keep":[id…],"merge":[{"ids":[id…],"text":"câu gộp"}],"drop":[{"id":id,"why":"…"}]}.
Gộp các mục trùng/chồng ý, bỏ mục đã lỗi thời hoặc bị mục mới hơn thay thế. Không thêm thông tin mới.
```

## digest — shrink a long room message before an expensive agent reads it

```
Tóm tắt tin nhắn sau cho một agent đang bận, tối đa <N> dòng, giữ nguyên: số liệu, đường dẫn file, tên hàm, quyết định, câu hỏi cần trả lời. Bỏ lời dẫn và giải thích. Chỉ trả về bản tóm tắt.
---
<tin nhắn>
```

## repo-survey — read-only cleanup survey (phase 1)

```
Khảo sát repo <dir> để dọn dẹp. CHỈ ĐỌC, không sửa/xóa gì. Tìm: file rác/tạm/log/backup, file trùng, code chết (không ai gọi), thư mục rỗng, file lớn bất thường, phụ thuộc không dùng.
Trả về bảng Markdown, tối đa 40 dòng: | # | đường dẫn | loại | bằng chứng (file:line hoặc lệnh đã chạy) | đề xuất (xóa/gộp/giữ) | rủi ro (thấp/vừa/cao) |
Bỏ qua: .git, node_modules, <thư mục cấm>.
```

## repo-apply — apply approved items only (phase 2)

```
Trong repo <dir>, CHỈ thực hiện đúng các mục đã duyệt dưới đây, không làm gì khác, không commit:
<danh sách mục đã duyệt từ bảng khảo sát>
Sau đó trả về: mỗi mục một dòng "đã làm/không làm được + lý do", rồi kết quả `git status --short`.
```
