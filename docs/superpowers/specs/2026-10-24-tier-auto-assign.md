# Spec: hub tự chia việc đều cho một tầng (owner = "tier:N")

Task #263. User (DM 24/10): "mày chưa có cơ chế phân bổ công việc đồng đều tầng 5". Nghiên cứu: function-research.

## Mục tiêu
Lead giao việc cho "tier:5" thay vì một tên cụ thể. Hub chọn người ở tầng đó còn sống và đang ít việc nhất; khi bằng nhau thì xoay vòng. Lead vẫn giao đích danh được như cũ.

## Dữ liệu
- `Task` (hub/tasks.ts:9) thêm hai trường:
  - `pool?: number`: tầng được giao, 1..9.
  - `assignedAt?: number`: lúc hub gán owner gần nhất.
- `owner` vẫn luôn là một tên member, hoặc rỗng khi chưa chọn được ai. Hub không bao giờ lưu chuỗi "tier:5" vào `owner`, nên các chỗ đang đọc `owner` không phải sửa: KPI, monitor #195, `room_tasks next`, tab Việc, autoNext.
- Xoay vòng không cần lưu thêm trạng thái: khi bằng điểm thì chọn người có `assignedAt` cũ nhất, lấy trong các task có `pool` cùng tầng.

## Nhận "tier:N"
- Route `POST /api/rooms/:room/tasks` (hub/server.ts:3292, `memberName`): khi `owner` khớp `/^tier:([1-9])$/i` thì:
  - đặt `pool = N` và để `owner` rỗng;
  - trả 400 nếu `flowTiers[room]` không có member nào ở tầng N.
  - Chỉ lead được làm việc này: luật `isLead` hiện có (:3290, :3337) đã chặn người khác đổi owner.
- `apply()` (hub/tasks.ts:84) nhận `pool` (số nguyên 1..9, hoặc `null` để xoá). Giao đích danh một tên thì xoá `pool`.
- mcp/tools.ts:19: mô tả của `owner` thêm câu: "or tier:N to let the hub pick the least-busy live member of that tier".

## Chọn người: `pickTierOwner(room, tier, now)` trong hub/server.ts
1. **Ứng viên:** member của phòng có `flowTiers[room][normAgent(name)] === tier`.
2. **Loại ngay** những ai:
   - có session `ended`, hoặc `status === 'offline'` mà không có cách đánh thức. Profile API hoặc hub-member đang `enabled` thì vẫn đánh thức được (revive/HubMember), nên được giữ lại.
   - có profile bị `enabled: false`;
   - đang hết hạn mức: `apiState.get(id)?.limited > now` (:761), `apiBudgetUntil(p)` (:767), hoặc `accountUsageBlocked(s)` (:1784);
   - có lỗi gần đây: trong 30 phút qua có tin hệ thống trong phòng với `meta.agent === name` và `meta.level` là `'error'` hoặc `'warn'`. Tin lỗi của HubMember (hub/member.ts:206, :236, ví dụ agy timeout) và tin hết hạn mức của API (:831) đều đã mang `meta.agent`. Ngưỡng 30 phút là hằng số `TIER_COOLDOWN_MS`, không thêm cài đặt.
3. **Xếp hạng:**
   - (a) đang online (`idle`, `busy`, `waiting`) xếp trước người chỉ đánh thức được;
   - (b) ít task `todo` + `doing` hơn;
   - (c) `assignedAt` cũ nhất (người chưa từng được giao đứng đầu);
   - (d) tên, để thứ tự cố định khi test.
4. Không còn ai thì trả `undefined`.

## Khi nào chọn
Mọi đường giao việc đều đi qua `assignTask` (hub/server.ts:3605), nên chỉ sửa ở một chỗ:
- Đầu `assignTask`: nếu `t.pool` có giá trị và (`owner` rỗng hoặc owner không còn qua được bước 2) thì gọi `pickTierOwner`.
  - Có người: `updateTask` đặt owner và `assignedAt`, rồi đi tiếp như cũ.
  - Không có ai: giữ task `todo` với owner rỗng. Báo lead đúng một lần cho mỗi task (`sys.task.tierEmpty`), rồi return.
