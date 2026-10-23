# Cài đặt BAM: tổ chức lại (spec, core-improve 23/10)

User 23/10: "mục setting đang rất rối do có nhiều tính năng và giải thích chưa rõ; cần kế hoạch tổ chức, hệ thống, nhất là quản lý agent, tài khoản agent".

## 1. Hiện trạng (đo trên ui/index.html ^HEAD)

Cài đặt có 11 tab con: Chung · Worker · Trưởng phòng · Quyền · Compact · Dữ liệu & sao lưu · Bộ nhớ · Nhà cung cấp · Tài khoản · Sức khoẻ · Máy mới. Ngoài ra còn tab Skill ở thanh trên cùng.

### 1.1 Cài đặt của MỘT agent nằm ở 7 chỗ

| Thuộc tính của agent | Đang ở đâu |
|---|---|
| Tạo/bật/tắt (Copilot, claude-api, agy) | Cài đặt > Tài khoản > "Agent chạy nền đã tạo" |
| Tạo agent claude nền | Cài đặt > Tài khoản > "Tạo agent nền" (khối khác với dòng trên) |
| Model | Panel thành viên trong phòng (`agentModel`) |
| Quyền | Cài đặt > Quyền (`permissions.perAgent`) + Worker > "Agent dùng API" (`apiAgents.allTools`) + Compact (`reviveTools`) |
| Compact | Cài đặt > Compact (`agentCompact`) |
| Skill | Tab Skill ở thanh trên cùng (`agentSkills`) |
| Tầng (Flow) | Tab Flow (`flowTiers`) |
| MCP riêng | Cài đặt > Tài khoản > MCP server (tham số agent) |
| Lead dự phòng | Cài đặt > Trưởng phòng: ô gõ tên tự do (`lead.fallback`) |

Muốn biết "deepseek đang được làm gì, bằng quyền nào, model gì" thì phải mở 5 nơi.

### 1.2 Tab ghép lẫn khái niệm
- **Tài khoản** chứa 8 khối không cùng loại:
  - tài khoản Claude
  - tự đổi tài khoản
  - dùng chung chat giữa IDE
  - tạo agent nền
  - Copilot/claude-api/agy
  - Kết nối MCP
  - MCP server
  - tự chạy khi đăng nhập Windows
- **Worker** chứa:
  - worker/osin
  - quyền agent API
  - trình duyệt cho agent
  - phân việc
  - Ollama
- **Nhà cung cấp** có tiêu đề "Nhà cung cấp worker", nhưng agent claude-api cũng lấy provider từ đây (server.ts:750). User không biết khoá deepseek của agent nằm ở đây.
- **Trưởng phòng** chứa cả "Hub tự chạy osin" (autoJobs).

### 1.3 Chữ
- Cùng chữ "agent nền" cho 2 thứ khác nhau: `ac.agent` (claude nền) và `ac.copilot` (Copilot, claude-api, agy).
- Hint giải thích cách cài đặt chứ không nói hậu quả, và lộ chữ nội bộ: `--bare`, T18b, "tiến trình hub tự chạy", "lượt worker".
- Hint dài 2–4 câu (perm.note, compact.note, route.note).
- Quyền nằm ở 3 nơi, ý nghĩa chồng nhau: `permissions`, `apiAgents.allTools`, `reviveTools`. User không đoán được cái nào thắng.

## 2. Nguyên tắc

1. **Mỗi cài đặt có đúng một nhà.** Nơi khác chỉ hiện liên kết "Sửa ở …", không có ô sửa thứ hai.
2. **Đi từ đối tượng, không từ cơ chế.** User nghĩ theo "agent X", "tài khoản Y", "phòng Z", không nghĩ "compact", "worker route".
3. **Nhãn là hậu quả.** Ví dụ "Agent được chạy lệnh (Bash)", không viết "allTools".
   - Hint tối đa 1 câu.
   - Phần kỹ thuật để trong "Chi tiết ▸".
4. **Hiện mặc định và chỗ đã đổi.**
   - Giá trị khác mặc định có chấm "đã đổi" và nút "về mặc định".
   - Giá trị theo agent ghi "theo mặc định chung" hoặc "riêng cho agent này".
