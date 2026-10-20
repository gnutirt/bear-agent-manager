# BAM: nghiên cứu kiến trúc "mọi AI nói chuyện với nhau + BAM như IDE"

Ngày 2026-10-20. Chỉ nghiên cứu, chưa sửa code. Dựa trên code `hub/*.ts` và các spec trong `docs/superpowers/specs/`
(`four-levels-sync-install`, `bam-standalone-app`, `ide-independence-design`, `bam-as-ide-gap-analysis`).

## 0. Quyết định đã chốt (20/10)

- **Muse: giữ nguyên trong repo**, để tính sau. Hiện chưa đưa vào luồng chính; không xoá, không đổi hành vi và không để ảnh hưởng hệ thống.
- **Copilot: 1 tài khoản** (profile `copilot`, hub chạy SDK riêng, không cần VS Code).
- **Copilot hết quota: dừng Copilot**, không fallback sang provider khác. Ưu tiên Claude cho công việc chính.
- **Claude account là lựa chọn credential, không phải lựa chọn session.** Đổi account A↔B trong cùng một luồng làm việc thì tiếp tục đúng chat session hiện tại. Tuy nhiên, Claude do BAM spawn có session riêng; VS Code/Antigravity không nhìn thấy session đó. Session này vẫn có chức năng tương đương Claude chạy trong IDE.
- Local AI (3060): để pending, nhưng đường kỹ thuật đã sẵn (xem §2).
- Antigravity và VS Code: mỗi lúc chỉ mở 1 cái.

=> Luồng AI chính gồm: (1) Claude Pro + Copilot, (2) Free AI/OpenRouter, (3) Local AI. Muse vẫn còn trong repo nhưng nằm ngoài luồng chính hiện tại.

## 1. Hiện trạng (đã xác minh trong code)

| Nhu cầu | Trạng thái | Nằm ở đâu |
|---|---|---|
| Claude trong tab VS Code/Antigravity làm member room | Có | hooks + MCP `room_*` |
| Claude 2 acc (config dir khác nhau) | Có, hook ghi config dir của từng session | `hub/accounts.ts` |
| Antigravity ↔ VS Code chung chat | Có (junction `projects`, `bear-setup link`); bên kia chỉ thấy khi mở lại chat | `scripts/setup.mjs --link` |
| BAM → tab: tin @ | Có (Stop waiter, revive nền) | `hub/wake.ts`, `revive.ts` |
| Tab → BAM: gương lượt user gõ trong tab | Có (B1, kind `mirror`, UI có nhãn) | `hub/mirror.ts` |
| Claude chạy không IDE | Có (`claude -p --session-id`, waiter giữ sống); session do BAM spawn là riêng, IDE không nhìn thấy nhưng chức năng tương đương | `hub/agents.ts` |
| Chat trực tiếp realtime trong BAM + hộp hỏi quyền | Có (stream-json 1 process/session) | `hub/livechat.ts`, `mcp/perm*.ts` |
| Tự chuyển acc Claude A→B khi hết quota mà giữ nguyên chat session | Có xử lý chuyển account, cần xác minh session được giữ xuyên suốt các entry point | `hub/accountswitch.ts` |
| Copilot không cần VS Code | Có, 1 phiên SDK trong room `#bear-agent-manager`; hết quota → `limited` và dừng | `hub/copilot.ts` |
| Level 2 (Free/OpenRouter) là member room | Có: profile `claude-api` + `providerId` | `hub/apiagent.ts`, `settings.ts:72` |
| Level 3 (Ollama 3060) là member room | Có qua cùng `claude-api` (tier local, được sửa file nếu `edit:true`) | `hub/localai.ts` |
| BAM tự add folder, app window, không IDE | Có: tạo agent trong folder, chọn folder, `--app` shortcut, hub autostart | `hub/agents.ts`, `appshell.ts` |
| Setup 1 lần | Có: `npm run setup` | `scripts/setup.mjs` |

Kết luận: **~80% đã chạy**. Việc còn lại là khoảng trống bên dưới, không phải viết lại kiến trúc.

## 2. Mô hình thống nhất (giữ nguyên, chỉ nêu rõ)

```
              ┌──────────────── hub (Node, 127.0.0.1:7788) ─────────────────┐
 UI/app-mode ─┤ rooms · members · cursors · wake · loop guard · SSE · perms  │
              └───────▲───────────▲─────────────▲──────────────▲─────────────┘
                      │hooks/MCP  │spawn        │SDK           │spawn + env provider
          Claude tab (VSC/AGY)  Claude BAM session  Copilot      claude-api (Free/OpenRouter/Ollama)
```

Nguyên tắc: **mọi agent là "member" của hub** bất kể nguồn; hub là nguồn sự thật của room. Chat session Claude do BAM spawn
là session riêng, không đồng bộ/hiện ra trong IDE; chat Claude trong IDE vẫn thuộc session của IDE. Antigravity và VS Code
có thể dùng chung session IDE qua `projects/`. Dù session khác nhau, các agent vẫn giao tiếp với nhau qua room của hub.

## 3. Khoảng trống còn lại (đề xuất làm)

1. **Realtime tab → BAM còn là gương, không phải luồng chung.** Claude Code không có API đẩy vào tab đang mở.
   Chat mở *trong BAM* thì realtime thật (livechat). Đây là giới hạn của Claude Code, không giải được; chỉ giảm bằng:
   - nút "Mở trong BAM" thay vì tab khi user muốn realtime, tự dừng livechat khi tab lên (đã có `tabCameUp`).
