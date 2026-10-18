# Wake nền sống qua nhiều lượt (việc A)

Vấn đề: `claude --resume -p` trả lời xong là thoát, agent "chết tiếp". Đo (core-improve): Stop hook `asyncRewake` CHẠY trong `-p`; exit 2 của hook làm thêm một lượt; exit 0 thì tiến trình thoát. Không cần stream-json.

- `hooks/waiter.ts`: `BEAR_AGENT_HEADLESS=1` đã cho waiter chạy trong `-p`. Thêm `BEAR_AGENT_IDLE_MIN`: tuổi thọ waiter = idleMin phút (mỗi Stop sinh waiter mới nên đó là "rảnh sau lượt cuối"); hết giờ exit 0 → claude -p tự thoát. Không có biến này thì giữ như cũ (worker, tab).
- `hub/revive.ts`: wake (không phải compact) đặt `BEAR_AGENT_HEADLESS=1` + `BEAR_AGENT_IDLE_MIN`; trần cứng 4 giờ thay cho 15 phút (một tiến trình sống qua nhiều lượt); giữ handle child theo session id, `stopRevive(id)` để kill.
- `hub/settings.ts`: `lead.idleMin` (mặc định 30, 1–240). `hub/server.ts` truyền vào job; `open-tab` và terminate gọi `stopRevive` để không có 2 tiến trình cùng session.
- Tin tới khi tiến trình nền đang chờ đi qua waiter (đã có: `deliver` → waiter; `revive()` bị `reviving`/`waiters.has` chặn). Tiến trình thoát → `revive().finally` đánh dấu offline (đã có). `Session.pid` do register của waiter gửi ppid (đã có).
- Test: env đúng cho wake và không cho compact; idleMin kẹp; stopRevive; waiter thoát sau idle (chạy waiter thật với idle ngắn).
- Đo thật: session thử, 3 lần gọi dậy liên tiếp không mở tab. Quyền ghi file vẫn chờ @you duyệt `reviveTools`.
