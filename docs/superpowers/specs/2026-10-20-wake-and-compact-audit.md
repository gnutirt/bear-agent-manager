# Audit #45: đánh thức agent offline + compact làm chết tab IDE

Người viết: core-improve, 20/10. Chỉ audit + đề xuất, chưa code. Lead duyệt rồi giao coder.

## 1. Các đường đánh thức (hub/server.ts `deliver()` :461)

| Ca | Hiện có wake? | Bằng chứng | Lỗ hổng |
|---|---|---|---|
| Tab mở, idle | Có. Hook Stop `hooks/waiter.ts` long-poll `/wait` 50 s/lượt, sống ~7 ngày, hub restart thì tự thử lại | waiter.ts:46-66 | Waiter chỉ sinh ở **Stop**. Lượt chết giữa chừng (Esc, lỗi API, crash) không có Stop ⇒ không có waiter |
| Tab đóng sạch (SessionEnd) | Có: `ended` ⇒ `revive()` chạy `claude --resume -p` nền | server.ts:479, 526 | Không có transcript, hoặc `openTabOnWake` tắt và revive lỗi ⇒ tin nằm chờ, phòng chỉ thấy `sys.wake.failed` |
| Tab tắt cứng | Có từ #8 (f70b02e): offline >5 phút, không pid sống ⇒ ended ⇒ revive | store.ts:643 | Ổn |
| Hết hạn mức | Có: `endedOnLimit` ⇒ `unstick()` hẹn giờ reset / D2 đổi tài khoản; `closeLimitedTab` kill tab rồi revive | server.ts:435-457, 471 | Chỉ bắt được lỗi **hạn mức**, các lỗi khác thì không |
| **Tab sống nhưng điếc** (coder 6,5 tiếng từ #1399) | **Không** | `deliver()`: không waiter + `!ended` ⇒ `return` (:477-480). `sweep()` thấy pid còn sống nên không bao giờ đánh dấu ended (store.ts:637) | Lỗ chính. Tab còn pid nhưng không có waiter (lượt bị ngắt/lỗi không phải hạn mức) thì tin cứ chờ mãi, không ai được báo |

Nguyên nhân chính xác của ca coder #1399 chưa xác minh từ transcript. Code cho thấy đúng khe này: pid sống + không waiter + không phải hạn mức.

## 2. Compact tab IDE đang mở ⇒ "process exited with code 1"

`POST /api/sessions/:id/compact {closeTab:true}` gọi `terminateSession` ⇒ `taskkill /F` tiến trình claude của tab (server.ts:1535-1537). VS Code báo code 1, tab chết. Sau compact, hub chỉ revive nền khi có `revive:true`, nếu không thì `markEnded` (:1556-1557). Tab IDE không bao giờ được mở lại. Log 17:48Z của tab core-improve chỉ là đuôi debug bình thường (Stop hook, ghi `.claude.json`), không có exception, khớp với bị kill từ ngoài. Note [35] đã cấm cách làm này về quy trình, nhưng code vẫn cho phép.

## 3. Task code đề xuất (thứ tự ưu tiên)

1. **C1: Compact tab IDE xong thì mở lại tab** (server.ts compact route). Khi đã kill tab có `s.ide`: compact xong thì gọi `openTab(s)` (cùng hàm của route `open-tab`) thay vì `markEnded`, để user chỉ cần Enter là chạy tiếp với chat đã gọn. Không có `s.ide` thì giữ revive nền. Test: fake openUrl được gọi đúng 1 lần sau compact closeTab của session có ide.
2. **C2: Chặn closeTab trên tab IDE nếu không có `confirm`**. Trả 409 `tabOpen` + message "tab sẽ bị đóng rồi mở lại". UI hỏi user; lead (agent) không tự gửi confirm (đúng note [35]). Test: không confirm ⇒ 409, có ⇒ chạy.
3. **C3: Phát hiện "tab điếc"** (sweeper 30 s sẵn có). Session `!ended`, không trong `waiters`, pid còn sống, có tin `wake` chờ > N phút (mặc định 10) ⇒ post 1 lần `sys.tab.deaf` "X không nhận tin (tab còn mở nhưng lượt trước bị ngắt). Gõ 1 phím trong tab hoặc bấm Mở lại", kèm action open-tab cho UI. Không kill tự động (có thể đang chạy tool dài). Test: pid sống + không waiter + tin chờ 11 phút ⇒ đúng 1 thông báo; có waiter ⇒ không báo.
4. **C4: Báo rõ khi tin không thể giao**. `deliver()` nhánh ended mà `revive()` trả false vì không transcript và `openTabOnWake` tắt ⇒ post `sys.wake.cannot` 1 lần/phiên thay vì im lặng.

Hết lỗ (đối chiếu yêu cầu user "agent offline phải được wake"): ended/tắt cứng/hạn mức đã tự wake. Tab điếc thì không thể bơm tin vào tiến trình claude đang mở từ ngoài (giới hạn của Claude Code), nên C3 phải báo cho người, không tự wake được trừ khi kill (cấm theo note [35]).
