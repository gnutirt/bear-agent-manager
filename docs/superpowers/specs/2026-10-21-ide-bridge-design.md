# Cầu nối IDE (M1) + mở file từ chat (M2) — spec (2026-10-21, function-research)

Lead duyệt M1+M2 ở #3658. M3 (danh sách MCP chung) làm sau M2, M4 hoãn. Task xếp sau #144, owner Copilot.

## Hiện trạng

- `vscode/extension.js` (58 dòng) chỉ nhúng iframe tới hub; `activationEvents: []` nên extension chỉ chạy khi mở view.
- Agent chỉ nói chuyện với IDE được nếu là tab Claude Code (MCP `claude-vscode` của Anthropic). Copilot (`hub/copilot.ts:281`)
  và agent API (`hub/apiagent.ts:79`) chỉ có room MCP.
- Chat đã có chip đường dẫn (`ui/index.html:1162`, menu Xem / Mở thư mục), nhưng chỉ cho **đường dẫn tuyệt đối Windows**
  và không hiểu `:dòng`. Hub kiểm tra quyền bằng `mentionedFile()` (`hub/pathview.ts:15`): đường dẫn phải có nguyên văn trong tin.

## Ràng buộc của lead (bắt buộc)

1. Chỉ 127.0.0.1 + `x-room-token`.
2. Không có tool terminal, không tool nào ghi file qua IDE.
3. `ide_open`, `ide_diff`, `ide_diagnostics` chỉ cho đường dẫn trong cwd của agent: dùng `pathGuard(cwd, 'Read', { file_path }, false)` (`hub/apiagent.ts:119`).
4. `ide_selection` **không** cho agent chạy trên provider ngoài máy (agent API có `prov.tier !== 'local'`, ví dụ deepseek):
   đoạn chủ bôi đen có thể chứa secret. Chỉ tab Claude Code, Copilot và agent API `tier === 'local'`.

## Thay đổi so với đề xuất #3657: long-poll HTTP thay cho WebSocket

Hub không có thư viện WS (chỉ phụ thuộc `@github/copilot-sdk`, `monaco-editor`) và Node không có WS server sẵn. Hub đã dùng
long-poll cho agent (`waiters`, `hub/server.ts:1157`). Vì vậy cầu nối dùng cùng cách đó. Mức bảo mật vẫn như cũ (cùng cổng, cùng token, cùng kiểm tra Host/Origin).
Nếu lead muốn bắt buộc dùng WS thì phải thêm dependency `ws`. Spec này không thêm.

## M1 — cầu nối

### Hub: `hub/ide.ts` (mới, khoảng 100 dòng) + route trong `hub/server.ts`

Tất cả route nằm sau cổng token (`hub/server.ts:1733`).

| Route | Ai gọi | Nội dung |
|---|---|---|
| `POST /api/ide/hello` | extension | `{ client?, folders: string[], focused: boolean }` → `{ client }`. Gọi lúc kích hoạt, khi đổi workspace và khi đổi focus cửa sổ. |
| `GET /api/ide/next?client=` | extension | Long-poll 25 s. Trả `{ req, op, args }` hoặc `{}` khi hết giờ. Lần poll nào cũng gia hạn client. |
| `POST /api/ide/result` | extension | `{ client, req, ok, data?, error? }`. |
| `POST /api/sessions/:sid/ide` | room MCP | `{ op, args }` → kết quả hoặc lỗi. Hub chọn client, kiểm tra quyền và chờ tối đa 10 s. |
| `GET /api/ide/status` | UI | `{ clients: n }`. M2 dùng route này để ẩn hoặc hiện mục menu. |

- **Chọn client:** lấy client có folder chứa cwd của agent (so bằng realpath, khớp dài nhất thắng). Nếu nhiều cửa sổ cùng khớp thì chọn
  cửa sổ `focused`, sau đó đến cửa sổ hello gần nhất. Nếu không có client nào thì báo lỗi `Không có cửa sổ VS Code nào mở thư mục <cwd>`.