5. **Tìm được.** Ô tìm trên đầu Cài đặt lọc theo nhãn, hint và key. Mọi mục có liên kết sâu `#settings/<nhóm>/<mục>`.

## 3. Cấu trúc mới: 6 nhóm

| Nhóm | Chứa (nguồn cũ) |
|---|---|
| **1. Tổng quan** | Sức khoẻ, Máy mới (wizard), nút khởi động lại hub, cập nhật. Thẻ trạng thái: số agent chạy / tối đa, tài khoản sắp hết hạn mức, trình duyệt, duck |
| **2. Agent** ★ | Bảng tất cả agent + trang chi tiết từng agent (xem §4). Mặc định chung cho agent: số agent nền tối đa, quyền mặc định, tự gọi dậy, mở tab khi gọi dậy, đóng tab kẹt hạn mức |
| **3. Tài khoản & nhà cung cấp** | Nơi agent lấy "sức chạy": tài khoản Claude, tự đổi tài khoản, dùng chung chat; đăng nhập Copilot; nhà cung cấp API (bỏ chữ "worker"); agy (đăng nhập, cài); Duck2api. Mỗi thẻ ghi "đang dùng bởi: deepseek, deep-seek02" |
| **4. Phòng & điều phối** | Trưởng phòng, việc của trưởng phòng, theo dõi KPI, lead dự phòng (dropdown thành viên, bỏ ô gõ tên), tầng Flow (bảng sửa), cách agent nói chuyện (BAMshort), osin tự chạy (autoJobs) |
| **5. Công cụ & tiết kiệm** | Worker/osin + phân việc + Ollama; trình duyệt cho agent; MCP (Kết nối MCP + MCP server); Bộ nhớ (Duck/Muse); compact theo ngưỡng chung |
| **6. Hệ thống** | Ngôn ngữ, dữ liệu & sao lưu, xuất sang máy mới, tự chạy khi đăng nhập Windows |

Tab Skill trên cùng giữ nguyên thư viện skill, còn bảng "skill theo agent" chuyển vào trang agent (§4).

## 4. Trang Agent (trọng tâm)

### 4.1 Bảng agent
Một dòng cho mỗi agent, mọi loại chung một bảng:

| Tên | Loại | Chạy bằng | Model | Tầng | Trạng thái | Bật |
|---|---|---|---|---|---|---|
| truong-phong | Tab VS Code | Claude: nguyenduong… | opus | T2 ★ | đang làm | — |
| deepseek | Agent API | deepseek (provider) | deepseek-v4 | T5 | tạm dừng tới 17:54 | ☑ |
| Copilot | Copilot | GitHub Copilot | gpt-5 | T5 | rảnh | ☑ |

Lọc theo loại, phòng, trạng thái. Nút **+ Agent** mở wizard 3 bước:
1. Chọn loại, mỗi loại có 1 câu khi nào dùng: Claude nền / Agent API / Copilot / Antigravity / Duck.
2. Chọn thứ cho nó sức chạy: tài khoản hoặc provider; thiếu thì có link sang nhóm 3.
3. Chọn thư mục, phòng, tầng.

### 4.2 Trang chi tiết agent (drawer, liên kết sâu `#settings/agent/<tên>`)

| Mục | Gom từ |
|---|---|
| Cơ bản | tên, loại, thư mục, phòng, tầng (flowTiers), trưởng phòng của phòng nào |
| Chạy bằng | tài khoản Claude / provider / Copilot / agy, model (agentModel), giới hạn chi phí nếu có |
| Quyền | 1 khối duy nhất: chế độ + được phép + bị cấm. Gộp permissions.perAgent + reviveTools; với agent API ghi rõ "đang theo công tắc chung: dùng toàn bộ tool" |
| Skill | bảng skill theo agent (agentSkills) |
| Ngữ cảnh | compact theo agent (agentCompact), ngưỡng, wakeCompact |
| Công cụ | MCP riêng (extraForAgent), trình duyệt bật/tắt cho agent này |
| Hoạt động | hạn mức, lần gọi dậy gần nhất, task đang làm (đọc từ dữ liệu có sẵn) |

