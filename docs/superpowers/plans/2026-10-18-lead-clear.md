# Nút "clear" của trưởng phòng (spec P3)

Claude không tự `/clear` được; làm bằng cách thay phiên: dừng lead cũ, mở lead mới sạch context kèm hồ sơ bàn giao. Không có hook/thí nghiệm mới: dùng lại terminateSession, openLead (claude-cli://) và claimLead đã chạy.

- `POST /api/rooms/:r/clear-lead {force?}`: 409 nếu phòng chưa có lead; 409 `{dirty,files}` nếu thư mục lead có file chưa commit (trừ `force:true`); `terminateSession(lead)` (cần pid, như nút Kết thúc).
- Prompt phiên mới = `leadPrompt` (biên bản phòng) + mục "Hồ sơ bàn giao của trưởng phòng trước" đọc từ `handoffs/<id>.md` nếu có (cắt để cả prompt ≤ 5000 ký tự của link). Chỉ chữ của hub và hồ sơ do chính osin viết, không chép tin agent.
- `openLead` nhận `from` (id lead cũ) → `leadPending` nhớ; người dùng bấm Enter, `claimLead` gán ★ cho phiên đầu tiên vào từ đúng thư mục; nếu tên khác tên cũ thì đổi tên cũ thành `<tên>-cu`, phiên mới nhận tên cũ để luật skill/compact/model (khoá theo tên) đi theo.
- Hub nhắn vào phòng: đã dừng lead, đã mở phiên mới, bấm Enter. Khoá i18n `sys.lead.cleared`, `lead.handoffHead`.
- Test: không có lead → 409; có file dirty → 409 và `force`; prompt chứa hồ sơ và ≤ 5000; claimLead đổi tên và giữ luật; terminate dùng stub procs như test T-B.
- UI nút "Làm mới trưởng phòng" là việc @frontend.
