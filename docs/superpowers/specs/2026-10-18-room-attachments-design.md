# Ảnh, file đính kèm và dữ liệu phòng gom một chỗ (thiết kế)

Ngày 2026-10-18. Yêu cầu của chủ repo (qua room): dán ảnh / tải file vào khung chat giống khi dùng Claude trong VS Code, nhưng thông minh hơn: toàn bộ dữ liệu một phòng nằm một chỗ; và phải biết dữ liệu của plugin nằm ở đâu. Áp cho mọi phòng, repo, tài khoản; không hard-code tên phòng hay agent.

## Hiện trạng (đo 2026-10-18)

Dữ liệu hub nằm ở thư mục nhà của người dùng: `C:\Users\<tên>\.bear-agent-manager` (hằng `HOME` trong shared/config.ts). Bên trong: `settings.json`, `providers.json`, `state.json` (phòng, thành viên, biên bản), `rooms/<phòng>.jsonl` (tin nhắn), `handoffs/`, `room_chat/` (transcript đã gom), `autojobs/`, `trash/` (phòng đã xoá), `worker-config/`, `workers.jsonl`, `hub.log`, `revive.log`, `token`. Sao lưu chat ra thư mục khác (ví dụ `X:\Coding\claude-mem`) do `settings.archive.dir`. Tin nhắn chỉ có chữ (giới hạn `MAX_TEXT`), thân request hub giới hạn 64 KB; chưa có đính kèm.

## Mục tiêu / không làm

Mục tiêu: (1) dán ảnh (Ctrl+V), kéo thả hoặc chọn file vào ô soạn tin; (2) agent đọc được ảnh/file đó; (3) mọi thứ của một phòng ở một thư mục duy nhất, thấy được từ giao diện; (4) giao diện chỉ rõ dữ liệu nằm ở đâu và nút mở thư mục.

Không làm: lưu trên mạng ngoài; tự quét nội dung file đính kèm gửi lên dịch vụ nào; xem trước định dạng lạ (chỉ ảnh có xem trước, file khác hiện tên + kích thước); chỉnh sửa ảnh.

## Quyết định (người viết tự quyết, chủ repo kiểm)

- Thư mục phòng: `HOME/rooms/<phòng>/` chứa `files/` (đính kèm). Giai đoạn A chỉ thêm `files/`, KHÔNG di chuyển `rooms/<phòng>.jsonl` hay `state.json`. Giai đoạn B (riêng, cần duyệt sau) mới gom nốt tin nhắn, biên bản, topic vào đúng thư mục phòng, theo kiểu sao chép rồi kiểm rồi mới xoá bản cũ, có thể hoàn tác.
- Đính kèm: `Message.attachments?: { id, name, mime, size, sha256 }[]`. File lưu ở `rooms/<phòng>/files/<sha256 8 ký tự>-<tên đã làm sạch>`; trùng nội dung (cùng sha256) chỉ lưu một bản. Tên làm sạch: bỏ đường dẫn, chỉ giữ `[\w.\- ]`, cắt 80 ký tự.
- Tải lên: `POST /api/rooms/:r/files` nhận thân thô (tên và mime qua header), giới hạn riêng (mặc định 25 MB mỗi file, 100 MB mỗi tin, cấu hình ở `settings.attachments.maxMB`), không dùng `MAX_BODY` 64 KB. Kiểm tra token như các route khác. Trả về mô tả đính kèm, rồi tin nhắn gửi kèm `attachments` (chỉ nhận id đã tải của chính phòng đó).
- Agent đọc bằng đường dẫn tuyệt đối: `formatDelivery` thêm dòng `📎 tên (mime, kích thước): <đường dẫn đầy đủ>` dưới tin; Claude Code mở được ảnh/PDF/văn bản bằng công cụ Read. Không chép nội dung file vào tin (tiết kiệm token, tin rút gọn vẫn giữ dòng 📎). MCP `room_send` nhận `attachments` là danh sách đường dẫn file trên máy để agent gửi file cho phòng (hub sao chép vào `files/`).
- Giao diện: dán ảnh vào ô soạn hiện thanh xem trước (thu nhỏ, nút ×), nút kẹp giấy, kéo thả; tin hiện ảnh thu nhỏ bấm để phóng to, file khác hiện thẻ tên + kích thước + nút tải/mở. Chuỗi dùng `t()` (vi/en).
- Bảo mật: chỉ phục vụ file qua `GET /api/rooms/:r/files/:id` có token; không bao giờ cho đường dẫn tuỳ ý; `Content-Disposition: attachment` trừ ảnh; chặn `..`. Tên file và mime là dữ liệu không tin cậy, luôn `esc()` khi vẽ ra HTML.
- Dọn dẹp: xoá phòng chuyển luôn `rooms/<phòng>/` vào `trash/` cùng lịch sử. Sao lưu chat (archive) chép cả `files/` của phòng, không xoá gì.
- "Dữ liệu nằm ở đâu": tab con Dữ liệu & sao lưu thêm dòng đường dẫn đầy đủ của `HOME`, dung lượng từng thư mục con (rooms, room_chat, handoffs, trash), và nút "Mở thư mục" (hub chạy `explorer` / `open` / `xdg-open`, không shell).

## Giai đoạn

- A1 (@coder): `Message.attachments`, upload/download API, lưu file, `formatDelivery` dòng 📎, MCP `room_send attachments`, giới hạn, test với tên giả, chuyển cả thư mục vào trash khi xoá phòng, archive chép `files/`. Một commit, cần restart hub.
- A2 (@frontend, sau A1): dán/kéo/chọn file, xem trước, hiển thị trong tin, `t()`, test, chụp màn hình hai ngôn ngữ.
- A3 (@coder, sau A1): API + dòng "Dữ liệu nằm ở đâu" và nút mở thư mục (UI do @frontend).
- B (chưa duyệt): gom tin nhắn, biên bản, topic vào thư mục phòng.

## Rủi ro

Ảnh lớn làm tin giao chậm: chỉ giao đường dẫn, không giao nội dung. Hub chạy trên máy cá nhân nên mặc định chỉ lắng nghe 127.0.0.1 (giữ nguyên). Di chuyển dữ liệu (giai đoạn B) là chỗ dễ mất tin, vì vậy tách riêng và yêu cầu duyệt.
