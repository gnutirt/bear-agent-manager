# Bộ lọc và gói skill theo vai trò (thiết kế)

Ngày 2026-10-18. Yêu cầu của chủ repo: có index thư viện skill rồi thì làm bộ lọc skill phù hợp cho các vai trò chủ đạo. Áp cho mọi phòng, agent, tài khoản; không hard-code tên agent.

## Hiện trạng

- Thư viện: `skill-library/` (commit d4f2ff1), 107 skill, `index.json` gồm `name, category, path, description, source, license`; category: banking 84 · slides 9 · training 11 · general 3. File sinh bằng `node skill-library/build-index.mjs`.
- Hub đã có luật skill theo TỪNG agent (`settings.agentSkills[agent][skill] = { mode: 'auto'|'force'|'ban', when: 'every'|'first' }`, wildcard `plugin:*`, hub/skillmodes.ts) và tab Skill trong UI liệt kê skill ĐÃ CÀI (`listSkills` đọc `<configDir>/skills`). Skill trong `skill-library/` mới chỉ là file trong repo, chưa cài vào Claude Code của ai; theo biên bản [5], `skills/` KHÔNG dùng chung giữa hai thư mục cấu hình (`~/.claude` và `~/.claude-antigravity`).

## Mục tiêu / không làm

Mục tiêu: (1) lọc thư viện theo vai trò, loại, từ khoá, giấy phép; (2) "gói vai trò" (một nhóm skill) áp một lần cho một agent; (3) cài skill thư viện vào thư mục cấu hình đã chọn để dùng được.

Không làm: tự cài không hỏi; chạy script bên trong skill khi cài; chép skill ngoài `skill-library/index.json`; sửa nội dung skill; đồng bộ lên mạng.

## Quyết định (người viết tự quyết, chủ repo kiểm)

- **Vai trò** = lĩnh vực công việc, khớp các category của index: Ngân hàng (banking), Slide (slides), Đào tạo (training), Chung (general). Index thêm trường `roles: string[]` (mặc định `[category]`; một skill có thể thuộc nhiều vai trò, ví dụ skill brand dùng cho cả slide lẫn training). Gán `roles` khác mặc định ở file tay `skill-library/roles.json` (map `tên skill → roles`), `build-index.mjs` gộp vào index; test bắt mọi tên trong roles.json có trong thư viện.
- **Gói vai trò** (`skill-library/packs.json`): `{ id, vi, en, roles, skills: [tên], mode: 'auto'|'force', when }`. Bản đầu mỗi vai trò một gói "cốt lõi" tối đa 8 skill (người duy trì thư viện chọn). Gói là gợi ý; áp xong vẫn chỉnh từng skill ở tab Skill như hiện nay.
- **Hub** (`hub/skilllib.ts`, file mới): đọc `skill-library/index.json` + `packs.json` (cache theo mtime). API: `GET /api/skill-library?role=&q=&license=` (lọc, trả `installed: [configDir...]` cho từng skill), `GET /api/skill-packs`, `POST /api/skill-library/install {names, configDir}`, `POST /api/skill-packs/apply {pack, agent}` (đặt luật vào `agentSkills` theo tên agent chuẩn hoá, chỉ cho skill đã cài ở tài khoản của agent đó, báo những skill chưa cài).
- **Cài** = sao chép thư mục skill vào `<configDir>/skills/<tên>` chỉ khi đích chưa tồn tại (đích đã có thì báo "đã cài", không ghi đè); `configDir` chọn từ danh sách tài khoản đang đăng nhập (VS Code `~/.claude`, Antigravity `~/.claude-antigravity`) hoặc cả hai; chặn đường dẫn có `..`, chỉ chép file thường (bỏ symlink), giới hạn kích thước mỗi skill; không chạy gì sau khi chép; chép kèm LICENSE của nguồn. Gỡ cài = xoá thư mục chỉ khi nằm trong `<configDir>/skills` và trùng tên skill thư viện. Cần mở lại chat để Claude Code nạp skill mới (ghi trong giao diện).
- **Giao diện** (tab Skill): thanh chip vai trò (Tất cả · Ngân hàng · Slide · Đào tạo · Chung), ô tìm, lọc giấy phép, thẻ skill (tên, mô tả một dòng, nguồn + giấy phép, trạng thái cài theo từng tài khoản, nút Cài/Gỡ); khung "Gói vai trò" có nút "Áp cho agent…" (chọn agent trong phòng). Chuỗi dùng `t()` vi/en.
- **Giấy phép**: giao diện hiện giấy phép của từng skill và dẫn tới `NOTICE.md`; không cài skill thiếu LICENSE trong thư viện.

## Giai đoạn

- S1 (@core-improve hoặc @coder): `roles` + `roles.json` + `packs.json` bản đầu, cập nhật `build-index.mjs`, test; `hub/skilllib.ts` + API đọc (`GET`), test với thư mục tạm và tên giả.
- S2 (@coder): API cài/gỡ và áp gói, test với thư mục cấu hình tạm (không đụng `~/.claude` thật).
- S3 (@frontend, sau S1+S2): giao diện tab Skill.
- Thư viện đã commit nên S1 không cần chờ ai; thứ tự chạy sau hàng đợi hiện có.

## Rủi ro

Cài skill từ nguồn bên thứ ba là chạy hướng dẫn của người lạ trong Claude của người dùng; vì vậy chỉ cài từ thư viện đã rà giấy phép, hiển thị nguồn, và không bao giờ cài khi chưa bấm. Nhiều skill làm lời nhắc dài: gói "cốt lõi" giữ nhỏ và UI cảnh báo khi một agent bật quá 15 skill (tốn token mỗi lượt).
