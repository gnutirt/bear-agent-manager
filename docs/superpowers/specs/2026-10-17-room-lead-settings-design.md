# Trưởng phòng: cài đặt riêng, tab con, usage lên đầu (thiết kế)

Ngày 2026-10-17. Người yêu cầu: chủ repo (qua room #bear-agent-manager). Người viết: Planner.

## Vì sao

Trưởng phòng (★) đã có (`Room.lead`, `store.setLead`, `hub/lead.ts`, T19) nhưng:
- nút phong chức chỉ là icon ☆ nhỏ trong menu Thành viên, chủ repo không thấy;
- mọi thứ liên quan trưởng phòng (tự mở, osin tự chạy, dọn roomchat, sao lưu, compact) nằm rải rác trong một tab Cài đặt dài;
- mức dùng Claude Pro (5 giờ / tuần, giờ reset) nằm cuối tab Token, trong khi đó là con số chủ repo cần nhìn đầu tiên.

Mục tiêu: một chỗ cài đặt cho trưởng phòng, Cài đặt chia tab con dễ tìm, usage Claude lên đầu. Về sau trưởng phòng tự dọn context và tự dậy khi usage reset.

## Chia giai đoạn (độc lập, làm theo thứ tự)

### P1: giao diện, không đổi hành vi hub

1. **Tab con trong Cài đặt** (thanh `seg` như tab Token): `Chung` · `Worker` · `Trưởng phòng` · `Compact` · `Nhà cung cấp` · `Tài khoản`. Nhớ tab con đang chọn trong `S` (không cần lưu bền). Gán khối hiện có vào tab:
   - Worker: cho phép worker/osin, tầng trả phí, số worker, tự dọn transcript vào room_chat.
   - Trưởng phòng: `autoLead`, "Hub tự chạy osin" (handoff / digest / notes / maxRunsPerDay), sao lưu chat + thư mục sao lưu. (Các khoá settings giữ nguyên tên; chỉ đổi chỗ hiển thị.)
   - Compact: "Tự compact theo agent".
   - Nhà cung cấp: lưới nhà cung cấp + form thêm.
   - Tài khoản: khối "Tài khoản Claude Pro".
   - Chung: lede + mọi thứ còn lại.
2. **Tab Token:** `claudeProBlock()` lên trên cùng (trước lede/KPI worker). Hiển thị cả hai acc (VS Code = `~/.claude`, Antigravity = `~/.claude-antigravity`) với % 5 giờ, % tuần, giờ reset; acc lỗi/hết hạn hiện lý do (đã có `usageError`).
3. **Phong trưởng phòng:** thay icon ☆ bằng nút chữ "Phong trưởng phòng" / "Bỏ trưởng phòng" trên từng dòng thành viên; thêm mục này vào menu `⋯` của từng thành viên ở cột trái nếu cột đó đã có menu theo agent. Trưởng phòng hiện ★ cạnh tên (đã có `isLead`).

Không đổi API, không đổi `settings.json`.

### P1b: phân việc cho worker (chủ repo chọn hướng A, 2026-10-17)

Trong tab con Worker thêm mục "Phân việc": mỗi loại lượt chọn nhà cung cấp + model, hoặc "tự động" (hành vi hiện nay: free trước, chuỗi `models.read` / `models.edit` của nhà cung cấp). Ba loại, khớp cách `skills/worker/worker.ps1` đã phân:
- `read`: lượt worker không có công cụ sửa file (khảo sát, đọc log lớn);
- `edit`: lượt worker có Edit/Write (`$edits` trong worker.ps1);
- `osin`: mọi lượt `-Kind osin` (bàn giao, rút gọn, dọn biên bản; cả lượt hub tự chạy).

```
settings.workerRoutes: { read|edit|osin: { enabled: boolean; provider: 'auto' | <providerId>; model: 'auto' | <model> } }   // mặc định mỗi loại enabled true, auto, auto
```

- `enabled: false` cho loại nào thì hub trả "tắt" cho loại đó như `skills.<kind>.enabled=false` hiện nay (worker.ps1 exit 4); `skills.worker/osin.enabled` vẫn là công tắc tổng.
- Thứ tự ưu tiên: tham số dòng lệnh `-Provider` / `-Model` rõ ràng > `workerRoutes` > tự động. Nhà cung cấp được chọn không dùng được (tắt, thiếu key) thì rơi về tự động và ghi một dòng vào log lượt, không im lặng.
- Model chọn từ danh sách model của nhà cung cấp đó; ô chọn model chỉ liệt kê model của nhà cung cấp đang chọn.
- Validate trong `hub/settings.ts` (khoá lạ bị bỏ, giá trị sai về mặc định). `worker.ps1` đọc `workerRoutes` từ cùng settings.json mà nó đã đọc.
- Hướng B (lời dặn cố định gắn vào prompt mỗi loại lượt) chưa làm; nếu cần sẽ là việc riêng.

### P2: tab con "Trưởng phòng" có cài đặt riêng

Thêm `settings.lead` (một bộ chung cho mọi phòng; ghi đè theo phòng để sau, không làm ở P2):

```
lead: { delegate: boolean; distribute: boolean; handoffOnDone: boolean }   // mặc định: true, true, true
```

Cả ba chỉ thêm dòng vào lời nhắc mà `leadPrompt` (hub/lead.ts) gửi cho trưởng phòng lúc hub mở terminal, và vào nhắc nhở SessionStart/prompt hook của trưởng phòng nếu hook đó đã có đường chèn:
- `delegate`: nhận task từ planner rồi giao cho coder bằng @tên, báo @you khi xong.
- `distribute`: việc đọc nhiều giao worker, dọn dẹp giao osin (theo skill `worker`/`osin`).
- `handoffOnDone`: xong việc thì ghi `room_note` và hồ sơ bàn giao.

Quyết định của chủ repo (2026-10-17): (a) một bộ cài đặt chung; (b) "giao task từ planner cho coder" là lời nhắc trong prompt của trưởng phòng, hub KHÔNG tự đọc tin agent để ra lệnh (đường prompt-injection, xem comment đầu hub/lead.ts).

Tab "Trưởng phòng" gom: `autoLead`, ba công tắc trên, osin tự chạy, dọn roomchat, sao lưu (chuyển từ P1). Validate `lead.*` trong `hub/settings.ts` như các khoá bool khác; mặc định khi file cũ thiếu khoá.

### P3: cần thí nghiệm trước (chưa duyệt chi tiết)

- **Tự clear sau khi giao xong:** Claude không tự `/clear` được. Hướng: hub dừng claude của trưởng phòng, mở session mới không `--resume`, kèm hồ sơ bàn giao + biên bản phòng (`compactContext`), giữ chức ★ và luật skill/compact (`moveSkillRules`).
- **Tự đánh thức khi usage gần hết:** khi cửa sổ 5 giờ ≥ ngưỡng (đã có `ALERT_AT`), trưởng phòng ngừng giao việc mới; sau giờ reset (hoặc N phút) hub gọi dậy bằng `claude --resume` headless (`spawnRevive`).
- Cả hai dựa vào thí nghiệm: pid claude từ hook `process.ppid` có đúng không (VS Code + CLI); kill cứng có bắn SessionEnd không; `--resume --model` ở print mode.

## Không làm

- Hub không tự đọc nội dung tin agent để giao việc.
- Không refresh token Claude (mục todoplan riêng, cần chủ repo duyệt).
- Không cài đặt riêng theo phòng ở P2.
- Không đổi cách lưu `settings.json` của các khoá cũ.

## Giao cho người làm

P1 là việc giao diện thuần trong `ui/index.html` (+ test `test/ui.test.ts`, CHANGELOG Unreleased). P2 đụng `hub/settings.ts`, `hub/lead.ts`, `ui/index.html`, test. Mỗi giai đoạn một commit, test xanh, không push. P3 chỉ viết plan sau khi có kết quả thí nghiệm.

Do người viết tự quyết (đánh dấu để chủ repo kiểm): tên tab con; nằm "sao lưu chat" trong tab Trưởng phòng; mặc định ba công tắc `lead.*` đều bật; ngưỡng tự đánh thức dùng `ALERT_AT` có sẵn.
