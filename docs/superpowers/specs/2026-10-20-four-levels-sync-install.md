# Nghiên cứu: 4 level nói chuyện trong BAM, đồng bộ tab ↔ BAM, cài 1 lần

Người viết: core-improve, 20/10, theo yêu cầu trực tiếp của user. Phần còn thiếu sau spec
`2026-10-19-ide-independence-design.md` (D1–D4, D2b đã có). Chỉ nghiên cứu, chưa code. truong-phong duyệt, new-planner lên kế hoạch.

## Hiện trạng (đã xác minh trong code)

| Level | Đang chạy thế nào | Là thành viên room? |
|---|---|---|
| 1. Claude Pro (2 acc) | Tab VS Code/Antigravity + revive nền (`claude --resume -p`), agent không IDE (`hub/agents.ts`) | Có |
| 1. Copilot | `CopilotAgent` theo `agents.profiles` (#32), hết quota tháng thì đánh dấu limited (#57) | Có |
| 2. Free AI / OpenRouter | Chỉ là **công cụ** của Claude: skill `worker` chạy `claude -p --bare` với `ANTHROPIC_BASE_URL` của `providers.json` (worker.ps1:122-132) | **Không** |
| 3. Local AI (3060) | Provider tier `local` (Ollama LAN) cho worker + `local_summarize` (`hub/localai.ts`) | **Không** |
| 4. Muse | Công cụ MCP `muse_ask` qua Chrome debug (`mcp/muse*.ts`), chỉ hỏi đáp | **Không** |

Tab ↔ BAM hiện có:
- BAM → tab: tin @ được giao qua hook Stop/waiter và hiện trong tab.
- Tab → BAM: chỉ có câu trả lời của **lượt do room đánh thức**. Agent không room_send thì hub relay câu cuối (`case 'stop'`, server.ts:833).
- **Lượt user gõ trực tiếp trong tab thì BAM không thấy gì.**
- Antigravity ↔ VS Code dùng chung chat nhờ junction `projects` (D1, `bear-setup link`). Bên kia chỉ thấy khi mở lại chat, không cập nhật trực tiếp.

## (a) 4 level là thành viên ngang hàng trong room

Mở rộng `AgentProfile.provider` (settings.ts:69, hiện chỉ `'copilot'`) thành:
- `'claude-api'` + `providerId` + `model`: agent không IDE (`spawnAgent`) với env của provider (`ANTHROPIC_BASE_URL`, key, `CLAUDE_CONFIG_DIR=worker-config`), giống worker.ps1. Free, OpenRouter và Ollama LAN đều dùng đường này (khác nhau ở tier). Có waiter/revive/compact sẵn, không phải viết vòng đời mới.
- `'muse'`: responder phía hub kiểu `CopilotAgent`. Tin @ thì gọi `muse-core` rồi post câu trả lời. Không đọc repo, chạy tuần tự từng tin (1 tab Chrome).
- Ràng buộc bắt buộc:
  - Provider ngoài máy (free/paid) mặc định **chỉ đọc**, và không được gửi file bí mật (`isSecretFile`). Tier local mới được sửa file.
  - Model local mới bật edit khi #17 xác nhận `tool_use` thật.
  - Cùng loop-guard 30 lượt và `agents.maxBackground`.
  - Hết hạn mức/rate limit thì đánh dấu limited như #57.
- UI Settings: thêm loại profile vào danh sách #34 sẵn có.

## (b) Đồng bộ tab ↔ BAM

- **Gương tab → BAM:** lượt user gõ trong tab (hook `prompt` không mang tin room, rồi `stop`) được hub post vào chat riêng của agent đó (phòng DM #38), loại `mirror`, không đánh thức ai: "[tab] user: …" và "[tab] agent: …" (rút gọn như `relayText`). Có setting bật/tắt, mặc định bật cho DM.
- **BAM → tab:** giữ như hiện tại (giao qua hook).
- Giới hạn (ghi rõ cho user): **không phải 1 luồng chat chung realtime**, BAM chỉ thấy bản gương. Hai tab cùng mở 1 chat vẫn cấm. Antigravity ↔ VS Code vẫn phải mở lại chat mới thấy lượt mới, Claude Code không có API đẩy vào tab đang mở.

## (c) Cài 1 lần

Hiện cần 6–8 bước tay theo README §Install, cộng thêm `bear-setup`. Đề xuất gom vào `npm run setup` (scripts/setup.mjs), chạy lại không hỏng gì:
1. `npm ci`
2. Tìm các config dir (dùng lại `machine.mjs check`)
3. Với mỗi dir: `claude plugin marketplace add` + `install`, và thêm quyền `mcp__plugin_bear-agent-manager_room` (in diff, user xác nhận)
4. Hỏi: `link` chat 2 editor, panel VS Code (`install-vscode.mjs`), autostart hub
5. In bảng `check` cuối cùng + các bước đăng nhập còn thiếu (Claude/Copilot). **Không đọc token**, chỉ kiểm tra file tồn tại.

## Task đề xuất (cho new-planner chia nhỏ)

1. **A1:** schema `AgentProfile` thêm `claude-api` (providerId, model, perm mặc định read-only nếu tier ≠ local) + migrate/validate + test.
2. **A2:** hub chạy profile `claude-api` bằng `spawnAgent` với env provider; status/limited theo contract [34]; test với provider giả.
3. **A3:** profile `muse` (responder hub, tuần tự, lỗi Chrome/đăng nhập ⇒ state error); test với CDP giả.
4. **A4:** UI Settings: thêm/sửa 2 loại profile mới trong danh sách #34.
5. **B1:** gương tab → phòng DM (prompt+stop hook, kind `mirror`, không wake, setting) + test.
6. **B2:** UI hiện tin `mirror` khác màu, có nhãn "từ tab".
7. **C1:** `scripts/setup.mjs` + `npm run setup` + README rút gọn còn 3 dòng; smoke trên thư mục HOME giả, không đụng config thật.

Thứ tự gợi ý: B1 (user thấy ngay) → A1/A2 → C1 → A3 → A4/B2.
