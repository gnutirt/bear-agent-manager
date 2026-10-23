# Spec: Duck (trò chuyện) + Muse (nghiên cứu) dùng chung bộ nhớ của BAM

User 23/10 dán 2 yêu cầu: "DuckAI chat agent qua Duck2api" và "Memory/Knowledge layer cho Duck + Muse". Spec này gộp cả hai. Nghiên cứu: function-research.

## Mục tiêu
- **Duck**: thành viên phòng chỉ để trò chuyện và tư vấn. Gọi Duck2api qua OpenAI Chat Completions và dùng lại những gì BAM đã nhớ.
- **Muse**: thành viên phòng chỉ để nghiên cứu. Hỏi Muse (Meta) qua Chrome debug, như `mcp/muse-core.ts`. Kết quả có URL và ngày truy cập; user bấm lưu thì vào bộ nhớ.
- **BAM** sở hữu bộ nhớ. Backend không nhớ gì giữa các lượt.
- Không phải coding agent. Không file, shell, MCP, browser, tool hay function calling. Không có đường nào gọi Claude CLI.

## Duck2api (đã kiểm README, 23/10)
- Dự án: https://github.com/aurora-develop/duck2api (Go, giấy phép MIT). User tự chạy bằng binary hoặc Docker `ghcr.io/aurora-develop/duck2api`. Ví dụ trong README dùng cổng 8080.
- API:
  - `POST /v1/chat/completions` theo dạng OpenAI.
  - `GET /v1/models` để liệt kê model.
  - Biến môi trường `Authorization` (`Bearer <key>`) là key tuỳ chọn. Ngoài ra có `PROXY_URL` và `PREFIX`.
- Model README liệt kê: `gpt-5.4-nano`, `gpt-5.4-mini`, `claude-haiku-4-5`, `tinfoil/gpt-oss-120b`, `mistral-small`. Danh sách đổi theo duck.ai, nên BAM đọc từ `/v1/models` chứ không ghi cứng (chỉ giữ một mặc định).
- README không nói rõ `stream: false` có được hỗ trợ không. Phải kiểm bằng live test (Task D3).
- **Rủi ro (đã báo user):**
  - Điều khoản duck.ai cấm "automated querying". Duck2api là cầu nối không chính thức.
  - duck.ai khoá theo IP: lỗi `418 ERR_BN_LIMIT`, không có thời gian chờ.
  - "Miễn phí" không có nghĩa là có SLA hay hạn mức bảo đảm.
  - BAM không cài, không chạy, không tải Duck2api; user tự lo phần đó. UI ghi rõ câu hỏi được gửi tới duck.ai qua Duck2api.

## Bộ nhớ (Memory layer)
- Một mục gồm:
  - `id`, `kind` (`preference|decision|context|tracking|research|question`), `text`, `tags[]`.
  - `scope` (`user|project|room`) cùng `project` và `room`.
  - `source` (`user|duck|muse`), `createdAt`, `updatedAt`.
  - Riêng `research` có thêm `urls[]` và `accessedAt`.
- Phân vùng khi đọc cho một lượt ở phòng R thuộc dự án P: lấy các mục `scope=user`, `project=P` và `room=R`. Không bao giờ lấy mục `room` của phòng khác.
- Khác với room note (`room_note`): note là thoả thuận giữa các agent. Bộ nhớ là kiến thức cho Duck và Muse dùng lại.
- Không lưu nguyên transcript. Chỉ lưu những mục có thể dùng lại:
  - user nói "hãy nhớ…" hoặc "nhớ giùm…";
  - user bấm lưu một kết quả Muse;
  - user thêm hoặc sửa trong UI.
- "quên…" thì Duck tìm các mục khớp, liệt kê ra, và chỉ xoá khi user trả lời "xoá" hoặc bấm nút. v1 không để LLM tự trích bộ nhớ.
- Không lưu bí mật: text khớp mẫu key/token/mật khẩu/private key, hoặc có chữ "bí mật"/"secret", bị từ chối kèm lý do.
- Tìm kiếm v1:
  - Từ khoá đã bỏ dấu tiếng Việt cộng tag, chấm điểm theo số từ trùng; hoà điểm thì mục mới hơn thắng.
  - Lấy tối đa 8 mục, tổng ≤ 3000 ký tự.
  - Chưa dùng vector DB.
