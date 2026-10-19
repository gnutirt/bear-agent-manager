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

### D2b. Copilot: tự chuyển profile khi hết quota (khoảng trống, #25, core-improve)
D2 chạy được vì hai tài khoản Claude *chung một lịch sử chat* (junction D1): chuyển tài khoản chỉ là `--resume` cùng session bằng `CLAUDE_CONFIG_DIR` khác. Copilot (`docs/superpowers/specs/2026-10-19-headless-agent-profiles.md`, commit `bea68d3`) cho nhiều profile (nhiều tài khoản/workspace) nhưng **mỗi profile có lịch sử hội thoại riêng** (`home`/identity riêng) — không có junction nào gộp chúng lại, nên "chuyển sang profile B để tiếp tục" không tự nhiên bằng D2: profile B không có ngữ cảnh cuộc trò chuyện của profile A.
- **Nhận diện hết quota**: Claude có tín hiệu rõ (`StopFailure rate_limit` + thời điểm reset đọc từ transcript). SDK Copilot CHƯA xác nhận có tín hiệu tương đương (không thấy field quota/rate-limit nào trong `CopilotStatus`/`getAuthStatus()` hiện tại) — cần tra tài liệu SDK trước khi code, không giả định có sẵn.
- **Hướng tối thiểu đề xuất** (chưa thiết kế chi tiết, để lại cho task code sau #25): khi một turn của profile A lỗi với mẫu lỗi khớp "quota/rate limit" (so khớp message, giống cách Claude dò `rate_limit`), đánh dấu profile đó "limited" (thêm field kiểu `Session.limited` nhưng ở cấp profile, không phải ở cấp session) và dừng gửi việc mới cho nó; nếu có profile B cùng `provider: 'copilot'`, `enabled: true`, còn quota, hub có thể *bắt đầu một turn mới trên profile B với cùng nội dung tin nhắn đang chờ* (không phải resume lại lịch sử A) — tức là "tiếp tục công việc" ở mức "phòng/tin nhắn", không phải "tiếp tục đúng một cuộc hội thoại" như D2 làm với Claude.
- **Việc cần làm trước khi code**: (1) xác nhận SDK Copilot có trả tín hiệu quota/rate-limit nào không; (2) nếu không, quyết định dò theo nội dung lỗi (giòn, dễ vỡ khi SDK đổi câu chữ) hay chấp nhận chưa làm được tới khi SDK hỗ trợ. Không hứa parity với D2 cho tới khi (1) có câu trả lời.

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

## Giới hạn kỹ thuật (không phải bug, không nghiên cứu lại — core-improve, #25)

- **Không đồng bộ real-time 2 chiều.** "Chung chat" (D1) nghĩa là cùng XEM một lịch sử chat đã lưu trên đĩa (qua junction) và có thể tiếp tục ở IDE/tài khoản khác SAU KHI tiến trình trước đã dừng — không phải hai cửa sổ cùng hiển thị trực tiếp một phiên đang chạy. Gõ ở Antigravity không hiện ngay bên VS Code trong lúc cả hai đang mở; đây là giới hạn của kiến trúc hook/turn hiện tại của Claude Code CLI (mỗi tiến trình `claude` sở hữu transcript của riêng nó trong lúc chạy), bear-agent-manager không vượt qua được từ bên ngoài.
- **Hai tiến trình không được ghi cùng một session cùng lúc.** Bắt buộc tuần tự: dừng hẳn tiến trình A (đóng tab hoặc kết thúc turn) rồi mới resume bằng B. Hub tự lo việc này cho các đường đi do hub điều khiển (wake/revive/switch: kiểm `waiters`/`reviving`/pid trước khi spawn). Hub KHÔNG chặn được việc người dùng tự tay mở cùng một session đã-chia-sẻ ở hai tab IDE sống đồng thời — đó là quy tắc ở mức người dùng (cảnh báo trên UI khi `shared: true`), không phải thứ phần mềm có thể ngăn tuyệt đối.

## Hiện trạng đã xác minh trong code (core-improve, #25, 2026-10-19)

Khi khớp lại 6 ý mới của chủ repo với D1-D4, phần lớn phía Claude đã có sẵn trong code hiện tại (không chỉ là kế hoạch) — chưa từng được gắn vào task N0-N4 nên không ai thấy đã xong:

| Ý của chủ repo | Quyết định | Hiện trạng |
|---|---|---|
| 1 tài khoản, 2 IDE cùng lúc | D1 | Đã có: junction tự phát hiện qua `looksLikeClaudeDir`/`listAccounts` (`hub/accounts.ts`), API `GET /api/accounts`. |
| 2 tài khoản, mỗi IDE 1 bên | D1 | Đã có: `POST /api/accounts/share` bật/gỡ junction có kế hoạch trước (`planShare`/`applyShare`), chặn khi còn `claude` đang chạy (có thể đang ghi `projects/`). |
| Đồng bộ / không đồng bộ 2 IDE | D1 + giới hạn trên | Đã có cơ chế chia sẻ lịch sử qua junction; PHẦN "đồng bộ" đúng nghĩa 2 chiều real-time thì không làm được (giới hạn kiến trúc, xem trên). |
| Claude A → B khi hết hạn mức | D2 | Đã có: `settings.accountSwitch` (`off/ask/auto`, `atPct`, `minOtherLeftPct`, `autoOnWake`), chạy qua đường wake/revive. |
| Copilot A → B khi hết quota | D2b (mới) | CHƯA có: `headless-agent-profiles.md` mới cho nhiều profile, chưa có auto-switch; cần xác nhận SDK có tín hiệu quota trước (xem D2b). |
| BAM tự add folder, chạy không cần IDE | D3 | Đã có nền: `POST /api/agents` (không cần IDE), autostart theo máy (`GET/POST /api/autostart`). Phần "y chang IDE" (xem file/diff/duyệt quyền từ UI) do #26 (Copilot) rà tiếp. |
| Cài đặt dễ + 1 lần | D4 | Một phần: `autoUpdatePlugin` đã tự cập nhật plugin Claude mỗi tài khoản; Copilot CLI vẫn cài/đăng nhập thủ công riêng. #27 (new-planner) rà tiếp phần cài đặt tổng thể. |

Kết luận: không cần nghiên cứu lại D1-D3 phía Claude, vì đã triển khai; khoảng trống thật là **D2b (Copilot auto-switch theo quota)** ở trên, cùng việc chưa ai tạo task N0-N4 để theo dõi/nghiệm thu phần đã xong.
