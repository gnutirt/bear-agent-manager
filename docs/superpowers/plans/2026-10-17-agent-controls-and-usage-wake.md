# Điều khiển thành viên + hẹn giờ đánh thức theo usage (plan P3)

Spec gốc: docs/superpowers/specs/2026-10-17-room-lead-settings-design.md (mục P3). Kết quả thí nghiệm do core-improve đo (claude 2.1.293, Windows, 2026-10-17):
- Hook `command:"node"` + `args` (như hooks/hooks.json) có `process.ppid` = pid claude. KHÔNG đổi hooks.json sang dạng chuỗi (khi đó ppid là bash.exe).
- Kill cứng (`taskkill /F`) KHÔNG bắn SessionEnd: hub tự đánh dấu `ended`.
- `claude --resume <id> --model X -p` đổi model thật.
- Hẹn giờ của Claude Code (CronCreate, ScheduleWakeup, Routine) không dùng được cho hub; timer đặt ở hub.

Quy ước: mỗi task một commit, test xanh (`npm test`), không push, CHANGELOG Unreleased, báo hash cho @truong-phong. Việc giao diện (nút trong menu Thành viên, tab con Trưởng phòng) làm trong ui/index.html, pull/merge trước khi commit vì @frontend cùng sửa file.

## T-A: hub biết pid claude của từng session

- Waiter (hooks/waiter.ts) gửi `process.ppid` lúc register; SessionStart hook cũng gửi. Hub lưu `Session.pid` (hub/store.ts, `?: number`), cập nhật mỗi lần gửi.
- Test: register có `pid` thì lưu; thiếu `pid` không xoá pid cũ.

## T-B: nút điều khiển thành viên (API + menu Thành viên)

API (cùng cơ chế token như các route khác), mỗi route trả 404 session lạ, 409 nếu không có pid hoặc tiến trình không phải claude:
1. `POST /api/sessions/:id/terminate`: kiểm `pid` còn sống bằng `listProcesses()` (hub/workers.ts), cmdline khớp `claude` (cùng regex trong workers.ts:39), rồi `killTree(pid)`; sau đó `store.markEnded(id)` (đặt `ended`, trạng thái `offline`), đăng một dòng hệ thống trong các phòng của agent, và kích job sao lưu chốt như quyết định [4] ở biên bản.
2. `POST /api/sessions/:id/compact`: terminate như trên, rồi `spawnCompact` (hub/revive.ts). Có tham số `revive: boolean` (mặc định false) gọi dậy bằng `spawnRevive` sau khi xong. Báo kết quả trong phòng như T18b (`kTokens` trước/sau).
3. `POST /api/sessions/:id/model` `{ model }`: lưu setting theo agent `agentModel[name]` (validate trong hub/settings.ts, rỗng = mặc định), `resumeTurn` thêm `--model <model>` khi có. Áp từ lần hồi sinh kế tiếp; `{ now: true }` thì terminate rồi hồi sinh luôn.
Menu Thành viên (ui/index.html `membersMenu`): trên mỗi dòng thêm "Kết thúc", "Compact", "Đổi model…". Agent `busy` thì hiện xác nhận ("sẽ mất lượt đang làm"). Với tab VS Code/Antigravity ghi chú trong xác nhận: tab sẽ chết, phải mở lại.
Test: `kill` đã có hook stub trong `startHub` (`opts.kill`), thêm stub cho process list; test terminate (pid không phải claude thì 409, thành công thì `ended`), compact (gọi `compactRevive` stub), model (lưu + truyền `--model`).
KHÔNG làm clear ở T-B: "clear" cần session mới và chuyển chức ★/luật skill sang session mới; thiết kế riêng sau khi T-B xong.

## T-C: hẹn giờ đánh thức khi usage gần hết

Cài đặt `settings.lead.wake`: `{ enabled: boolean; atPct: number; afterResetMin: number }`, mặc định `false, 90, 2`; validate trong hub/settings.ts; thêm vào tab con "Trưởng phòng" (@frontend/coder làm UI).
Hub (hub/server.ts, `pollUsage` đã chạy mỗi 15 phút và đã có `resetsAt`):
1. Khi `wake.enabled` và cửa sổ 5 giờ của một tài khoản ≥ `atPct` và chưa có hẹn cho chu kỳ đó: lưu `store.state.wakeAt[accountKey] = Date.parse(resetsAt) + afterResetMin*60_000` (khoá theo email hoặc configDir đầu, như `usageAlerts`), đăng một dòng hệ thống trong các phòng có thành viên thuộc tài khoản đó: "gần hết usage, tạm dừng giao việc mới, hẹn dậy lúc HH:MM".
2. `setTimeout` đến `wakeAt` (unref); khi hub khởi động thì đặt lại từ `store.state.wakeAt`; hẹn đã quá giờ thì chạy ngay.
3. Đến giờ: gọi `usage.read(..., true)` kiểm tra đã reset (pct thấp hơn ngưỡng); nếu chưa thì dời thêm 5 phút và thử lại, tối đa 6 lần rồi báo @you. Đã reset thì với mỗi phòng của tài khoản đó đăng tin dạng người dùng (`store.post(room, null, ...)`, KHÔNG dùng `postSystem` vì nó có `mentions: []` và `wake: []` nên không đánh thức ai) mention trưởng phòng (nếu có), không có thì `@all`: "usage đã reset, làm tiếp". Tab đang mở thì waiter của Stop hook đánh thức; session đã đóng thì đường `spawnRevive` sẵn có xử lý. Xoá `wakeAt[accountKey]` sau khi đăng.
4. Chỉ đánh thức thành viên thuộc tài khoản đã reset: map session → tài khoản qua `Session.configDir` (rỗng = `~/.claude`), như `accountRooms`.
Chưa đo: `claude -p` trả gì khi tài khoản đang bị rate limit; T-C phải xử lý exit khác 0 của `spawnRevive` bằng một dòng báo trong phòng, không loop.
Test: stub `usageFetch` (có trong `startHub`) và đồng hồ; kiểm tra lưu `wakeAt`, đặt lại sau restart, chỉ mention thành viên đúng tài khoản, hẹn quá giờ chạy ngay, chưa reset thì dời.

## Thứ tự

T-A → T-B (terminate trước, rồi compact, rồi model) → T-C. Làm sau P1b và các việc todoplan hiện có của @coder.