- Các chỗ gọi đang có điều kiện `if (t.owner)` đổi thành `if (t.owner || t.pool)`: :3306 (add), :3328 (xoá task làm dependency), :3369 (freed khi update), :3626 (`afterTaskDone`).
- Nhờ vậy, task `blocked` có `after` chỉ chọn người lúc nó thành `todo`. Nếu owner cũ đã offline hoặc đang hết hạn mức thì hub chọn lại.
- `autoNextTasks` (:3633, chạy mỗi tick ở :3772): thêm một vòng cho task `todo` có `pool` mà owner rỗng, để thử chọn lại. Cooldown 10 phút giống chỗ đang có, tránh báo dồn.
- Lead đổi owner sang một tên cụ thể thì xoá `pool`. Hub không chọn lại task đó nữa.

## Tab Việc (ui/index.html:3047, :3070)
- Ô chọn người có thêm "Tự chia: tầng N" cho mỗi tầng đang có member trong `flowTiers[room]`.
- Thẻ task có `pool` hiện "tự chia T5 → <owner>", hoặc "tự chia T5 → chưa có ai rảnh".
- i18n vi/en: `task.pool` = "tự chia T{n}", `task.poolNone` = "chưa có ai rảnh", `task.poolOpt` = "Tự chia: tầng {n}", `sys.task.tierEmpty` = "#{id}: chưa có ai ở tầng {n} rảnh để nhận ({title}). Hub sẽ thử lại." / en tương ứng.

## Ngoài phạm vi v1
- Chuyển task `doing` của người vừa chết sang người khác: monitor #195 đã báo lead.
- Cân theo độ khó của task, hoặc theo model và chi phí.
- Chia việc cho nhiều tầng một lúc ("tier:4,5").

## Rủi ro
1. **Hai task cùng được giao một lúc** (lead add liên tiếp, hoặc nhiều task cùng được mở khoá). Bước đếm (b) phải đọc lại `listTasks` sau mỗi lần gán, nếu không cả hai task rơi vào cùng một người. Hub chạy đơn luồng nên chỉ cần gán tuần tự.
2. **Ứng viên "đánh thức được" nhưng không dậy** (tab IDE đã đóng, revive thất bại). Task nằm im với người đó. Hiện monitor #195 báo lead sau `staleMin`; sau này có thể cho monitor tự chọn lại khi task có `pool`.
3. **Đổi tên agent hoặc đổi `flowTiers` khi task đang chờ:** lúc unblock thì người cũ không còn là ứng viên, nên hub chọn lại. Đây là hành vi mong muốn.
4. **Agent tự gọi `room_tasks next`** chỉ lấy task đã có owner là chính nó. Task `pool` chưa có owner thì không ai tự nhận; đây là cố ý, để hub là nơi duy nhất chia việc.

## Task (cho new-planner và lead)
- **T1 hub/tasks.ts:** thêm `pool` và `assignedAt` vào `Task` và `apply()`. Test `test/tasks.test.ts`:
  - `pool` từ 1..9 được nhận, `null` thì xoá, giá trị khác thì 400;
  - giao đích danh một tên thì xoá `pool`.
- **T2 hub/server.ts:** `pickTierOwner`, nhận `tier:N` trong `memberName`, các bước trong `assignTask`, các điều kiện `if (t.owner || t.pool)`, vòng mới trong `autoNextTasks`, mô tả trong mcp/tools.ts, i18n `sys.task.tierEmpty`. Test `test/tasks-tier.test.ts`:
  - 3 member T5 có 0, 1, 0 task: giao 2 task thì 2 người rảnh mỗi người nhận một, không ai nhận 2;
  - bằng điểm thì xoay vòng theo `assignedAt`;
  - bỏ qua người offline/ended, profile tắt, đang hết hạn mức, hoặc có tin `level:'error'` với `meta.agent` trong 30 phút;
  - task `blocked` (after) chọn người lúc mở khoá, và chọn lại nếu owner cũ đã offline;
  - không ai rảnh: owner rỗng, lead nhận một tin; tick sau có người thì được gán;
  - lead giao đích danh vẫn chạy như cũ và xoá `pool`; người không phải lead dùng `tier:5` thì 403; tầng không có member thì 400.
- **T3 ui/index.html + i18n:** ô chọn "Tự chia: tầng N", nhãn "tự chia T5 → tên". Test `test/ui.test.ts` và dict-keys.
- **Thứ tự:** T1 → T2 → T3. T2 sửa hub/server.ts, nên phải chờ các task khác đang sửa file đó xong (luật của lead).