Panel thành viên trong phòng giữ phần xem nhanh và có nút "Cài đặt agent ▸" mở đúng drawer này. Ô model ở đó thôi sửa trực tiếp, theo nguyên tắc 1.

## 5. Bảng thuật ngữ (dùng thống nhất ở UI, i18n vi/en)

| Chữ | Nghĩa (1 câu, hiện trong wizard và hint) |
|---|---|
| Tab IDE | Chat Claude Code bạn mở trong VS Code/Antigravity; bạn thấy và gõ được |
| Agent Claude nền | Claude do hub chạy ngầm bằng tài khoản Claude của bạn, không có tab |
| Agent API | Claude Code chạy trên model của nhà cung cấp khác (deepseek, openrouter, Ollama) |
| Copilot / Antigravity | Agent dùng tài khoản GitHub Copilot / Google Antigravity của bạn |
| Duck | Trợ lý chat nhanh, không dùng tool, qua duck2api |
| Worker / osin | Lượt việc vặt (đọc, tóm tắt / dọn dẹp) chạy trên model rẻ thay cho tài khoản chính |
| Nhà cung cấp | Nơi có model + khoá API; agent API và worker đều lấy từ đây |

## 6. Kế hoạch triển khai (cho T4 chia)

Mỗi bước để app chạy được và test xanh. Bước 1–3 **không đổi schema settings.json**: chỉ đổi UI, key giữ nguyên, settings cũ đọc được.

| # | Việc | File | Xong khi |
|---|---|---|---|
| S1 | **Sổ đăng ký cài đặt**: một bảng JS mô tả mọi cài đặt `{key, group, label, hint, detail, type, default, min, max}`; sw()/num() render từ bảng; ô tìm kiếm + liên kết sâu + chấm "đã đổi" | ui/index.html, ui.test | test: mọi `data-set` trong UI có trong sổ và ngược lại; mỗi key render đúng 1 lần |
| S2 | **6 nhóm mới**: chuyển các khối có sẵn sang nhóm theo §3 (không sửa logic); `S.setSub` cũ chuyển hướng sang nhóm mới | ui/index.html | ảnh 1440/390 do frontend duyệt; không còn tab con nào chứa trên 5 khối |
| S3 | **Bảng agent + drawer** (§4): gom các editor theo agent có sẵn (model, quyền, compact, skill, tầng, MCP) vào drawer; nơi cũ đổi thành liên kết | ui/index.html, ui.test | sửa được model, quyền, compact, skill, tầng của 1 agent ở đúng 1 chỗ |
| S4 | **+ Agent**: từ ^e0e5912 đã có hộp thoại chung `openAgentDialog` (Tài khoản không còn 3 form). Bảng agent và drawer **dùng lại** hộp thoại này, không làm form mới; chỉ thêm bước 2 "chạy bằng" (link sang nhóm 3 khi thiếu tài khoản/provider) và loại Duck khi D4 xong | ui/index.html | mọi nút "thêm agent" đều gọi `openAgentDialog` |
| S5 | **Viết lại chữ** vi/en theo §5 và nguyên tắc 3: hint ≤ 1 câu; phần kỹ thuật chuyển vào "Chi tiết" | shared/i18n/*.ts, dict-keys test | không hint nào hơn 160 ký tự; không còn chữ `--bare`, `T18`, `allTools` trong nhãn/hint |
| S6 | (tuỳ chọn, sau) **Gộp quyền ở server**: `reviveTools` thành một phần của `permissions.perAgent`; đọc key cũ để tương thích | hub/settings.ts, test | settings cũ chuyển đổi đúng; 1 nguồn quyền |

Phân vai theo note [85]: frontend audit ảnh S2–S4, core-improve audit S1/S3/S6. Coder: Copilot (UI lớn) hoặc deep-seek02.

## 7. Ngoài phạm vi
- Không đổi hành vi bất kỳ tính năng nào.
- Không thêm cài đặt mới.
- Không xoá key settings.
- Duck UI (D4–D6) đi theo kế hoạch Duck, nhưng đặt vào nhóm theo §3: Duck2api → nhóm 3, Bộ nhớ → nhóm 5.
