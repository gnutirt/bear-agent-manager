# Kế hoạch từ research v2 (20/10)

Nguồn: `docs/superpowers/specs/2026-10-20-four-levels-research-v2.md` (commit `27e0eab`), §0/§3/§4/§5b.

## Ràng buộc (đã chốt, không đổi)

- Muse giữ nguyên trong repo, không đụng, không ảnh hưởng luồng chính.
- Copilot hết quota → dừng, không fallback sang provider khác.
- Chuyển account Claude A↔B không được đổi session ID/transcript.
- Mỗi người một việc tại một thời điểm.
- Việc nào trùng task đang chạy (#68, #69, #79, #89) thì dùng lại số đó, không tạo task mới.

## TODO (tính năng)

| # | Việc | File chính | Người đề xuất | Điều kiện xong | Thứ tự |
|---|---|---|---|---|---|
| T1 | Nút "Mở trong BAM" trên tab đang mở (thay vì gõ trong tab) để có realtime thật; tận dụng `tabCameUp` đã có để tự dừng livechat khi tab lên | `ui/index.html`, `hub/livechat.ts` | frontend | Nút hiện khi tab đang mở, bấm mở livechat trong BAM; tab lên lại thì livechat tự dừng, không trùng tin; test | 9 |
| T2 | UX rõ ràng khi tab IDE đang mở thì không đổi được acc (acc do editor đặt) + nút "chạy tiếp trong BAM" trên acc đích | `ui/index.html`, `hub/server.ts` (switch messaging) | frontend | User thấy thông báo đúng lý do; nút "chạy tiếp trong BAM" hoạt động; test | 10 |
| T3 | Chạy thử thật Ollama/3060 qua `claude --bare` trước khi bật `edit:true` cho Level 3 | `hub/localai.ts` | Coder_No_2 (sau #68) | Chạy thử thật trên máy LAN, log kết quả; chỉ bật `edit:true` sau khi xác nhận chặn `isSecretFile` + chỉ sửa khi có `tool_use` thật | 6 |
| T4 | Setup: thêm bước kiểm tra/cài Ollama + model (tuỳ chọn) và in bảng "còn thiếu đăng nhập gì" | `scripts/setup.mjs` | core-improve (sau B2/B3) | `npm run setup` in trạng thái Ollama + danh sách đăng nhập còn thiếu; smoke test HOME giả | 11 |
| — | S5: cây file + xem + diff chỉ đọc trong BAM | `hub/files.ts`, `ui/index.html` | Coder_No_2 — **#68** (đang làm) | xem task #68 | 5 |
| — | S6: Monaco offline + lưu file + commit đúng file | `ui/index.html` | frontend — **#69** (blocked chờ #68) | xem task #69 | 8 |
| — | Compact rule: ngưỡng 100k + `compact.onTaskDone` | `hub/server.ts` | core-improve — **#79** (đang làm) | xem task #79 | 4 |
| — | Ngưỡng usage chặn thật + tự hồi sinh tab sau reset | `hub/server.ts`, `hub/wake.ts` | Copilot — **#89** (đang làm) | xem task #89 | 3 |

Terminal (node-pty, cần build tools native Windows): **hoãn**, theo quyết định user — không đưa vào bảng.
Muse: giữ nguyên, không đưa vào bảng.

## TODOBUG (lỗi đã thấy)

| # | Lỗi | File chính | Người đề xuất | Điều kiện xong | Thứ tự |
|---|---|---|---|---|---|
| B1 | Chuỗi `sys.usage.near` hứa "tạm dừng giao việc mới" nhưng ngưỡng 90%/80% chỉ cảnh báo, không chặn thật | `shared/i18n/vi.ts`, `shared/i18n/en.ts`, `hub/server.ts` | Copilot — **#89** (đang làm, theo báo cáo #86) | xem task #89 | 3 |
| B2 | Chuyển acc Claude A→B mất `file-history/` (rewind) và `todos/` của session đang chạy — `pickAccount` (`hub/accountswitch.ts:16-27`) chỉ kiểm tra `projects/` dùng chung, không xử lý 2 thư mục này | `hub/accountswitch.ts`, `scripts/machine.mjs` | core-improve (sau #79) | Chuyển acc giữ nguyên rewind history + todo list của session đang chạy; thêm case trong `test/accountswitch.test.ts` | 2 |
| B3 | `npm run setup` không tự bật share (`--link`) khi máy có ≥2 Claude account — hiện chỉ hỏi qua route `:1614`, máy `not-shared` thì không chuyển acc được | `scripts/setup.mjs` | core-improve (sau B2) | Setup phát hiện ≥2 acc chưa link → tự hỏi bật link (giữ `--yes`/`--dry-run`); smoke test HOME giả | 7 |
| B4 | Chưa chặn 2 editor (Antigravity + VS Code) cùng giữ/ghi một session — rủi ro 2 process ghi cùng JSONL nếu cả hai cùng spawn/revive | `hub/server.ts` (spawn/revive paths), `hub/accounts.ts` | coder | Trước khi spawn/revive, hub phát hiện editor kia còn giữ session (process/IDE badge) và chặn/cảnh báo thay vì chạy song song; test mô phỏng 2 editor cùng 1 session | 1 |

## Thứ tự tổng hợp

1. B4 — chặn 2 editor cùng ghi 1 chat (rủi ro mất chat cao nhất, coder)
2. B2 — giữ file-history/todos khi chuyển acc (core-improve)
3. #89 — ngưỡng usage chặn thật + B1 chuỗi sai (Copilot, đang làm)
4. #79 — compact rule 100k (core-improve, đang làm)
5. #68 — S5 file tree/diff (Coder_No_2, đang làm)
6. T3 — thử Ollama thật trước khi bật edit (Coder_No_2, sau #68)
7. B3 — setup tự bật share (core-improve, sau B2)
8. #69 — S6 Monaco+commit (frontend, blocked chờ #68)
9. T1 — nút "Mở trong BAM" (frontend, có thể làm song song trong lúc #69 blocked)
10. T2 — UX chuyển acc khi tab mở (frontend)
11. T4 — setup thêm Ollama check + bảng thiếu đăng nhập (core-improve)

## Việc đầu tiên mỗi người (để lead tạo task)

- **coder** (đang idle) → B4
- **core-improve** (đang #79) → B2, kế tiếp sau #79
- **Coder_No_2** (đang #68) → T3, kế tiếp sau #68
- **frontend** (đang blocked #69) → T1 ngay (không phụ thuộc #68), #69 tiếp tục chờ, rồi T2
- **Copilot** (đang #89) → giữ nguyên #89 (đã gồm B1)
- **thu-vien-skill** (idle) → chưa gán, lead cân nhắc nếu cần thêm việc

Toàn bộ bảng trên đã xong (xem room_tasks #92-#99); plan này giữ lại làm lịch sử.

## Cập nhật 21/10 — vòng nghiên cứu sau #108 (lead duyệt, note [57])

| # | Việc | File chính | Owner | Điều kiện xong |
|---|---|---|---|---|
| — | Checklist bắt buộc khi thêm provider trả phí/ngoài máy | `docs/live-chat-api-agents-tasks.md` | deepseek — **#109** (xong, f4dcfaf) | xem task #109 |
| — | Đếm lượt gọi / chi phí provider trả phí (DeepSeek…) | `hub/providers.ts`, `ui/index.html` | deepseek — sau #109 | Settings hiện số lượt gọi/chi phí ước tính theo profile trả phí; test |
| — | Helper test tái hiện "ngoài cwd phải bị từ chối" cho profile ngoài máy | `test/helpers.ts`, `test/apiagent.test.ts` | Copilot — **#110** | xem task #110 |
| — | Nhật ký quyết định guard hiện trong Console UI | `hub/server.ts`, `hub/console.ts` | Copilot — sau #110 | Một lượt guard allow/deny của profile ngoài máy hiện trong Console của session đó; test |

## Cập nhật 21/10 — nhịp làm việc (spec `docs/superpowers/specs/2026-10-21-workflow-rhythm.md`, 15c8847, lead duyệt cả 6 ý)

Chỗ nghẽn đã thấy: commit cuốn/revert nhầm (6 lần), chỉ lead tạo được task nên mỗi việc bị đánh thức hai lần (planner @ rồi lead tạo task), deepseek không Bash nên luôn chờ người khác commit, agent post "đã nhận/chờ việc" làm tốn hạn mức, tab IDE hết hạn mức "điếc".

| # | Việc | File chính | Owner | Điều kiện xong |
|---|---|---|---|---|
| (1) | Công cụ MCP `room_commit {paths, message}`: hub tự `read-tree HEAD` + add đúng paths + test liên quan (tuỳ chọn) + commit + soát mọi dòng "-" phải nằm trong paths đó (huỷ + báo lỗi nếu không); dùng lại `commitPaths` (`hub/filewrite.ts:64`). Đường commit duy nhất, deepseek commit được mà không cần Bash. | `mcp/tools.ts`, `hub/server.ts`, `hub/filewrite.ts` | Copilot (sau #110) | Agent gọi `room_commit` thành công khi path sạch; bị huỷ + báo lỗi rõ khi có dòng "-" ngoài paths; test |
| (2) | Vai planner được tạo task: mở `room_tasks add` cho new-planner bên cạnh lead (hiện chỉ lead, chặn ở `hub/server.ts:2090-2102`). Việc xong vẫn gọi lead audit (Q2 #74). | `hub/server.ts`, `mcp/tools.ts` | deepseek, Copilot commit | new-planner gọi `room_tasks add` tạo được task (403 vẫn áp dụng cho người khác không phải lead/planner); test |
| (3) | Lọc tin không cần thiết: tin không có @ và ngắn hơn ~80 ký tự kiểu xác nhận ("đã nhận", "chờ việc", "không có việc") thì giữ lại hiện trong UI nhưng không giao/không đánh thức ai; `@all` từ agent chỉ dùng khi có cờ xác nhận rõ ràng (không phải mặc định). | `hub/server.ts` (đường giao tin/wake), `hub/store.ts` | deepseek, Copilot commit | Tin ngắn không @ không đánh thức ai nhưng vẫn hiện trong room_read; `@all` của agent bị chặn trừ khi có cờ; test |

(4) và (5) là quy tắc vận hành, không phải code — lead ghi note ngay: audit theo lô (2-3 việc hoặc 20 phút), 1 restart hub/lô; mỗi task ghi `files:` là vùng file của mình, hai task đang làm không đụng cùng file. (6) chat gọn: core-improve làm tiếp ở #113(b).