- Lưu trữ: `<home>/memory/entries.json`, ghi tmp rồi `renameRetry`, quyền 0600.
- Lịch sử hội thoại: `<home>/memory/history/<agentId>--<room>.json` gồm `{ summary, turns[] }`. Mỗi cặp agent + phòng một file, không dùng chung với agent code.

## Một lượt Duck
1. Hub gom tin chưa đọc gửi cho Duck, như Copilot và agy.
2. Prompt gồm:
   - System: là trợ lý trò chuyện, không có quyền hành động; phải nói rõ thông tin đến từ bộ nhớ hay nghiên cứu nào, còn không có bằng chứng thì nói là nhận định.
   - Các mục bộ nhớ liên quan, mỗi mục một dòng: `[M<id> <kind> · <source> · <ngày> · <url?>] text`.
   - `summary`, rồi các lượt gần nhất, rồi tin mới.
3. Gọi `POST {baseUrl}/v1/chat/completions` với `{ model, messages, stream: false }`. Không gửi `tools` hay `functions`. Timeout mặc định 60 s.
4. Lấy `choices[0].message.content`. Bỏ qua `tool_calls`; nếu không có content thì báo lỗi, không trả lời rỗng.
5. Lịch sử vượt 12000 ký tự thì gọi thêm một lần để tóm tắt nửa cũ vào `summary`. Tóm tắt lỗi thì giữ summary cũ, bỏ bớt lượt cũ nhất, và báo một dòng.
6. Lưu lịch sử. Lưu lỗi thì không post như thể đã nhớ: câu trả lời vẫn post, kèm một dòng "không lưu được bộ nhớ: …".
7. Bảng lỗi, mỗi lỗi post một lần (sys `sys.duck.failed`):
   - timeout;
   - 401 hoặc 403 (sai key);
   - 429 (bị giới hạn);
   - 418 hoặc `ERR_BN_LIMIT` (duck.ai đã khoá IP này);
   - 5xx;
   - JSON hỏng hoặc thiếu content.

   Gặp lỗi thì tin vẫn để chưa đọc.

## Một lượt Muse
1. Gọi `museAsk` (`mcp/muse-core.ts`) qua Chrome debug 9222, như #62 cũ (^e797242, đã gỡ ở #73). Prompt yêu cầu cuối câu trả lời có mục "Nguồn:" kèm URL.
2. Hub tách URL từ câu trả lời, post kết quả cùng `accessedAt`. Kết quả chưa vào bộ nhớ.
3. Nút "Lưu vào bộ nhớ" trên tin của Muse gọi `POST /api/memory/from-message`. Hub dựng mục `kind: research` từ tin đã lưu (text + urls + accessedAt). Không có URL thì vẫn lưu được, nhưng gắn tag `chưa-có-nguồn`.
4. Lượt sau, Duck tìm thấy mục research này và trích dẫn nó.
5. v1 chưa dùng trình duyệt ngầm của BAM (spec browser ^0f31b11).

## Cài đặt / UI
- Profile `provider: 'duck'`: `{ name, enabled, baseUrl (mặc định http://127.0.0.1:8080), model (mặc định gpt-5.4-mini), timeoutMs }`.
  - baseUrl chỉ nhận `http(s)`. Host không phải loopback thì UI cảnh báo.
  - Key lưu riêng ở `<home>/agent-keys.json` (0600). API chỉ trả `hasKey`, không trả bất kỳ phần nào của key.
  - Nút "Kiểm tra" gọi `/v1/models`.
- Profile `provider: 'muse'`: `{ name, enabled }`, kèm trạng thái Chrome và đăng nhập (`museStatus`).
- Cài đặt có mục "Bộ nhớ": lọc theo phòng/dự án/loại; xem, sửa, xoá từng mục; xoá theo phòng hoặc dự án. Mỗi phòng có nút "Xoá lịch sử chat Duck" (không xoá dữ liệu phòng).
- Không thêm thiết lập browser cho Duck hay Muse.

## Ngoài phạm vi v1
Streaming, vector DB, LLM tự trích bộ nhớ, Muse qua trình duyệt ngầm, Duck tự đi nghiên cứu web.