- **Hết hạn client:** quá 60 s không poll thì xoá client. Các request đang chờ của client đó trả lỗi.
- **cwd của agent:** với agent API dùng `apiProfileOf(s).cwd`, còn lại dùng `s.cwd`.
- **Kiểm tra trước khi gửi:**
  - Với op có `path`: chạy `pathGuard` (ràng buộc 3), rồi gửi đường dẫn tuyệt đối đã realpath.
  - Với `selection`: kiểm tra ràng buộc 4 ở hub, không để extension tự quyết.
- **Ghi log:** mỗi lệnh ghi một dòng vào `revive.log`, theo mẫu dòng `guard` có sẵn (`hub/server.ts:1903`), không ghi nội dung.

### Room MCP: 4 tool mới trong `mcp/tools.ts` (khoảng 60 dòng)

Tool nào cũng gọi `POST /api/sessions/${sid}/ide`.

| Tool | Tham số | Extension làm | Trả về (giới hạn) |
|---|---|---|---|
| `ide_open` | `path`, `line?`, `endLine?` | `showTextDocument(uri, { preview: true, preserveFocus: true, selection })` | `Opened <path>:<line>` |
| `ide_diagnostics` | `path?` (bỏ trống = cả cwd) | `languages.getDiagnostics()`, lọc file trong cwd | tối đa 200 dòng `path:line:col severity source message` |
| `ide_selection` | — | `activeTextEditor`: file phải nằm trong cwd và không phải file secret (`isSecretFile`) | `path:start-end` + đoạn text, tối đa 20 KB |
| `ide_diff` | `path`, `content` (nội dung đề xuất, tối đa 1 MB), `title?` | Lưu `content` trong bộ nhớ, gắn vào scheme `bear-proposal:` (TextDocumentContentProvider), rồi chạy lệnh `vscode.diff(fileUri, proposalUri, title)` | `Diff shown`. **Không ghi đĩa.** |

Mô tả tool phải ghi rõ: ide_diff chỉ để chủ xem, muốn sửa thật thì dùng Edit; ide_selection có thể bị từ chối.

### Extension: `vscode/extension.js` (thêm khoảng 150 dòng)

- **Kích hoạt:** `activationEvents: ["onStartupFinished"]`, để cầu nối chạy cả khi không mở view.
- **Token:** đọc `path.join(os.homedir(), '.bear-agent-manager', 'token')`, cùng chỗ với `shared/config.ts:19`. Không ghi token vào log.
- **Vòng lặp:** chạy `hello` rồi lặp `next` → thực hiện op → `result`.
  - Nếu hub tắt hoặc trả 401: đợi 5 s rồi `hello` lại. Không hiện thông báo lỗi (hub tắt là chuyện bình thường).
- **Sự kiện:** `workspace.onDidChangeWorkspaceFolders` và `window.onDidChangeWindowState` gọi lại `hello`.
- **Op lạ:** `ok:false, error:'unknown op'`.
- **Op hợp lệ:** chỉ 4 op ở trên, không có op ghi file.
- **Tắt khi deactivate:** dừng vòng lặp bằng AbortController.

### Test M1: `test/ide.test.ts`

Dùng fake client gọi HTTP, theo mẫu `test/helpers.ts`. Các trường hợp cần test:

- **Chọn client:**
  - Có 2 client, folder `D:\a` và `D:\a\b`; agent có cwd `D:\a\b\c`. Phải chọn client `D:\a\b`.
  - Nhiều client cùng khớp: client `focused` thắng.
- **Không có client:** báo lỗi rõ ràng, trả về trong dưới 1 s, không phải chờ hết 10 s.
- **Timeout:** client không trả lời thì báo lỗi sau 10 s. Dùng timer giả hoặc cho timeout là tham số.
- **Client hết hạn:** client quá hạn 60 s bị xoá, request đang chờ của nó báo lỗi.
- **pathGuard:**
  - `ide_open` với `../x` bị từ chối.
  - File `.env` bị từ chối.
  - File trong cwd được gửi đi với đường dẫn tuyệt đối đã realpath.
- **ide_selection:**
  - Agent API có provider `tier:'paid'` bị từ chối ngay ở hub; fake client không nhận được gì.
  - Tab Claude Code và agent `tier:'local'` thì được chuyển tới extension.
