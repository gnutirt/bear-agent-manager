# Nghiên cứu: AI local (Ollama) và GitHub Copilot làm tầng worker rẻ

Cập nhật 2026-10-20, core-improve. Nguồn ở cuối trang; phần Ollama đã được thử với worker và cập nhật theo kết quả thực tế.

## Kết luận

| Phương án | Nên? | Lý do ngắn |
|---|---|---|
| Ollama + Qwen 2.5 7B chạy **qua worker hiện có** (Claude Code headless) | Chưa thử trên LAN | Chưa có số đo cho model này; không suy rộng kết quả của model khác. |
| Ollama + 7B qua **đường "chỉ tóm tắt"** mới (hub gọi thẳng API, không vòng tool) | **Nên, nếu muốn tiết kiệm thêm** | Tóm tắt file/log, commit message từ diff, trích ý chính: việc 7B làm được, miễn phí, dữ liệu không ra khỏi máy. Claude chính vẫn kiểm. |
| Ollama LAN + Qwen 3.8 qua worker hiện có | Thử được cho việc đọc đơn giản | Đã xác nhận gọi tool `Read` end-to-end trên fixture; hai lượt mẫu mất khoảng 39–58 giây. Chưa thử sửa code. |
| GitHub Copilot CLI làm worker | **Không ưu tiên** | Không miễn phí: mỗi prompt tính vào hạn mức premium/usage của gói Copilot. Phải viết thêm engine trong worker.ps1. Điều khoản dùng làm backend cho agent khác [cần xác minh]. |

## Ollama

- **API:** Ollama có API tương thích Anthropic (`/v1/messages`: messages, streaming, system, tools, tool_result, thinking, ảnh base64). Không có `tool_choice`, `count_tokens`, prompt caching, batches. Có cả API tương thích OpenAI (`/v1/chat/completions`). Khoá API không bị kiểm tra.
- **Cấu hình worker đã thêm:** provider `ollama-lan` trỏ tới `http://192.168.0.127:11435`, `tier = local`, không cần key, `models.read = ["qwen3.8:latest"]`, `models.edit = []`. Worker dùng credential placeholder `ollama` để Claude CLI vào API mode; Ollama không kiểm tra giá trị này. Tier `local` không bị lẫn vào lựa chọn `free`.
- **Trạng thái vận hành:** provider đã được lưu vào cấu hình hub, nhưng health còn `unknown` do hub chưa được restart/re-probe. Chưa đổi route edit sang Ollama; tác vụ sửa code tiếp tục dùng provider khác.
- **Đã có đường tóm tắt trực tiếp:** `hub/localai.ts` gọi `/api/chat` không dùng tool. Đây là đường riêng với worker Claude Code, và chưa được benchmark trong lượt thử LAN này.
- **Còn cần xác minh:** giới hạn context thực tế của Ollama trên máy chủ và xử lý khi endpoint LAN không sẵn sàng; không suy ra tốc độ hay chất lượng của máy chủ LAN từ cấu hình Radeon 780M ở phần ghi chú cũ.
- **Qwen 2.5 7B làm được:** tóm tắt file và log dài vừa phải, viết commit message từ diff, phân loại và trích trường, dịch thô Anh–Việt.
  **Không nên giao:** sửa code nhiều file, gọi tool nhiều bước, lập luận dài, mọi thứ cần chính xác pháp lý hay số liệu (ví dụ quy định NHNN).
- **Tài nguyên:** bản 7B lượng tử Q4 khoảng 4–5 GB RAM, cộng bộ nhớ đệm KV theo độ dài ngữ cảnh: dư sức với 61.8 GB.
  Tốc độ: trên Windows, Radeon 780M không chắc có ROCm, nhưng Ollama có Vulkan cho GPU AMD; số đo cộng đồng cho APU tương tự khoảng vài chục token/giây [cần đo trên máy này].
- **Đo thật:** endpoint LAN `http://192.168.0.127:11435` có các model `qwen-coder-3b:latest`, `qwen3.8:latest`, `qwen:latest`, `gemma4:26b`. Phép thử ban đầu cho thấy Qwen Coder 3B trả JSON trong text nhưng không tạo `tool_use`; Qwen 3.8 tạo `tool_use` qua `/v1/messages` sau 40,24 giây.

