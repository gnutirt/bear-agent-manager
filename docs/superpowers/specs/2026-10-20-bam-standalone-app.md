# Nghiên cứu: BAM là ứng dụng độc lập, giống VS Code / Antigravity

Người viết: core-improve, 20/10, user giao trực tiếp (DM). Chỉ nghiên cứu. truong-phong duyệt, chia task.

Quyết định của user cùng tin (đã chốt):
- Muse hoãn (có thể bỏ).
- Local AI tạm tắt, để pending.
- Copilot dùng 1 tài khoản.
- Antigravity và VS Code mỗi lúc chỉ mở 1 cái.

## BAM đã có gì của một IDE

- Mở folder an toàn (#35 resolveWorkspace, #36 chọn folder trong browser).
- Tạo agent không cần editor (`hub/agents.ts`).
- Chat phòng + chat riêng (#38), xem git (`GET /api/sessions/:id/git`).
- Hub tự chạy khi đăng nhập Windows (`hub/autostart.ts`).
- Panel VS Code chỉ là khung bọc trang hub.

## Thiếu gì so với VS Code / Antigravity

| Mảnh | Hiện trạng | Lựa chọn tốt nhất (ít code, ít phụ thuộc) |
|---|---|---|
| **Cửa sổ app riêng** | Trang web trong browser | Chrome/Edge **app mode** (`msedge --app=http://127.0.0.1:7788`): shortcut Start Menu + Desktop, có icon riêng, không thanh địa chỉ. Thêm `manifest.webmanifest` để "Install app" (PWA). **Không** dùng Electron/Tauri: +100 MB hoặc cần Rust, mà không thêm gì cần thiết. |
| **Chat trực tiếp, thấy realtime** | Agent nền chỉ trả lời qua room_send; mỗi tin là 1 lượt `--resume -p` | `claude -p --input-format stream-json --output-format stream-json --include-partial-messages`: **1 tiến trình sống lâu**, BAM gửi tin qua stdin, nhận chữ/tool call từng phần qua stdout. Đây đúng là cách extension VS Code chạy Claude. Đã xác minh flag có trong `claude --help` bản hiện tại. ⇒ Với chat do BAM mở, **có realtime thật** (rào cản realtime chỉ còn với tab editor). |
| **Hỏi quyền ngay trong BAM** | Agent nền không hỏi được, phải chọn trước bypass/read-only | `--permission-prompt-tool` trỏ vào 1 tool MCP của hub (room server sẵn có). Claude cần quyền thì hub hiện nút Cho phép/Từ chối trong UI, chờ user bấm. |
| **Xem/sửa file** | Không có | Giai đoạn 1: cây thư mục + xem file + diff (chỉ đọc, API đọc file đã có `readSessionFile`). Giai đoạn 2: editor Monaco, đóng gói vào `ui/vendor` (không CDN, chạy offline). |
| **Terminal** | Không có | Hoãn. `node-pty` là native module, cần build tools trên Windows. Agent đã chạy lệnh được, user dùng terminal của hệ điều hành. |
| **Git** | Chỉ xem trạng thái | Xem diff từng file + nút commit đúng file (dùng lại `safe-commit.mjs`). |
| **Đăng nhập** | Tay trong editor/CLI | Vẫn tay (OAuth). Setup (#61) chỉ kiểm tra và nhắc. |

## Rào cản kỹ thuật (báo user)

1. Tab editor vẫn không nhận realtime. Chat **mở trong BAM** thì có realtime.
2. Một chat chỉ sống ở 1 nơi một lúc: BAM **hoặc** editor. BAM đang giữ phiên stream thì nút "Mở trong VS Code" phải đóng phiên trước (dùng `--resume` id nên không mất gì).
3. Editor Monaco trong BAM chỉ là trình sửa file: không có extension, IntelliSense đầy đủ hay debugger như VS Code.

## Task đề xuất

1. **S1:** cửa sổ app: `manifest.webmanifest` + icon + `scripts/setup.mjs` (#61) tạo shortcut app mode Edge/Chrome. Test: manifest hợp lệ, shortcut trỏ đúng URL.
2. **S2 (lõi):** `hub/livechat.ts`: phiên stream-json sống lâu cho 1 session (start/send/stop, parse từng dòng JSON, đẩy SSE `live`). Một session một tiến trình; tab editor mở lên thì phiên này dừng (dùng lại `tabCameUp`). Test với claude giả in stream-json.
3. **S3:** UI chat trực tiếp: chữ chạy dần, khối tool call gập/mở, nút Dừng. Mặc định dùng cho chat riêng (#38).
4. **S4:** hỏi quyền qua `--permission-prompt-tool` → tool MCP hub → hộp Cho phép/Từ chối trong UI, quá giờ thì từ chối. Test: allow/deny/timeout.
5. **S5:** cây file + xem file + diff (chỉ đọc), giới hạn trong cwd, chặn file bí mật (`isSecretFile`).
6. **S6:** Monaco offline + lưu file + commit đúng file. Sau S5.

Thứ tự: S2 → S3 → S4 (thành "IDE chat" dùng được) → S1 → S5 → S6.