- **Token:** gọi không có token thì nhận 401.
- **Tool MCP:** `test/mcp.test.ts` liệt kê thêm 4 tool. Tham số sai kiểu thì báo lỗi như các tool khác.

Phần extension không có test Node, sẽ thử tay theo mục cuối.

## M2 — mở file trong VS Code từ chat (cần M1)

### UI `ui/index.html`

- **Chip mở rộng:**
  - Đường dẫn tuyệt đối có thể kèm `:dòng`, ví dụ `D:\x\a.ts:42`.
  - Đường dẫn tương đối có đuôi file và ít nhất một `/`, ví dụ `hub/server.ts:1733`.
  - Link markdown kiểu `[a.ts:42](hub/a.ts#L42)`, theo định dạng chính agent đang dùng.
  - `data-path` giữ nguyên văn đoạn trong tin (để `mentionedFile` so khớp). `data-line` tách riêng.
- **Menu chip:** thêm mục đầu tiên "Mở trong VS Code" (khoá i18n `path.ide`, có bản vi và en). Mục này chỉ hiện khi `GET /api/ide/status` cho `clients > 0`.
  Lấy status khi mở menu, không poll.
- **Bấm vào:** gọi `POST /api/path/ide { room, id, path, line }`. Thành công thì toast `path.ideOpened`; lỗi thì toast `path.fail`.

### Hub

- **Đường dẫn tương đối trong `mentionedFile`:** thêm tham số `baseDir?`. Đường dẫn tương đối được resolve theo cwd của **người gửi tin**,
  tức session có tên trùng `msg.from` (`apiProfileOf` cho agent API).
  - Tin của user hoặc system, hoặc người gửi không có cwd: vẫn bắt buộc đường dẫn tuyệt đối như cũ.
  - Các kiểm tra hiện có giữ nguyên: nguyên văn trong tin, UNC, `.git`, file secret.
- **Hậu tố dòng:** `:42` và `#L42` được tách ra trước khi realpath. Chuỗi so khớp với tin vẫn là chuỗi gốc.
- **Route `POST /api/path/ide`:** chạy `mentionedFile`, rồi gửi op `open` tới client có folder chứa file (khớp dài nhất), không có thì tới client `focused`.
  Route này **không** qua `pathGuard` vì người bấm là chủ, quyền đã được `mentionedFile` cấp.

### Test M2

- `test/pathview.test.ts`:
  - Đường dẫn tương đối resolve theo cwd người gửi.
  - Tin của user mà có đường dẫn tương đối thì bị từ chối.
  - `:42` và `#L42` được tách đúng.
  - Đường dẫn tương đối có `..` ra ngoài cwd: vẫn mở được nếu có nguyên văn trong tin và không phải secret, giống đường dẫn tuyệt đối hiện nay.
- `test/ide.test.ts`: `/api/path/ide` gửi op `open` với đúng dòng tới fake client.

## Commit

1. `feat(ide): VS Code bridge + ide_open/diagnostics/selection/diff tools` (M1). Phần CHANGELOG ghi vào Unreleased.
2. `feat(ui): open chat paths in VS Code` (M2).

Ngoài ra phải bump `vscode/package.json` lúc release. Việc này của new-planner, không làm trong 2 commit trên.

## Thử tay (sau khi Reload Window, cài lại vsix)

a. Agent gọi `ide_open hub/server.ts 1733`. VS Code mở đúng dòng, focus vẫn ở chỗ đang gõ.
b. Tạo một lỗi TS trong một file. `ide_diagnostics` thấy lỗi đó và không liệt kê file ngoài cwd.
c. Bôi đen code. Tab Claude Code đọc được đoạn đó bằng `ide_selection`. DeepSeek gọi thì bị từ chối.
d. `ide_diff` mở cửa sổ diff, và file trên đĩa không đổi (`git status` sạch).
e. Trong chat, bấm `hub/server.ts:1733` trong tin của agent, chọn "Mở trong VS Code", file mở đúng dòng. Tắt mọi cửa sổ VS Code thì mục này biến mất.
f. Tắt hub rồi bật lại. Trong vòng 10 s extension tự kết nối lại, không có popup lỗi.
