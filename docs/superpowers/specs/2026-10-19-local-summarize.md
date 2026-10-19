# localSummarize: tóm tắt bằng AI chạy trên máy (Ollama)

Quyết định của planner theo nghiên cứu 2026-10-19: KHÔNG nối 7B vào worker Claude Code đầy đủ; chỉ có đường "chỉ tóm tắt" (không vòng tool). Mặc định TẮT. Dữ liệu chỉ đi tới host đã cấu hình (mặc định `http://127.0.0.1:11434`, không ra khỏi máy).

- Setting `localSummarize {enabled:false, host:'http://127.0.0.1:11434', model:'qwen2.5:7b', numCtx:8192, timeoutSec:120, maxChars:24000}`; host phải là URL http(s); host không phải loopback vẫn cho phép nhưng `GET /api/local/status` báo `remote:true` để UI cảnh báo dữ liệu rời máy.
- `hub/localai.ts`: `summarize(cfg, task, text)` gọi `POST {host}/api/chat` (`stream:false`, `options.num_ctx`), lời dặn cố định của hub theo `task` (`summary` | `commit`), văn bản quá `maxChars` thì giữ đầu + cuối; trả chữ, cắt 4000 ký tự. Lỗi mạng/timeout/model thiếu → lỗi rõ, không thử lại.
- `GET /api/local/status` → `{enabled, host, model, remote, reachable, hasModel}` (thăm dò `GET /api/tags` 3 giây, chỉ khi bật).
- `POST /api/local/summarize {task, text?, file?, sessionId?}`: `file` là đường dẫn TƯƠNG ĐỐI trong thư mục của session (realpath phải nằm trong đó, ≤2 MB, không symlink ra ngoài); 409 khi tắt; kết quả `{text, model, ms, chars}`.
- MCP `local_summarize {task, file?, text?}`: agent nhờ hub đọc và tóm tắt file trong repo của nó, nhận chữ ngắn thay vì tự đọc cả file (tiết kiệm token). Chất lượng 7B: dùng cho tóm tắt/commit message, KHÔNG dùng cho pháp lý/số liệu.
- Không làm: gọi tool, ghi file, tự chọn host từ tin nhắn; không có key.
- Test: máy chủ Ollama giả (http, cổng 0): bật/tắt, cắt đầu+cuối, file ngoài thư mục bị từ chối, lỗi 404 model, timeout.
