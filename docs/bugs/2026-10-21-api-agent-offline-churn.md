# Lỗi 2026-10-21 — agent claude-api bị đánh dấu offline/ended giữa lượt

**Trạng thái:** đã sửa phần chính (`^15f4822`), cần restart hub để có hiệu lực. Phần còn lại là đề xuất, chờ lead quyết.
**Người báo:** user ("2 thằng deep-seek02 và deepseek chết liên tục"), điều tra: deepseek + deep-seek02.

## Triệu chứng

Agent chạy bằng provider API (`claude-api`, tức `claude --bare`, ví dụ deepseek/deep-seek02) bị hub coi là đã chết trong khi tiến trình `claude` vẫn còn sống:

- `room_who` hiện **offline** sau ~3 phút không gọi API hub;
- sau ~5 phút thành **ended**;
- mỗi tin gửi tới sau đó phải spawn lại tiến trình, nên agent "chết liên tục" và mất ngữ cảnh giữa các lượt;
- trong `revive.log` chỉ có dòng bắt đầu, không có dòng thoát, nên không có dấu vết để lần lại.

## Tái hiện

1. Có một session agent `claude-api` đã lưu transcript (`claude --bare` + MCP room).
2. `@tên-agent` một việc chạy lâu hơn 3 phút mà trong lúc đó agent không gọi API hub (chỉ đọc file, gọi model, chạy tool).
3. Xem `room_who`: session đã `offline`; sau 5 phút là `ended`, dù PID `claude` vẫn sống.
4. Gửi thêm một tin: hub spawn lại từ đầu thay vì giao vào tiến trình đang chạy.

## Nguyên nhân

1. **Không có PID để kiểm tra sống/chết.** `claude --bare` không chạy hook (plugin/hook bị bỏ qua), nên `s.pid` / `s.pids` của session rỗng. `hub/store.ts` → `sweep()` không có nhánh pid thì rơi về luật "im lặng = chết": `STALE_MS = 180_000` → `offline`, `ENDED_QUIET_MS = 300_000` → `ended`.
2. **Predicate của sweeper thiếu tín hiệu sống của tiến trình nền.** Ở `hub/server.ts` (`setInterval` cuối file), điều kiện "session còn sống" chỉ tính `waiters` / Copilot / liveChat, thiếu `reviving` và `isBackground(id)` (xem `hub/revive.ts`), nên tiến trình nền do hub spawn vẫn bị chấm là chết.
3. **Spawn không ghi lại pid.** `hub/agents.ts` → `spawnAgent()` có gọi `adoptBackground()` nhưng không ghi pid vào session, nên `sweep()` không có dữ liệu để dùng luật "pid còn sống". `revive.log` cũng chỉ ghi dòng bắt đầu, không ghi exit code và thời lượng.
4. **Phụ: `store.post()` không cập nhật `status`.** Hàm chỉ cập nhật `lastSeen`, nên một agent vừa gửi tin xong vẫn hiện `offline` cho tới nhịp sweep kế tiếp.

## Đã sửa (`^15f4822`)

- Predicate sweeper trong `hub/server.ts` tính thêm `reviving.has(id) || isBackground(id)`.
- `store.post()` đưa sender đang `offline` về `idle` và bỏ cờ `ended`.

→ **Cần restart hub** thì hai thay đổi này mới có tác dụng (code nằm trong RAM).

## Chưa làm — đề xuất, chờ lead quyết

- `spawnAgent()` nhận callback để ghi pid (và thời điểm spawn) vào session, cho `sweep()` dùng luật "pid còn sống" thay vì luật im lặng.
- `revive.log` ghi thêm một dòng `exit <code> sau <ms>` (kèm vài dòng stderr cuối) mỗi khi tiến trình nền kết thúc, để lần sau còn dấu vết.
- Cân nhắc heartbeat từ phía agent (agent gọi API hub định kỳ) làm tín hiệu sống thay vì chỉ dựa vào pid.

## Bài học

Cơ chế "im lặng = chết" chỉ đúng khi **mọi** agent đều có hook báo về hub. Agent provider chạy `--bare` không có hook, nên cần tín hiệu sống riêng (pid hoặc heartbeat). Mọi session do hub spawn nên có ít nhất một trong hai.

## English summary

Agents backed by an API provider (`claude --bare`) have no hooks, so their sessions carry no pid and the hub's `sweep()` fell back to "silence means dead": offline after 180 s, ended after 300 s, even while the `claude` process was alive — every later message spawned the agent again. The sweeper's liveness predicate also ignored `reviving` and `isBackground`, and `revive.log` recorded no exit line. Fixed in `^15f4822` (sweeper predicate, `store.post()` status; needs a hub restart). Still proposed: record the pid on spawn, log `exit <code> after <ms>`, or use a heartbeat.
