# Duck chạy qua Chrome của hub, bỏ Duck2api (spec #257, core-improve 24/10)

User quyết (DM 24/10): Duck nói chuyện với duck.ai qua Chrome debug của hub, giống Muse với muse.ai, và bỏ hẳn Duck2api.
Lý do: Duck2api bị duck.ai chặn (`ERR_BN_LIMIT`, HTTP 500), còn duck.ai mở bằng trình duyệt thật vẫn chạy.

## 1. Hiện trạng (đo 24/10)

- **Muse**: `mcp/muse-core.ts` là driver, gồm tabs/attach, `isDone`, `joinAnswer` và 4 script cố định. `chromeCdp()` ở `mcp/muse.ts:21` mặc định nối `127.0.0.1:9222`. Hub dùng cùng driver này ở `hub/server.ts` (`museCdp = chromeCdp()`).
- **Chrome của hub** (`BrowserHost`, `settings.browser.port`) chạy ở **9333**, UA `BAM-Agent`. Lúc đo, cổng 9222 **không mở**, nên Muse trong hub hiện không chạy được nếu user không tự mở Chrome debug :9222.
- **Duck**: `hub/duck.ts` `duckTurn()` dựng `ChatMsg[]` (system + bộ nhớ + tóm tắt + lịch sử + câu hỏi) rồi gọi `chatComplete()` (`hub/chatapi.ts`, OpenAI-compatible). `summarizeOldest()` gọi thêm một lượt API để tóm tắt. Base URL lấy từ `DuckHost` (Duck2api, `hub/duckhost.ts`) hoặc `profile.baseUrl`.

## 2. DOM duck.ai (đo trên Chrome :9333, 24/10)

Điều khoản lần đầu đã được bấm sẵn trong profile này, không thấy hộp thoại nào.

| Phần | Selector | Ghi chú |
|---|---|---|
| Ô nhập | `textarea[name=user-prompt]` | placeholder "Ask anything privately" |
| Nút gửi | `textarea[name=user-prompt]` → `closest('form')` → `button[type=submit]` | Nhãn là **"Ask"** ở chat mới, **"Send"** trong chat đã có tin. Không chọn theo nhãn. Đặt value rồi chờ ≥300 ms mới click, vì React bật nút trễ. |
| Đang trả lời | `button[aria-label="Stop generating"]` **không** `disabled` | Nút luôn có mặt; lúc rảnh thì nó bị `disabled`. |
| Tin user | `[data-testid=user-message]` | |
| Bong bóng trả lời | `[data-activeresponse]` (id `<chatID>-assistant-message-<n>-1`) | Đang stream: `data-activeresponse="false"`; xong: `"true"`. Đừng dùng `[id*=-assistant-message-]` vì heading con cũng khớp, đếm ra gấp đôi. |
| Chữ trả lời | các con của bong bóng, **trừ** `H3`, con chứa `[id^=heading-]` (tên model, vd "GPT-6 Luna") và `[data-message-actions]` | Ghép `innerText` của các con còn lại. |
| Xong | `[data-copyairesponse]` (nút "Copy to clipboard") có trong bong bóng cuối + Stop disabled + chữ không đổi 2 s | Giống `isDone` của Muse. |
| Chọn model | `[data-testid=model-picker-button]` (chữ vd "6 Luna") | **Chỉ có ở chat mới**; trong chat đã có tin thì nút này mất. Danh sách model trong menu chưa đo, xem task W2. |
| Chat mới | đi tới `https://duck.ai/chat` | Có nút "New" ở sidebar, nhưng đổi URL ổn định hơn. |
| Xoá chat | `button[aria-label="Delete chat"]` | Tuỳ chọn, để dọn lịch sử local của duck.ai. |

Thứ tự item trong trang: `querySelectorAll('[data-testid=user-message],[data-activeresponse]')` theo thứ tự tài liệu. Đã kiểm ra `UAUA` với 2 lượt.

Lúc đo, mình để lại 1 chat thử trên duck.ai, gồm 2 câu: "Reply with just: OK" và 3 dòng về mưa.

## 3. Thiết kế

