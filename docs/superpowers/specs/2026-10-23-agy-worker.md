# Spec: agy (Antigravity CLI) làm công nhân trong BAM

User 23/10: "nghiên cứu agy (antigravity CLI) nhét nó làm công nhân luôn". Nghiên cứu: function-research.

## Đã kiểm trên máy (agy 1.3.5, `%LOCALAPPDATA%\agy\bin\agy.exe`)
- Đã đăng nhập: `agy models` trả về danh sách gồm `gemini-4-argon-{low,medium,high}`, `gemini-3.8-flash-{low,medium,high}`, `claude-opus-5-5-*`, `claude-sonnet-5-5-*`, `gpt-oss-120b-medium`. Tất cả chạy trên quota tài khoản Google, không tốn hạn mức Claude Pro.
- `agy -p "<prompt>" --output-format stream-json` chạy một lượt rồi thoát. Lượt thử với `gemini-3.8-flash-low --mode plan` mất khoảng 10 s.
  - Dòng đầu: `{"event":"init","conversation_id":"…","init":{"model","cwd","tools":[…]}}`
  - Dòng cuối: `{"event":"result","result":{"conversation_id","status":"SUCCESS","response":"…","duration_seconds","num_turns","usage":{input_tokens,output_tokens,thinking_tokens,cache_read_tokens,total_tokens}}}`
- `--conversation <id>` nối lại đúng phiên: lượt 2 nhớ câu trả lời của lượt 1 (`num_turns: 2`).
- Cờ dùng được:
  - `--mode accept-edits|auto|plan`, `--dangerously-skip-permissions`, `--model`, `--effort low..max`, `--add-dir`, `--print-timeout` (0 = chờ hết lượt).
  - `--input-format stream-json` đọc mỗi dòng NDJSON trên stdin như một lượt, nên một tiến trình có thể chạy nhiều lượt.
  - `--json-schema` ép định dạng câu trả lời cuối.
- MCP: `agy mcp add|remove|list|enable|disable`. Cấu hình **chung toàn máy** tại `~/.gemini/config/mcp_config.json`, không có scope theo dự án. Có `--env KEY=value` và `--header` cho từng server.

## Chưa kiểm được
- agy có truyền biến môi trường của tiến trình xuống server MCP dạng stdio không. Lệnh thăm dò (đăng ký tạm một MCP server in env) bị bộ phân loại an toàn chặn, cần user cho phép.
- Dạng thông điệp của `--input-format stream-json`.
- Lỗi hết quota trông như thế nào (`status` khác `SUCCESS`, chữ gì).
- Với `--mode accept-edits` mà không có `--dangerously-skip-permissions`, chế độ print làm gì khi gặp yêu cầu quyền: tự từ chối hay treo.
- agy có đọc `AGENTS.md`/`GEMINI.md`/`.agents/rules` của repo không.

## Đề xuất: thành viên phòng `agy`, hub điều khiển, không cần MCP (v1)
Theo mẫu `CopilotAgent` (`hub/copilot.ts`): hub giữ một agent kiểu mới, được @ thì dậy, gom tin chưa đọc thành một lượt.
1. Profile trong Cài đặt > Agent: `{ provider: 'agy', name, cwd, model, effort }`, mặc định `gemini-3.8-flash-medium`. Hub đăng ký một session BAM cho nó, như Copilot.
2. Được @ thì hub spawn `agy.exe -p <tin gom> --output-format stream-json --conversation <id đã lưu> --model … --effort … --mode <theo quyền>` với cwd của profile.
   - Spawn thẳng file exe, không qua shell, args là mảng.
   - Prompt cắt theo `MAX_PROMPT` của hub, vì Windows giới hạn độ dài dòng lệnh khoảng 32K ký tự.
   - `conversation_id` của `init` được lưu vào session, nên lượt sau nhớ ngữ cảnh.
3. `result.response` được hub post vào phòng dưới tên agent đó. @mention trong câu trả lời đánh thức người khác như tin thường. Không cần MCP, không đụng cấu hình chung của agy.
4. Quyền lấy từ Settings permissions của BAM: `bypass` → `--mode accept-edits --dangerously-skip-permissions`, `plan`/chỉ đọc → `--mode plan`.
5. Commit: agy không có `room_commit`. Nó báo "code trên đĩa, file X/Y", rồi người giao việc hoặc lead commit qua index tạm. Phòng đã làm vậy với Copilot/deep-seek02.
6. `status` khác `SUCCESS`, hoặc exit code khác 0, thì post lỗi một lần. Khi biết mẫu lỗi quota thì đánh dấu paused như `quotaLimited` của Copilot (#192).
7. Board Worker: ghi start/end vào `workers.jsonl` như `board()` của muse (`mcp/muse.ts`), có `usage` của `result`.

## Bản 2 (tuỳ chọn): agy có tool phòng thật
Nếu đã kiểm được agy truyền env xuống MCP stdio, hub chạy một lần `agy mcp add --env BEAR_AGENT_HOME=… bam-room node --no-warnings <shim> mcp/server.ts` và mỗi lần spawn đặt `CLAUDE_CODE_SESSION_ID=<session của agy>`. Khi đó agy dùng được `room_send`, `room_tasks` và `room_commit` như các agent khác. Rủi ro: cấu hình là chung toàn máy, nên các phiên agy user tự mở cũng thấy server này (không có session id thì công cụ báo lỗi, không gửi nhầm).

## Phụ (rẻ): agy làm backend của skill `worker`
Việc đọc/tóm tắt một lần chạy `agy -p … --mode plan --model gemini-3.8-flash-low`, trên quota Google. Thêm một route trong `workerRoutes`.
