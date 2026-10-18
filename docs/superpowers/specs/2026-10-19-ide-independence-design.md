# Chạy độc lập IDE, chung chat 2 IDE, tự đổi tài khoản (thiết kế)

Ngày 2026-10-19. Yêu cầu của chủ repo (đã duyệt hướng, "tiến hành"): (1) VS Code và Antigravity dùng chung chat theo repo, có công tắc; (2) hai tài khoản Claude, gần hết hạn mức thì tự chuyển; (3) hub chạy và gọi dậy agent mà không cần mở IDE; (4) hết bug "lệch bản plugin". Áp cho mọi máy, repo, phòng; không hard-code tên.

## Hiện trạng (truong-phong đo 2026-10-19)

- `~/.claude-antigravity/projects` là junction tới `~/.claude/projects` (cả hooks, file-history, paste-cache, CLAUDE.md, history.jsonl): chat theo đường dẫn repo nên cùng repo là cùng session. Không chung: `plugins/`, `skills/`, `settings.json`, đăng nhập.
- Hai tài khoản riêng (mỗi thư mục cấu hình một đăng nhập, hạn mức riêng). `claude --resume <id> -p` với `CLAUDE_CONFIG_DIR` của tài khoản kia đọc được chat cũ nhờ projects dùng chung.
- Wake nền (revive) chạy không cần IDE, đã chứng minh. Chưa có: tạo agent MỚI không qua IDE; tự bật hub theo máy (đã duyệt dạng tuỳ chọn).
- Plugin Claude Code (hook + MCP) là 1, cài riêng cho mỗi tài khoản. `vscode/extension.js` (bear-agent-manager-vscode) là extension tuỳ chọn chỉ nhúng giao diện hub; `agent-room-vscode-0.1.0.vsix` là bản tên cũ, xoá.
- Cảnh báo lệch bản (V1) quét cả thư mục cache cũ, báo sai.

## Quyết định

### D1. Chung chat giữa hai IDE (công tắc)
- Setting `shareChats: boolean` (Cài đặt > Máy chủ/Tài khoản). Trạng thái thật đọc từ đĩa: `projects` của tài khoản phụ có phải junction tới tài khoản chính không (`GET /api/accounts` trả `sharedProjects: bool, linkTarget`).
- Bật: nếu `projects` phụ còn dữ liệu riêng thì KHÔNG xoá; hub gộp bằng cách chuyển (rename) thư mục riêng thành `projects.pre-share-<ngày>`, rồi tạo junction. Gỡ: xoá junction (không chạm dữ liệu đích). Mọi thao tác sau xác nhận trên UI, kèm bản liệt kê trước. Chỉ làm khi cả hai tài khoản không có claude đang chạy (kiểm pid), nếu không thì từ chối kèm lý do.
- Tránh hai claude cùng một session: `open-tab`, revive và switch kiểm session đã có tiến trình sống ở tài khoản nào (hub biết pid + configDir từ register); có thì không mở thêm, báo "session đang chạy ở <IDE/tài khoản>".
- Chỉ một IDE/tài khoản: công tắc ẩn hoặc xám, không lỗi.

### D2. Tự đổi tài khoản khi gần hết hạn mức
- Setting `accountSwitch: { mode: 'off'|'ask'|'auto' (mặc định ask), atPct: 90, minOtherLeftPct: 20 }`.
- Điều kiện: `shareChats` bật (cần chat chung để resume bằng tài khoản kia), tài khoản kia đăng nhập hợp lệ (token còn hạn) và dùng hạn mức 5 giờ thấp hơn `100 - minOtherLeftPct`.
- Hành vi: session đang nền hoặc vừa dính giới hạn của tài khoản A → hub resume nó bằng `CLAUDE_CONFIG_DIR` của tài khoản B (revive nền, quyền theo tab Quyền) và ghi tin hệ thống `sys:{type:'wake'}` "X chuyển sang tài khoản B (A đã dùng N%)". Tab đang mở của người dùng KHÔNG bị đóng khi `mode=ask`; chỉ hỏi (nút "Chuyển ngay"). Không đổi token, không sao chép đăng nhập giữa hai thư mục.
- Token hết hạn của tài khoản kia (hdbank): chờ quyết định refresh token riêng; D2 coi tài khoản đó "không dùng được" và nói rõ lý do trên UI.

### D3. Chạy không cần IDE
- Hub chạy độc lập bằng `npm run hub` hoặc tự khởi động theo máy (Startup/Task Scheduler, mặc định tắt, nút bật có xác nhận, nút gỡ). Giao diện chạy ở trình duyệt `http://127.0.0.1:7788`.
- Tạo agent mới không IDE: `POST /api/agents {name, cwd, room, account?, prompt?}` spawn `claude -p` nền trong `cwd` (kiểm thư mục tồn tại, trong danh sách repo đã biết hoặc người dùng xác nhận), tự `room_join`, giữ sống bằng waiter như revive; session được lưu và mở lại trong IDE lúc nào cũng được vì chat lưu trong `projects`. Tiến trình nền ghi file tuân theo tab Quyền.
- README: bảng "Cách dùng khi không mở IDE" (khởi động hub, plugin cho CLI, tạo agent, mở lại trong IDE).

### D4. Plugin và extension
- Giữ một plugin, tài liệu rõ: plugin = hook + MCP (bắt buộc, cài cho mỗi tài khoản), extension vscode = khung giao diện (tuỳ chọn). Xoá `agent-room-vscode-0.1.0.vsix`; build script tạo `.vsix` mới theo tên hiện hành.
- V1 chỉ so phiên bản bản chép mà `installed_plugins.json` của từng tài khoản trỏ tới, bỏ qua thư mục cache cũ; shim ổn định (đã giao coder) loại hẳn nguyên nhân; dọn cache cũ chỉ với bản không được `installed_plugins` trỏ tới.

## Giai đoạn

- N0 (@coder, nhỏ, trước hết): V1 chỉ đọc `installed_plugins.json`; xoá vsix cũ; sau đó tiếp shim + dọn cache + 0.4.0 như đã giao.
- N1 (@core-improve): D1 hub (`GET /api/accounts`, bật/gỡ junction, chống mở trùng) + test trong thư mục tạm; D3 `POST /api/agents` + tự khởi động theo máy.
- N2 (@core-improve sau N1): D2.
- N3 (@frontend): UI Tài khoản (công tắc chung chat, trạng thái hai tài khoản kèm %, chế độ tự đổi, nút bật hub theo máy, tạo agent).
- N4 (@coder sau shim): README "không cần IDE", build vsix.

## Rủi ro

Junction/tài khoản chạm vào dữ liệu đăng nhập: không đọc, không sao chép, không in token; mọi thao tác ghi đĩa có liệt kê trước và xác nhận. Hai claude ghi cùng session: luôn kiểm pid + configDir trước khi spawn. Tự tạo agent chạy lệnh trong thư mục người dùng: chỉ trong cwd đã xác nhận, quyền theo tab Quyền.