### 3.1 Driver chung `mcp/webchat-core.ts`
Tách khỏi `muse-core.ts` và giữ nguyên hành vi:
- `Item`, `Snap`, `Tab`, `Page`, `Cdp`
- `isDone`, `joinAnswer`
- vòng `ask()`: tìm tab → kiểm có ô nhập → đếm → đặt prompt → chờ 300 ms → click → poll 1 s → xong/hết giờ

Mỗi site là một object `Site`:
```ts
type Site = { name: string; isUrl(u: string): boolean; isLogin?(u: string): boolean; newChatUrl?: string;
  js: { hasInput: string; count: string; setPrompt(p: string): string; click: string; snap: string };
  errors: { noChrome: string; noTab: string; notSignedIn: string; noInput: string; noSend: string } };
```
- `MUSE` chứa đúng các script và câu báo lỗi hiện có. `muse-core.ts` chỉ còn re-export `museAsk = ask(MUSE, …)` và `museStatus`, để `mcp/muse.ts`, `hub/muse-member.ts` và test hiện tại không phải sửa.
- `DUCK` dùng các selector ở §2. `isUrl` so host đã parse: `duck.ai` hoặc `duckduckgo.com` có `ia=chat`, không dùng `includes` trên chuỗi.
- Thêm một bước kiểm chống bot cho DUCK. Nếu trang có challenge/captcha (iframe hoặc chữ "verify you are human" / "unusual traffic") thì ném `WebChatError('needs-user', …)`: dừng ngay, không click gì thêm. **Hộp điều khoản lần đầu của duck.ai thì driver tự bấm đồng ý** (user cho phép 24/10, note [91]), chỉ đúng nút đồng ý của hộp đó; selector đo trong W2.

### 3.2 Chrome nào
Driver nhận `Cdp`. Hub tạo **một** `Cdp` trỏ vào Chrome của hub, cổng `settings.browser.port` (lấy từ `BrowserHost`, hiện là 9333), dùng cho Duck. **User chốt 24/10: Duck chỉ chạy trong trình duyệt ẩn của BAM** (BrowserHost, `--headless=new`, hub/browser.ts), không bao giờ dùng Chrome thường của user.
- BrowserHost chưa chạy thì hub khởi động nó trước lượt Duck; không bao giờ fallback sang :9222 hay Chrome có cửa sổ. Headless nên bot check chỉ báo `needs-user` và dừng.
- Muse: user chốt 24/10 là KHÔNG đụng, vì Muse cần đăng nhập. Muse giữ nguyên :9222; W6 bị huỷ.
- Server MCP `mcp/muse.ts` (dùng từ tab) có thể giữ :9222 làm mặc định, hoặc đọc cùng cổng đó.

### 3.3 Duck dùng driver
`duckTurn()` giữ nguyên lệnh nhớ/quên/xoá, `memory.relevant`, `loadHistory/saveHistory` và hàng đợi của `HubMember`. Chỉ thay transport:
- `buildMessages()` → `flatten()`: ghép thành **một** prompt dạng chữ `[Hệ thống]…[Bộ nhớ]…[Tóm tắt]…[Lịch sử]…[Câu hỏi]`, tối đa `MAX_PROMPT` 8000 ký tự. Khi quá dài thì cắt các lượt cũ nhất trước. Câu hỏi không bao giờ bị cắt; nếu riêng câu hỏi đã quá dài thì cắt câu hỏi như `museTurn`.
- **Mỗi lượt mở một chat mới** (`newChatUrl`), vì lịch sử hub đã có trong prompt. Như vậy không lẫn phòng và không phụ thuộc chat cũ của duck.ai.
- `summarizeOldest()` **bỏ lượt gọi API**. Lịch sử dài thì giữ N lượt gần nhất (theo tổng 12 000 ký tự như hiện nay), phần cũ chỉ để lại ghi chú "(đã bỏ bớt lượt cũ)". Gọi web chat thêm một lượt chỉ để tóm tắt vừa chậm vừa dễ bị chặn.
- Lỗi `needs-user` → post tin system `@you` một lần: "Duck cần bạn mở duck.ai trong Chrome của hub và tự xử lý kiểm tra bot". Profile chuyển trạng thái lỗi, không retry.
- `usage` bỏ (web không trả token).