## GitHub Copilot

- **Copilot CLI** (`npm install -g @github/copilot`) có chế độ không tương tác: `copilot -p "<prompt>" -s --output-format json --allow-tool <tool> --no-ask-user --model <model>`. Xác thực bằng `COPILOT_GITHUB_TOKEN` (hoặc `GH_TOKEN`, `GITHUB_TOKEN`). Chọn được model của Copilot (ví dụ `claude-haiku-4.5`).
- **Chi phí:** cần gói Copilot. Theo nguồn cộng đồng, mọi prompt của CLI đều tính premium request; GitHub chuyển sang tính theo mức dùng từ 01/06/2026 [cần xác minh trên trang billing chính thức].
- **Nối vào hub:** không đi qua `ANTHROPIC_BASE_URL` được. Phải thêm một "engine" thứ hai trong worker.ps1 (gọi `copilot -p`, đọc JSONL) cùng phần cài đặt token. Máy này chưa cài `copilot` lẫn `gh`.
- **Điều khoản:** chưa tìm thấy điều khoản nói rõ có được dùng Copilot CLI làm backend tự động cho agent khác hay không [cần xác minh trước khi làm].

### Copilot Chat qua extension VS Code (việc #12, core-improve, 2026-10-19)

- **Cơ chế có thật:** VS Code cho extension gọi model của Copilot qua Language Model API: `vscode.lm.selectChatModels({ vendor: 'copilot' })` rồi `model.sendRequest(messages, {}, token)`, trả lời dạng stream. Extension `bear-agent-manager-vscode` (vscode/extension.js, đang chỉ nhúng UI hub ở cổng 7788) có thể làm cầu nối: hub gửi việc tóm tắt tới extension qua localhost, extension gọi `vscode.lm`, trả chữ về hub. Cline và Roo Code đã dùng đúng đường này.
- **Điều kiện cứng:**
  - Chỉ chạy khi VS Code đang mở, có extension Copilot và người dùng đăng nhập GitHub có gói Copilot. Vậy nó không giúp được chế độ "không IDE" (D3).
  - Lần đầu phải bấm đồng ý ("Copilot's language models require consent from the user"). Tài liệu khuyên chỉ gọi `selectChatModels` từ một hành động của người dùng (một lệnh).
  - Không có system message. Gần hết quota thì request lỗi, extension phải tự xử lý.
  - Người dùng thấy được mỗi extension gửi bao nhiêu request.
- **Gói Free:**
  - Tài liệu GitHub hiện ghi Copilot Free có một allowance GitHub AI Credits nhưng không công bố số lượng Free trên bảng gói; 2.000 completions/tháng là hạn mức gợi ý code, không phải hạn mức chat.
  - Free chỉ cho chọn model tự động. Tính năng/agentic chat dùng AI Credits; tác vụ agent phức tạp có thể phát sinh nhiều lần gọi model. Không dùng số "50 premium requests" từ bài bên thứ ba hay tài liệu billing cũ làm định mức cho Free.
  - Muốn biết allowance còn lại phải xem dashboard tài khoản; không thể kết luận Free đủ cho worker nền hoặc dự trù số task/tháng từ tài liệu công khai hiện có.
- **Điều khoản và vận hành:** Language Model API cần consent của người dùng; VS Code khuyến nghị gọi `selectChatModels` từ hành động do người dùng khởi chạy. API chỉ tồn tại trong extension host đang chạy, nên không phục vụ hub/headless khi VS Code đóng. Chưa xác minh điều khoản có cho phép dùng extension API làm backend tự động cho agent khác hay không; không suy diễn đây là hành vi được cho phép hoặc bị cấm.
- **Kết luận #12:**
  - Kỹ thuật làm được cho thao tác do người dùng chủ động bấm trong VS Code, nhưng **không phù hợp làm worker nền mặc định**: phụ thuộc VS Code đang mở, consent người dùng, quota AI Credits không được công bố rõ cho Free và điều khoản dùng tự động chưa xác minh.
  - Có thể thử sau dưới dạng lệnh tường minh trong extension, có giới hạn lượt, báo lỗi quota và không tự chạy; trước khi phát hành cần kiểm tra điều khoản hiện hành.
  - Đường rẻ đã chốt vẫn là `localSummarize` (Ollama, chạy trên máy) và worker Intern AI.