2. **Antigravity ↔ VS Code cùng 1 chat:** mỗi lúc chỉ 1 editor (đã chốt) → rủi ro 2 process ghi cùng JSONL
   giảm về 0. Cần: BAM phát hiện "editor kia còn giữ session" trước khi spawn/revive (kiểm tra process/IDE badge). Cần kiểm chứng.
3. **2 acc Claude nhưng session không đổi:** account chỉ xác định credential/model đang chạy; chuyển A↔B phải giữ session ID và transcript hiện tại trong cùng luồng. Không yêu cầu session BAM phải hiện ra trong IDE hoặc ngược lại: BAM-spawned Claude và Claude chạy trong IDE là hai session riêng, nhưng đều có chức năng tương đương và cùng tham gia room. Cần kiểm chứng account switching không làm reset session ở từng entry point.
4. **Copilot hết quota:** không fallback. Giữ trạng thái `limited`/dừng Copilot và để Claude là lựa chọn chính cho công việc tiếp tục.
5. **Level 2/3 an toàn:** provider ngoài máy mặc định chỉ đọc, chặn `isSecretFile`; local chỉ sửa file khi xác nhận `tool_use` thật
   (todo #17). Cần chạy thử thật Ollama/3060 với `claude --bare` trước khi bật `edit:true`.
6. **BAM như IDE** (theo `bam-standalone-app` S4–S6, chưa xong): cây file + xem file + diff (chỉ đọc) → commit đúng file → Monaco offline.
   Terminal hoãn (node-pty cần build tools).
7. **Cài đặt 1 lần:** `npm run setup` đã có; còn thiếu bước kiểm tra/cài *Ollama + model* (tuỳ chọn) và in bảng "còn thiếu đăng nhập gì".
   Core không có npm dependency; chỉ `@github/copilot-sdk` cần `npm install` 1 lần.
8. **Muse:** giữ nguyên code và cấu hình hiện tại; không đưa vào luồng mặc định. Chỉ xem xét tích hợp sau, bảo đảm không ảnh hưởng các luồng AI chính.

## 4. Thứ tự đề xuất

1. (2) Chặn đụng độ editor/BAM + test — rủi ro mất chat cao nhất.
2. (3) Kiểm chứng và bảo đảm chuyển Claude account A↔B mà không đổi session/transcript, từ BAM lẫn editor.
3. (4) Giữ Copilot `limited` khi hết quota; không kích hoạt fallback.
4. (5) Thử Ollama thật, rồi mới bật edit.
5. (6) File browser + diff (S5), commit (S6).
6. (7) Bổ sung kiểm tra Ollama/model vào setup; Muse để nguyên, chưa tích hợp thêm.

## 5. Rào cản phải nói thẳng

- Không có luồng chat realtime chung giữa tab editor và BAM (giới hạn Claude Code).
- Một chat chỉ sống ở một nơi tại một thời điểm: BAM *hoặc* editor.
- Đăng nhập Claude/Copilot vẫn làm tay (OAuth); BAM không đọc/copy token.
- Chuyển acc Claude tự động có thể vi phạm điều khoản nếu dùng để né giới hạn; chỉ làm khi acc thứ hai thuộc chính user và còn hạn mức.
- Monaco trong BAM chỉ là trình sửa file, không thay extension/debugger của VS Code.

## 5b. Nghiên cứu thêm của truong-phong (20/10, đọc code + máy thật)

- **Claude do BAM spawn** (`hub/agents.ts`, livechat) có session riêng. VS Code và Antigravity không thấy session này trong danh sách chat, nhưng nó có đủ chức năng: vẫn là member room, vẫn nói chuyện với các agent khác qua hub. Đây là thiết kế, không phải lỗi. UI cần ghi rõ "chạy trong BAM" để user không đi tìm nó trong IDE.
- **Chuyển acc A↔B giữ session:**
  - Đã đúng cho agent chạy nền. `switchSession` (`hub/server.ts:586-590`) và nhánh tự chuyển khi đánh thức (`:867-876`) chỉ đổi `configDir` rồi revive `--resume` **cùng session id**.
  - Transcript vẫn chung vì `~/.claude-antigravity/projects` là junction trỏ vào `~/.claude/projects` (đã kiểm tra trên máy).
  - `pickAccount` từ chối khi hai acc không dùng chung `projects` (`reason: not-shared`). Tức là trên máy chưa link thì không chuyển được acc.
- **Khoảng trống phát hiện thêm:**
  1. Ngoài `projects/`, config dir còn chứa các thư mục theo session, như `file-history/` (checkpoint/rewind) và `todos/`. Sang acc B thì mất lịch sử rewind và todo của lượt trước. Cần kiểm chứng rồi link hoặc copy các thư mục theo session đó khi chuyển.
  2. Tab IDE đang mở thì hub không đổi được acc, vì acc của tab do editor đặt. Hiện chỉ có cách đóng tab rồi revive nền trên acc B. Cần ghi rõ cho user và hiện nút "chạy tiếp trong BAM".
  3. Máy chưa link (`not-shared`): `npm run setup` cần bật share mặc định khi phát hiện từ 2 acc trở lên. Hiện chỉ có nút ở route `:1614`.
- **Bug liên quan đã/đang sửa:** #88 gương câu trả lời tab (6d81c32, xong). #89 ngưỡng usage chặn thật và hồi sinh mọi tab sau reset (Copilot đang làm).

## 6. Quyết định đã chốt

- Đã chốt: giữ Muse nguyên trạng, không ảnh hưởng hệ thống.
- Đã chốt: Copilot hết quota thì dừng, không fallback; Claude là lựa chọn chính.
- Đã chốt: chuyển Claude account không được làm thay đổi chat session.