### 3.4 Gỡ Duck2api
Xoá:
- `hub/duckhost.ts` và `test/duckhost.test.ts`
- `settings.duck` (`exePath`, `port`). Settings cũ vẫn đọc được, key cũ bị bỏ qua.
- Field profile `baseUrl`, `useHubDuck2api`, `timeoutMs`, `experimental`, key Duck (`duck-keys`/`saveAgentKey` nếu chỉ Duck dùng)
- Route `/api/duck/host`, `/api/duck/check`. Giữ `DELETE /api/duck/history`.
- `applyDuck()`
- Kiểm `exePath` của #255
- Trong `chatapi.ts`: chỉ xoá nếu không còn ai import `chatComplete/listModels` (grep trước).

UI:
- Popup "+ Agent › Duck" chỉ còn **Tên**, **Thư mục** và **trạng thái Chrome** (dòng `GET /api/duck/status` giống `/api/muse/status`: Chrome có chạy / có tab duck.ai / đang bận).
- Bỏ: 3 bước Duck2api, Nâng cao, ô key, "dùng Duck2api của hub", khoá i18n `agents.duck.host.*`.

## 4. Ràng buộc
- Gặp CAPTCHA / kiểm tra bot thì **dừng và báo user**. Không click, không tự vượt. Riêng hộp điều khoản lần đầu của duck.ai: tự bấm đồng ý (note [91]).
- Chỉ dùng profile Chrome của hub, không đọc cookie hay storage. Script là chuỗi cố định; prompt đi vào dưới dạng JSON string, như Muse.
- Chỉ nói chuyện với tab có host đúng của site. Không đụng tab khác.
- Mỗi Chrome chỉ chạy một lượt web chat một lúc, Duck và Muse xếp chung hàng nếu dùng chung Chrome, vì mỗi site có tab riêng nhưng cùng tiến trình.
- Prompt rời máy sang duck.ai, nên giữ nguyên lọc bí mật của bộ nhớ (`isSecretText`).

## 5. Task (cho T4 chia, code giao T5)

| # | Việc | File | Xong khi |
|---|---|---|---|
| W1 | Tách `mcp/webchat-core.ts` (driver + `Site`), `MUSE` y hệt hiện tại; `muse-core.ts` re-export | mcp/webchat-core.ts, mcp/muse-core.ts | test muse hiện có xanh nguyên, không sửa test |
| W2 | `DUCK` site theo §2 + kiểm bot (`needs-user`) + tự bấm đồng ý hộp điều khoản lần đầu + chọn model ở chat mới (đo menu `model-picker-button` trước, nếu không ổn định thì bỏ, dùng model mặc định) | mcp/webchat-core.ts, test/webchat.test.ts | test với Cdp giả: gửi, stream (`activeresponse=false`→`true`), xong khi có copy, needs-user không click; hộp điều khoản được bấm đúng 1 nút |
| W3 | Hub: một `Cdp` theo `settings.browser.port`; `duckTurn` dùng driver: `flatten()`, chat mới mỗi lượt, bỏ `summarizeOldest` qua API; `GET /api/duck/status` | hub/duck.ts, hub/server.ts, test/duck.test.ts | test duck: nhớ/quên/xoá giữ nguyên; prompt ≤ 8000 và có câu hỏi; lỗi needs-user báo @you 1 lần |
| W4 | Gỡ Duck2api: duckhost, settings.duck, field profile, route, applyDuck, kiểm exePath #255 | hub/duckhost.ts (xoá), hub/settings.ts, hub/server.ts, tests | full `npm test` xanh; settings cũ có `duck.exePath`/`baseUrl` vẫn load |
| W5 | UI "+ Agent › Duck" như Muse + gỡ phần Duck2api trong Cài đặt + i18n | ui/index.html, shared/i18n/*, test/ui.test.ts | ui.test xanh; frontend chụp 1440/390 |
| W6 | ❌ huỷ (user 24/10): Muse không đụng | hub/server.ts, mcp/muse.ts | Muse trả lời qua :9333 |

Thứ tự: W1 → W2 → W3 → W4 → W5 (W6 huỷ). W1 chỉ tách driver, Muse chạy y hệt. Audit: core-improve audit W1–W4, frontend audit W5.

## 6. Ngoài phạm vi
- Lịch sử chat trên duck.ai (local của trang): không đọc, không đồng bộ.
- Đính kèm ảnh/PDF, Tools, Reasoning mode, Voice của duck.ai.
