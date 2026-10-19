# Nghiên cứu: AI local (Ollama) và GitHub Copilot làm tầng worker rẻ

Ngày 2026-10-19, thu-vien-skill. Chưa code hub. Nguồn ở cuối trang.

## Kết luận

| Phương án | Nên? | Lý do ngắn |
|---|---|---|
| Ollama + Qwen 2.5 7B chạy **qua worker hiện có** (Claude Code headless) | **Không** | Mỗi lượt Claude Code gửi lời nhắc hệ thống và định nghĩa tool rất dài; 7B gọi tool nhiều bước kém; trên iGPU, phần đọc lời nhắc có thể mất vài phút mỗi lượt [cần đo]. |
| Ollama + 7B qua **đường "chỉ tóm tắt"** mới (hub gọi thẳng API, không vòng tool) | **Nên, nếu muốn tiết kiệm thêm** | Tóm tắt file/log, commit message từ diff, trích ý chính: việc 7B làm được, miễn phí, dữ liệu không ra khỏi máy. Claude chính vẫn kiểm. |
| Ollama + model lớn hơn mà Ollama khuyên dùng cho Claude Code (`qwen3-coder`) qua worker hiện có | Thử được | Máy có 61.8 GB RAM. Không cần sửa code, chỉ thêm provider. Tốc độ trên Radeon 780M [cần đo]. |
| GitHub Copilot CLI làm worker | **Không ưu tiên** | Không miễn phí: mỗi prompt tính vào hạn mức premium/usage của gói Copilot. Phải viết thêm engine trong worker.ps1. Điều khoản dùng làm backend cho agent khác [cần xác minh]. |

## Ollama

- **API:** Ollama có API tương thích Anthropic (`/v1/messages`: messages, streaming, system, tools, tool_result, thinking, ảnh base64). Không có `tool_choice`, `count_tokens`, prompt caching, batches. Có cả API tương thích OpenAI (`/v1/chat/completions`). Khoá API không bị kiểm tra.
- **Nối vào worker hiện có, không sửa code:** worker.ps1 đặt `ANTHROPIC_BASE_URL` và `ANTHROPIC_AUTH_TOKEN` theo provider, nên chỉ cần thêm provider ở Cài đặt: `baseUrl = http://localhost:11434`, `auth = auth-token`, `key = ollama` (giá trị giả: worker bỏ qua provider không có key), `tier = free`, `models.read = ["qwen2.5:7b"]`, `models.edit = []`. Rồi trỏ `workerRoutes.read` vào provider này. Lưu ý: `-Tier auto` thử mọi provider free theo thứ tự, nên provider local sẽ chen vào mọi việc đọc; muốn chỉ dùng cho một số việc thì để nó tắt và gọi bằng `-Provider ollama`.
- **Phải sửa nếu làm thật:**
  1. Độ dài ngữ cảnh: Claude Code cần ngữ cảnh lớn, mà mặc định của Ollama nhỏ. Phải đặt `OLLAMA_CONTEXT_LENGTH` khi chạy `ollama serve` [cần xác minh giá trị mặc định của bản đang cài].
  2. Mã thoát 3 (hết hạn mức) không áp dụng cho local; khi Ollama tắt, worker nên báo "provider local không chạy" thay vì thử tiếp.
  3. Đường "chỉ tóm tắt": một hàm hub mới gọi `/api/chat` (đặt `num_ctx`), đưa vào nội dung file, trả chữ. Đặt sau một công tắc, mặc định tắt.
- **Qwen 2.5 7B làm được:** tóm tắt file và log dài vừa phải, viết commit message từ diff, phân loại và trích trường, dịch thô Anh–Việt.
  **Không nên giao:** sửa code nhiều file, gọi tool nhiều bước, lập luận dài, mọi thứ cần chính xác pháp lý hay số liệu (ví dụ quy định NHNN).
- **Tài nguyên:** bản 7B lượng tử Q4 khoảng 4–5 GB RAM, cộng bộ nhớ đệm KV theo độ dài ngữ cảnh: dư sức với 61.8 GB.
  Tốc độ: trên Windows, Radeon 780M không chắc có ROCm, nhưng Ollama có Vulkan cho GPU AMD; số đo cộng đồng cho APU tương tự khoảng vài chục token/giây [cần đo trên máy này].