### Đo thật Ollama LAN (192.168.0.127:11435, RTX 3060, core-improve 2026-10-19)

5 việc mẫu lấy từ repo (không gửi gì bí mật), gọi `/v1/chat/completions`, `max_tokens` 500, chấm tay 1-5. `gemma4:26b` chưa đo (bộ chấm dừng vì quá giờ chạy nền).

| Việc | qwen-coder-3b | thời gian | qwen3.8 | thời gian |
|---|---|---|---|---|
| Tóm tắt log agent | 3 (đọc sai "resets Oct 19" thành "đã reset") | 7 s | 5 (đúng, nêu được nguyên nhân) | 148 s |
| Commit message cho một diff | 4 | 0,2 s | 5 | 78 s |
| Viết test node:test cho `cmpSemver` | 2 (không import hàm, đoán sai giá trị trả về; test sẽ đỏ) | 5,5 s | không ra chữ (hết 500 token khi đang "nghĩ") | 128 s |
| Đổi tên biến trong một đoạn | 5 | 1,1 s | 5 | 50 s |
| Giải thích một hàm | 4 | 1,0 s | chưa đo | |
| Worker Claude Code gọi tool `Read` trên fixture tổng hợp, trả đúng nội dung | không tạo `tool_use` trong lần probe | — | đạt, 39–58 s | 39–58 s |

Kết luận đo: các phép thử qua `/v1/chat/completions` phía trên và thử worker qua `/v1/messages` là hai đường khác nhau. **Qwen Coder 3B** không tạo `tool_use` ở lần probe này; điều đó không đánh giá khả năng trả lời plain-text trên đường `localSummarize`. **Qwen 3.8** đã dùng được tool `Read` qua worker trên fixture tổng hợp; hai lượt mất 39–58 giây. Chưa xác minh khả năng sửa file hoặc độ ổn định nhiều lượt. Lượt kiểm tra worker mới nhất trả kết quả chính xác, exit 0, và log ghi cost 0 dù response của Ollama chứa `total_cost_usd` khác 0.

## Đề xuất việc tiếp (chờ duyệt)

1. Restart/re-probe hub để xác nhận provider LAN reachable và model `qwen3.8:latest` đã được nhận diện.
2. Đo `localSummarize` riêng bằng fixture tổng hợp; không gửi secrets hoặc dữ liệu repo thật tới máy LAN.
3. Sau khi model/tool-use ổn định, thử edit trên repo fixture độc lập trước khi cân nhắc đặt model vào `workerRoutes.edit`.
3. Copilot: để sau, chỉ làm khi @you có gói Copilot trả tiền và muốn dùng hạn mức đó.

## Nguồn

- Ollama, Anthropic compatibility: https://docs.ollama.com/api/anthropic-compatibility (truy cập 2026-10-19)
- Ollama, Windows/GPU: https://docs.ollama.com/windows, https://docs.ollama.com/gpu
- GitHub, Copilot CLI programmatic reference: https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-programmatic-reference
- GitHub, Running Copilot CLI programmatically: https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically
- Thảo luận premium requests của Copilot CLI: https://github.com/orgs/community/discussions/194343
- Mã repo: `skills/worker/worker.ps1` (đặt biến môi trường theo provider), `hub/providers.ts`, `hub/settings.ts` (`workerRoutes`)
- VS Code, Language Model API: https://code.visualstudio.com/api/extension-guides/ai/language-model
- VS Code, GitHub Copilot extensibility: https://code.visualstudio.com/docs/copilot/copilot-extensibility-overview
- GitHub, Copilot plans (Free: allowance AI Credits, auto model selection, 2,000 completions/tháng): https://docs.github.com/en/copilot/get-started/plans
- GitHub, usage-based billing for individuals (AI Credits và allowance theo gói): https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing
- GitHub, legacy premium requests (chỉ áp dụng một số gói Pro/Pro+ cũ còn billing theo request): https://docs.github.com/en/copilot/reference/copilot-billing/request-based-billing-legacy/copilot-requests
- Roo Code dùng vscode.lm: https://docs.roocode.com/providers/vscode-lm
