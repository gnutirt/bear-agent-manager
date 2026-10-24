# Hệ thống log toàn BAM + tab Log (spec, #279)

Ngày 2026-10-24. User (DM): "nghiên cứu 1 hệ thống logs toàn bộ BAM, hiện giờ tao chưa thấy". Spec này chỉ mô tả, chưa có code.

## Hiện trạng (đếm trong `~/.bear-agent-manager` lúc 24/10)

| Nguồn | Nơi ghi | Vấn đề |
|---|---|---|
| Console của hub | `hub.log`, 31 KB: stdout/stderr của tiến trình nền (`shared/client.ts` `ensureHub`) | Văn bản tự do, không có level hay agent. Gồm 16 lệnh `console.*` trong `server.ts`, 6 trong `copilot.ts`, 2 trong `main.ts`, 2 trong `memory.ts`. Không xoay vòng. |
| Revive/wake | `revive.log` 510 KB (tổng hợp, `hub/revive.ts:28`) và 243 file `revive-<sid>-<ts>-<uuid>.log` (196 KB) | Không xoá file nào. File của từng lần chạy chứa **output thô của claude**, tức câu trả lời của agent: có thể lọt nội dung nhạy cảm. |
| Compact | 167 file `compact-<sid>-<ts>.log` | Như trên, mỗi file khoảng 124 B, không xoá. |
| Agent mới | 9 file `new-*.log` | Như trên. |
| Dòng phụ ghi vào `revive.log` | `ide <sid> <op>` (`server.ts:2316`), `guard <tên> <tool> allow/deny` (`:2664`), stderr của livechat (`livechat.ts:104`) | Ba loại sự việc khác nhau dồn vào một file tên "revive". |
| Đổi settings | `settings-changes.log` (`server.ts:471`, #254) | Một dòng văn bản, có ghi cả user-agent. |
| Tin hệ thống trong phòng | `rooms/*.jsonl` (postSys) | Đây là thứ user thấy, nhưng nó là chat, không phải log: không lọc được, và bị compact hoặc lưu trữ cùng phòng. |
| Bảng gọi tool | `hub/console.ts` `ToolConsole` | Chỉ nằm trong RAM, mất khi restart hub. |
| Hook | không có | `hooks/*.ts` nuốt lỗi (`.catch(() => {})`), nên hook hỏng thì không để lại dấu vết gì. |
| Copilot | `safeError` (`copilot.ts:156`) có che token GitHub và Bearer | Hàm che chỉ dùng riêng ở đây. |

## Thiết kế

### Định dạng (L1)
Mỗi dòng là một JSON, UTF-8:
```json
{"ts":"2026-10-24T07:01:02.345Z","level":"info","area":"wake","agent":"deepseek","sid":"bedd4f58","room":"bear-agent-manager","msg":"revive started","data":{"perm":"bypass","account":".claude-antigravity"}}
```
- `level`: `debug | info | warn | error`.
- `area`, danh sách cố định: `hub | wake | revive | compact | turn | provider | copilot | agy | browser | duck | hook | settings | ide | guard | account | task | mcp`.
- `msg` tối đa 500 ký tự. `data` tối đa 4 KB sau khi đã che secret. Phần thừa bị cắt và có cờ `"cut":true`.
- Module mới `hub/log.ts`, gồm:
  - `log(level, area, msg, ctx?)`, ghi đồng bộ bằng `appendFileSync`, cùng kiểu với `settings-changes.log`;
  - phát sự kiện `broadcast('log', entry)` cho SSE;
  - `debug` chỉ ghi khi `settings.logLevel === 'debug'`. Mặc định là `info`.

### Nơi lưu và xoay vòng (L2)
- Thư mục `~/.bear-agent-manager/logs/`, mỗi ngày một file `bam-YYYY-MM-DD.jsonl` theo giờ máy.
- Một file vượt 20 MB thì tách sang `bam-YYYY-MM-DD.2.jsonl`.
- Giữ `settings.logKeepDays` ngày, mặc định 14. Việc dọn chạy lúc hub khởi động và mỗi 6 giờ, chỉ xoá file khớp tên mẫu trong `logs/`.
- Output thô của từng lần revive, compact hay new không đưa vào log chung. Chúng chuyển vào `logs/runs/<kind>-<sid>-<ts>.log` và dùng chung hạn giữ. Dòng log chung chỉ ghi `runLog: "<tên file>"`.
- API đọc output thô (L5) luôn giải mã bằng `utf8`.
- Bốn file cũ (`revive.log`, `hub.log`, `settings-changes.log` cùng các file `revive-*`, `compact-*`, `new-*` ở thư mục gốc) được chuyển nguyên trạng một lần vào `logs/legacy/` khi lên bản mới. Sau đó không ghi thêm vào chúng, trừ `hub.log`, nơi vẫn hứng stdout của tiến trình nền để còn bắt lỗi xảy ra trước khi `log.ts` chạy.

### Che secret (L3)
- `redact(text)` dùng chung đặt trong `shared/redact.ts`, gom `safeError` của Copilot và phần che `--token` của machine export (#174). Các mẫu bị che:
  - `sk-ant-…`, `sk-or-…`, `sk-…` dài 20 ký tự trở lên;
  - `gh[pousr]_…`, `github_pat_…`;
  - `Bearer <x>`, `x-room-token: <x>`, `?token=<x>`;
  - JSON có khoá `key|token|secret|password|authorization|apiKey|oauth`, giá trị bị thay bằng `"[redacted]"`;
  - chuỗi base64 hoặc hex dài 40 ký tự trở lên nằm sau `=` hay `:`.
- `log()` luôn cho `msg` và mọi chuỗi trong `data` đi qua `redact()`, nên không có đường nào ghi log mà bỏ qua bước che.
- Đường dẫn `.credentials.json`, `.claude.json`, `providers.json` được phép xuất hiện (tên file không phải secret). Nội dung của chúng không bao giờ được đưa vào `data`.
- `settings-changes` bỏ user-agent đầy đủ, chỉ giữ `browser|vscode-webview|cli`.

### Ghi log ở đâu (L4)
| area | Sự việc | Chỗ trong code |
|---|---|---|
| wake/revive | bắt đầu, xong (mã thoát, thời gian, `runLog`), lỗi, bỏ qua (`holderOf`, usagePaused, khoá moving) | `hub/revive.ts`, `hub/wake.ts`, `server.ts` fireWake/deliver |
| turn | Stop, StopFailure (`error`), thử lại #159, mất tai (deaf) | `server.ts` hookRoute `stop`/`stop-failure`, `store.deaf` |
| compact | quyết định (block/allow, lý do), kích thước trước và sau | `server.ts` pre-compact, `hub/compact.ts`, idle job |
| provider/copilot/agy | lỗi gọi API, hết quota, chuyển profile, model sai (`unrecognized_model`) | `hub/apiagent.ts`, `hub/copilot.ts`, `hub/agy.ts` |
| browser/duck | khởi động hay tắt trình duyệt ẩn, lỗi CDP | `hub/browser.ts`, `hub/duck.ts` |
| hook | lỗi khi gọi hub từ hook | `hooks/*.ts`: thay `.catch(() => {})` bằng `POST /api/log` có giới hạn tốc độ. Nếu chính lệnh POST lỗi thì ghi vào `logs/hook-fallback.log`, file này cũng xoay vòng. |
| settings/account/guard/ide | các dòng hiện nằm ở `settings-changes.log` và `revive.log` | `server.ts:471`, `:2316`, `:2664` |
| hub | lúc khởi động, cổng bận, migrate, lỗi chưa bắt (`process.on('uncaughtException')` ghi rồi mới thoát) | `hub/main.ts` |

Tin hệ thống trong phòng vẫn giữ nguyên. Đi kèm mỗi tin như vậy là một dòng log cùng nội dung, để Log có đủ cả những gì user đã thấy trong phòng.

### API và tab Log (L5)
- `GET /api/logs?from&to&level&area&agent&sid&q&limit`:
  - đọc ngược từ file mới nhất, tối đa 1000 dòng, dừng khi đủ `limit` (mặc định 200);
  - `q` là chuỗi con, không phân biệt hoa thường, không nhận regex;
  - cần `x-room-token` như mọi API, và không bao giờ đọc `logs/runs` theo đường này.
- `GET /api/logs/run/<file>` trả một file trong `logs/runs/`:
  - tên file phải khớp `^[a-z]+-[0-9a-f-]+-[0-9TZ-]+\.log$` và không có `..`;
  - nội dung qua `redact()`, trả tối đa 256 KB phần cuối file.
- SSE: dùng luôn `/api/events`, thêm sự kiện `log`. UI tự lọc phía client, và chỉ nhận sự kiện `log` khi đang mở tab Log, để không tốn băng thông cho các tab khác.
- UI có tab "Log":
  - bộ lọc: level (chọn nhiều), area (chọn nhiều), agent (danh sách phiên), ô tìm chữ, khoảng thời gian (1 giờ / hôm nay / 7 ngày);
  - nút "Trực tiếp" bật hoặc tắt SSE, và tạm dừng cuộn khi người dùng kéo lên;
  - bấm vào một dòng để xem `data` dạng JSON; có `runLog` thì mở được output thô;
  - màu theo level; chuỗi tiếng Việt và tiếng Anh nằm trong `shared/i18n`;
  - bấm tên agent ở tab Agent/Luồng thì mở Log đã lọc sẵn theo agent đó.

## Việc giao coder

| # | Việc | File | Test |
|---|---|---|---|
| T1 | `shared/redact.ts` + `hub/log.ts` (định dạng, xoay vòng, dọn file, giới hạn cỡ, level) + chuyển log cũ vào `logs/legacy/` | mới, `hub/main.ts` | redact che đủ các mẫu ở L3, chuỗi thường giữ nguyên. File chuyển sang ngày mới thì tách đúng. Vượt 20 MB thì sinh `.2`. Dọn chỉ xoá file đúng mẫu tên và quá hạn. `msg` dài thì có `cut`. Một token đặt trong `data` lồng sâu cũng bị che. |
| T2 | Gắn `log()` vào wake/revive/turn/compact/settings/guard/ide; chuyển output thô sang `logs/runs/`; bỏ ghi vào `revive.log` | `hub/revive.ts`, `hub/wake.ts`, `hub/server.ts`, `hub/livechat.ts`, `hub/compact.ts` | Một lần revive giả sinh 2 dòng (start, exit) có `runLog`. StopFailure `server_error` sinh dòng `turn` level `warn`. Không còn file `revive-*` nào ở thư mục gốc. |
| T3 | Gắn `log()` vào provider/copilot/agy/browser/duck + `POST /api/log` cho hook, có giới hạn tốc độ và fallback | `hub/apiagent.ts`, `hub/copilot.ts`, `hub/agy.ts`, `hub/browser.ts`, `hub/duck.ts`, `hooks/*.ts` | `copilot` dùng `redact` chung thay cho `safeError` riêng. Hook gặp lỗi khi hub tắt thì ghi vào fallback. Gửi 100 dòng mỗi giây thì 429 sau dòng thứ 30. |
| T4 | `GET /api/logs`, `GET /api/logs/run/<file>`, sự kiện SSE `log` | `hub/server.ts` | Lọc đúng level/area/agent/q. Tên file `../state.json` trả 400. Không token thì 401. Kết quả trả về đã được che secret. |
| T5 | Tab Log trong UI + i18n | `ui/index.html`, `shared/i18n/*` | `ui.test`: tab mount, bộ lọc gọi đúng query, SSE chỉ nhận khi tab đang mở. Chụp ảnh ở 1440 và 390 để frontend kiểm. |

Thứ tự: T1 → (T2 ∥ T3) → T4 → T5.

## Rủi ro

- Log ghi đồng bộ trên luồng của hub: 1 dòng mất dưới 1 ms, nhưng hook gửi dồn dập có thể nghẽn, nên có giới hạn tốc độ ở T3. Nếu sau này đo thấy chậm thì đổi sang ghi gom mỗi 200 ms.
- Che secret theo mẫu không bắt được mọi dạng secret. Phòng thêm bằng cách không bao giờ đưa nội dung file cấu hình hay đăng nhập vào `data`, và output thô của claude chỉ đọc qua đường `run` có `redact()`.
- Output thô của agent có thể chứa nội dung riêng. Nó chỉ nằm trên máy này, xoá sau `logKeepDays`, và không gửi ra ngoài (Duck, worker, Muse).