- **Đo thật:** **máy này chưa cài Ollama** (không có lệnh `ollama`, cổng 11434 không mở), nên chưa đo được. @you dùng Ollama ở máy khác thì chạy ở máy đó: `ollama run qwen2.5:7b --verbose` với một file mẫu, ghi lại tốc độ đọc lời nhắc (prompt eval) và tốc độ sinh chữ (eval).

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
  - Trang plans chính thức (docs.github.com, đọc 19/10) ghi Free "2000 completions per month".
  - Chat/premium: trang chỉ ghi "an allowance of GitHub AI Credits", không có con số.
  - Free chỉ có "auto model selection", không chọn được model.
  - Nguồn thứ cấp ghi 50 premium request/tháng, mỗi tin chat tính một request [cần xác minh]. Với 50 request/tháng, Free chỉ đủ thử nghiệm, không đủ làm tầng worker.
- **Điều khoản:** chưa đọc được văn bản "GitHub Copilot extensibility acceptable development and use policy". Tài liệu VS Code chỉ nói extension phát hành lên Marketplace phải tuân theo nó [cần xác minh]. Dùng Copilot làm backend tự động hàng loạt cho agent khác là vùng xám; nếu làm thì chỉ để tóm tắt theo yêu cầu, có giới hạn tần suất.
- **Kết luận #12:**
  - Kỹ thuật làm được (cầu nối extension + `vscode.lm`) nhưng **không nên ưu tiên**.
  - Free gần như không có hạn mức chat.
  - Cách này cần VS Code mở, trái hướng D3.
  - Điều khoản chưa rõ.
  - Đường rẻ đã chốt vẫn là `localSummarize` (Ollama, chạy trên máy) và worker Intern AI.
  - Nếu @you có gói Copilot Pro (300 premium/tháng theo nguồn thứ cấp) và muốn dùng, làm thử một lệnh "Tóm tắt bằng Copilot" do người dùng bấm (đúng khuyến nghị user-initiated), không tự động.

### Đo thật Ollama LAN (192.168.0.127:11435, RTX 3060, core-improve 2026-10-19)

5 việc mẫu lấy từ repo (không gửi gì bí mật), gọi `/v1/chat/completions`, `max_tokens` 500, chấm tay 1-5. `gemma4:26b` chưa đo (bộ chấm dừng vì quá giờ chạy nền).

| Việc | qwen-coder-3b | thời gian | qwen3.8 | thời gian |
|---|---|---|---|---|
| Tóm tắt log agent | 3 (đọc sai "resets Oct 19" thành "đã reset") | 7 s | 5 (đúng, nêu được nguyên nhân) | 148 s |
| Commit message cho một diff | 4 | 0,2 s | 5 | 78 s |
| Viết test node:test cho `cmpSemver` | 2 (không import hàm, đoán sai giá trị trả về; test sẽ đỏ) | 5,5 s | không ra chữ (hết 500 token khi đang "nghĩ") | 128 s |
| Đổi tên biến trong một đoạn | 5 | 1,1 s | 5 | 50 s |
| Giải thích một hàm | 4 | 1,0 s | chưa đo | |

Kết luận đo: **qwen-coder-3b** nhanh (≤7 s) và đủ cho đổi tên, commit message, giải thích ngắn; KHÔNG dùng để viết test hay sửa logic (sai mà trông đúng, cần người review). **qwen3.8** chất lượng tốt hơn rõ nhưng 50-150 s mỗi việc và cần `max_tokens` lớn (hoặc tắt chế độ nghĩ) cho việc sinh code. Gợi ý cho `workerRoutes`: 3B cho việc "read"/tóm tắt/commit message; việc "edit" vẫn qua Intern AI hoặc coder; qwen3.8 chỉ cho tóm tắt không gấp. Endpoint `/v1/messages` (Anthropic) không trả lời trong 5 s lúc thăm dò; @Coder_No_2 đang đo phần đó (#16).

## Đề xuất việc tiếp (chờ duyệt)

1. @you đo Qwen 2.5 7B ở máy có Ollama (lệnh ở trên) và gửi hai con số tốc độ.
2. Nếu đủ nhanh: @core-improve hoặc @coder làm đường "chỉ tóm tắt" (hàm hub gọi `/api/chat`, công tắc mặc định tắt, provider kiểu `local`), có test với máy chủ giả.
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
- GitHub, Copilot plans (Free: 2000 completions/tháng, auto model selection): https://docs.github.com/en/copilot/get-started/plans
- Nguồn thứ cấp về hạn mức Free (50 premium/tháng, cần xác minh): https://costbench.com/software/ai-coding-assistants/github-copilot/free-plan/ , https://fast.io/resources/github-copilot-free-access/
- Roo Code dùng vscode.lm: https://docs.roocode.com/providers/vscode-lm
