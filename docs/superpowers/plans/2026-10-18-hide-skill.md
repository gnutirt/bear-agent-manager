# Ẩn hẳn một skill khỏi Claude Code (todoplan dòng 4)

Nguồn: https://code.claude.com/docs/en/skills (skillOverrides). Khác "Cấm" (chỉ là lời nhắc trong tin).

- Cơ chế: khoá `skillOverrides` trong `<configDir>/settings.json` của tài khoản: `{"<skill>": "off"}` = không liệt kê cho Claude, không nạp, chặn `/skill`. Mức khác: `name-only`, `user-invocable-only`; mặc định `on`. KHÔNG áp cho skill của plugin (phải `/plugin disable`).
- Phạm vi: theo TÀI KHOẢN (configDir), không theo từng agent: settings.json là của cả tài khoản. Có hiệu lực khi mở lại chat.
- Hub: `hub/skillhide.ts` đọc/ghi chỉ khoá `skillOverrides`, giữ nguyên mọi khoá khác, ghi qua tệp tạm rồi đổi tên; chỉ ghi vào configDir mà hub biết (như install/uninstall); tên skill phải là skill dạng user (`<configDir>/skills/<tên>`), skill plugin trả 409 kèm lời chỉ `/plugin`.
- API: `POST /api/skills/override {configDir, name, level}` (`on` xoá khoá) → `{ok, level}`; `GET /api/skills` thêm `overrides: {configDir: {name: level}}`.
- Test: giữ khoá khác, `on` xoá khoá, plugin bị từ chối, configDir lạ bị từ chối, tên có ký tự lạ bị từ chối, hub.
- UI (@frontend): nút "Ẩn hẳn" trên skill dạng user, cảnh báo "cần mở lại chat".
