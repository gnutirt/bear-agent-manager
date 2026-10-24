# Ô Model của agent claude-api: chọn từ danh sách của provider (#288)

User 24/10: khi tạo agent claude-api phải gõ tay "deepseek-flash", không có danh sách để chọn.

## Hiện trạng

- Hộp thoại tạo agent: `<datalist id="agentSpawnModels">` ([ui/index.html:4221](../../../ui/index.html#L4221)) chỉ được điền từ `providers.json` `models.read/edit` tĩnh ([ui/index.html:4338-4343](../../../ui/index.html#L4338-L4343)). Provider như OpenRouter có `models: []` nên danh sách trống ([hub/providers.ts:28-29](../../../hub/providers.ts#L28-L29)).
- Drawer "Cài đặt agent": ô Model dùng `list="modelList"` ([ui/index.html:4535](../../../ui/index.html#L4535)), là danh sách model **Claude** (sonnet/opus/haiku, [ui/index.html:1033](../../../ui/index.html#L1033)), sai với agent claude-api.
- Hub đã gọi `GET {baseUrl}/v1/models` để kiểm tra sức khoẻ provider ([hub/brief.ts:5-13](../../../hub/brief.ts#L5-L13)) nhưng bỏ nội dung, chỉ lấy ok/bad.
- `[claude-code:unrecognized_model]` trong log revive là cảnh báo của Claude Code về model lạ (không có bảng context/giá). Không phải provider từ chối; DeepSeek vẫn chạy (#286).

## Endpoint liệt kê model (kiểm tra 24/10)

Mọi provider hiện có đều trả lời `GET {baseUrl}/v1/models`, nên dùng **một** đường, giống `probeProvider`:

| Provider | URL | Auth | Dạng trả về |
|---|---|---|---|
| DeepSeek | `https://api.deepseek.com/anthropic/v1/models` (401 khi không key, có route) | `x-api-key` | `data[].id` |
| OpenRouter | `https://openrouter.ai/api/v1/models?supported_parameters=tools` (công khai, không cần key) | Bearer (tuỳ) | `data[].id`, `context_length`, `pricing.prompt`, `supported_parameters` |
| Intern AI | `https://discovery-api.intern-ai.org.cn/v1/models` | Bearer | `data[].id` (OpenAI) |
| Ollama | `{host}:11434/v1/models` (OpenAI-compat); dự phòng `/api/tags` | không | `data[].id`; `/api/tags` → `models[].name` |

OpenRouter 24/10: 469 model, 400 có `tools`, 16 model `:free` có `tools`. Query `supported_parameters=tools` trả 376 (server tự lọc). Claude Code cần tool use, nên **chỉ liệt kê model có `tools`**.

## Việc (T1..T5)

**T1. hub/brief.ts: `listModels(p, fetchImpl)`**, đặt cạnh `probeProvider` ([hub/brief.ts:5](../../../hub/brief.ts#L5)), dùng chung headers.
- URL `${baseUrl}/v1/models`. Với host `openrouter.ai` thêm `?supported_parameters=tools`.
- Đọc `data[].id`. Nếu không có `data` thì đọc `models[].name` (Ollama `/api/tags`, gọi lại khi `/v1/models` 404).
- Trả `{ id, ctx?, free? }[]`: `ctx` = `context_length`; `free` = id kết thúc `:free` hoặc `pricing.prompt === '0'`. Sắp model `free` lên đầu, rồi theo id.
- Timeout 8s như probe. Lỗi thì ném `Error` ngắn, không kèm header hay key.

**T2. hub/server.ts: route `GET /api/providers/:id/models`**, ngay sau [hub/server.ts:2942](../../../hub/server.ts#L2942).
- Cache `Map<providerId, { at, models }>` 10 phút; `?refresh=1` bỏ cache. Đổi key/baseUrl (POST `/api/providers`, [hub/server.ts:2964](../../../hub/server.ts#L2964)) thì xoá cache của provider đó.
- Trả `{ models: [...], configured: [...prov.models.read, ...prov.models.edit], source: 'live' | 'config', error? }`. Lỗi mạng hoặc 401 vẫn trả 200 với `source:'config'` + `error`, để UI cho gõ tay.
- Key không bao giờ có trong response hay log (`publicProvider` đã có mẫu).

**T3. UI hộp thoại tạo agent**, [ui/index.html:4338-4343](../../../ui/index.html#L4338-L4343) `syncApiOptions`.
- Đổi provider thì `api('/api/providers/'+id+'/models')`, điền `#agentSpawnModels`: model `configured` trước, rồi `models` live. Option label có `ctx` (ví dụ "128k") và "free".
- Đang tải: placeholder "đang tải danh sách…". Lỗi: dòng `small muted` "không lấy được danh sách từ provider — gõ tên model" và vẫn cho gõ.
- Giữ `<input list>` (gõ để lọc trong ~400 model của OpenRouter), không đổi sang `<select>`.

**T4. UI drawer Cài đặt agent**, [ui/index.html:4535](../../../ui/index.html#L4535).
- Khi `a.profile?.provider === 'claude-api'`: dùng datalist riêng `agentProviderModels` điền như T3 theo `a.profile.providerId`. Agent tab hoặc Copilot giữ `modelList`.

**T5. Cảnh báo model ngoài danh sách**, cả T3 (submit) và T4 (`saveAgentModel`, [ui/index.html:4505](../../../ui/index.html#L4505)).
- Khi `source === 'live'` và model không có trong `models` lẫn `configured`: hiện `pwarn` "Model … không có trong danh sách của {provider}; agent có thể không chạy". Vẫn cho lưu, không chặn.
- `source === 'config'` (không lấy được live): không cảnh báo.
- i18n vi/en: `ac.api.modelsLoading`, `ac.api.modelsFailed`, `ac.api.modelUnknown`.

**T6. Giá in/out + context mỗi model, sort rẻ nhất lên đầu** (user bổ sung 24/10).
- Kiểu trả về T1 mở rộng: `{ id, ctx?, inPerM?, outPerM?, priceSrc: 'live' | 'table' | 'provider' | 'none' }`, đơn vị USD/1M token như `Pricing` ([hub/providers.ts:8](../../../hub/providers.ts#L8)).
- OpenRouter: `inPerM = Number(pricing.prompt) * 1e6`, `outPerM = Number(pricing.completion) * 1e6`, `ctx = context_length` (live, `priceSrc:'live'`). Bỏ qua model có giá âm (`-1` = biến động).
- Provider không trả giá (DeepSeek, Intern, Ollama): bảng tĩnh mới `MODEL_PRICES` trong hub/providers.ts, mỗi dòng có `source` (URL docs) + `asOf` (ngày), ví dụ `deepseek-flash: { inPerM: 0.3, outPerM: 1.2, ctx: …, source: 'api-docs.deepseek.com/quick_start/pricing', asOf: '2026-10-21' }`, giá trị lấy đúng số đang có ở [hub/providers.ts:22-26](../../../hub/providers.ts#L22-L26). Không có dòng thì dùng `prov.pricing` (giá chung của provider, `priceSrc:'provider'`); Ollama/local = 0. Không đoán giá: thiếu thì `priceSrc:'none'`.
- Sort: model có giá theo `inPerM + outPerM` tăng dần (free = 0 lên đầu), rồi model `none`, rồi theo id.
- Nối #118: `paidUsage` ([hub/server.ts:729](../../../hub/server.ts#L729), `usageCost` [hub/paidusage.ts:22](../../../hub/paidusage.ts#L22)) tính theo giá **của model profile đang dùng** nếu có trong bảng/live cache, ngược lại giữ `provider.pricing` như cũ. Dùng một hàm chung `priceFor(prov, model)` để UI và usage không lệch.
- UI T3/T4: label option dạng `deepseek-flash · 128k · $0.30/$1.20`; "free" khi cả hai = 0; "giá ?" khi `none`. Có `title` ghi nguồn + ngày cho giá `table`.

## Test

- `listModels`: 3 dạng (`data[].id` Anthropic/OpenAI, `models[].name` Ollama, OpenRouter có `supported_parameters` → chỉ giữ có `tools`); timeout hoặc 401 thì ném lỗi.
- Route: cache (gọi 2 lần → fetch 1 lần), `refresh=1`, lỗi → `source:'config'`; response không chứa key (grep chuỗi key giả).
- UI: đổi provider điền datalist; model lạ + `source:'live'` hiện cảnh báo.
- T6: OpenRouter `pricing.prompt '0.0000003'` → `inPerM 0.3`; sort rẻ lên đầu; DeepSeek lấy bảng tĩnh có `source/asOf`; `priceFor` dùng chung cho usage #118 (profile model có trong bảng → cost theo model).

## Ngoài phạm vi

- Không tự đổi model đang chạy; không kiểm tra model có chạy được thật (gọi thử tốn tiền).
- Không sửa `providers.json` tự động từ danh sách live.
