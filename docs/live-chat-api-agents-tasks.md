# Tính năng mới sau 0.9.0

Agent claude-api, chat trực tiếp kèm hộp hỏi quyền, gương tab, Copilot chọn model, việc tự chạy,
`npm run setup --app`. Sau khi cập nhật cần khởi động lại hub. API đầy đủ: [`docs/api.md`](api.md).

## 1. Agent claude-api (chạy bằng API của nhà cung cấp khác)

Một agent Claude Code chạy nền bằng một nhà cung cấp trong `~/.bear-agent-manager/providers.json`
(OpenRouter, Intern AI, Ollama…) thay vì tài khoản Claude của bạn.

- Settings > Accounts > **Hồ sơ agent (Copilot và claude-api)** > thêm hồ sơ kiểu `claude-api`: ID, tên trong phòng, thư mục
  làm việc, nhà cung cấp (`providerId`), model nếu muốn.
- Agent chạy gọn: `claude --bare`, chỉ có công cụ phòng (MCP room). Mỗi lần @tên nó trong phòng là
  nó dậy trả lời, lượt nào cũng vậy.
- Nhà cung cấp ngoài máy: agent **chỉ đọc**, không đọc file bí mật. Nhà cung cấp chạy trên máy
  (Ollama) được sửa file khi hồ sơ đặt `edit: true`.
- Khoá API nằm trong `providers.json`, hub không in ra.

## 2. Chat trực tiếp và hộp hỏi quyền

Trong chat riêng với một agent Claude, nút **Chat trực tiếp** trên đầu khung chat bật một phiên trực
tiếp: chữ hiện dần khi agent đang gõ, lệnh công cụ hiện thành khối gập/mở được, có nút **Dừng**. Khung
này chỉ hiện khi phiên đang chạy.

- Hub chạy một tiến trình `claude` stream-json tiếp nối đúng phiên chat của agent đó. Tin @ trong
  phòng chung cho agent này cũng đi vào chính phiên đó.
- Mở tab của agent trong VS Code hoặc Antigravity thì hub tự dừng chat trực tiếp, để không có hai
  claude cùng ghi một chat.
- Không chạy được với Copilot, agent claude-api, agent đang chạy nền, hoặc khi đã vượt
  `agents.maxBackground`.
- **Hộp hỏi quyền:** khi quyền của agent không phải `bypass` và công cụ chưa nằm trong danh sách
  cho phép, trang hiện hộp **Cho phép / Từ chối**. Không ai bấm sau 120 giây, hoặc chat dừng, thì tính
  là từ chối. Tải lại trang vẫn thấy các hộp đang chờ.
- API: `GET|POST /api/sessions/:id/live`, `POST /api/sessions/:id/live/send`, `.../live/stop`,
  `GET /api/permissions`, `POST /api/permissions/:id {allow}`. Sự kiện SSE `live`, `permission`,
  `permission-done`.

## 3. Gương tab

Những gì bạn gõ thẳng trong tab của một agent (và câu trả lời của nó) được chép vào chat riêng của
agent đó, màu khác, nhãn ghi tên editor (**VS Code**, **Antigravity**). Tin gương không đánh thức ai và không gửi lại cho agent.
Khoá và token bị che. Tắt bằng setting `mirrorTabs`.

## 4. Copilot chọn model

Settings > Accounts > hồ sơ Copilot > ô **Ghi đè model**: nhập ID model Copilot rồi bấm **Lưu model**. Để trống thì
dùng model mặc định của Copilot SDK. Copilot hiện dùng một tài khoản GitHub (hồ sơ `copilot`).

## 5. Việc tự chạy

- Lead tạo việc với `after` (danh sách id): việc đó bị chặn cho tới khi các việc kia xong hết, rồi hub
  tự chuyển sang todo và đánh thức người làm.
- Việc chuyển sang done thì hub đánh thức lead để audit.
- Người làm đang rảnh mà còn việc todo thì hub tự giao việc kế tiếp và đánh thức họ (mỗi người tối
  đa một lần mỗi 10 phút).
- Lead đổi người làm, tiêu đề, chi tiết bằng `room_tasks update` (`owner`, `title`, `detail`,
  `doneWhen`); người khác chỉ đổi được trạng thái, ghi chú, commit của việc mình.

## 6. Cài một lần và cửa sổ app

- `npm run setup`: cài plugin cho từng thư mục cấu hình Claude, in thay đổi quyền và hỏi trước khi
  ghi, chạy lại an toàn. `--dry-run` để xem trước.
- `npm run setup -- --app`: tạo lối tắt **Bear Agent Manager** (Desktop và Start Menu trên Windows)
  mở hub trong Edge/Chrome ở chế độ app. Trang hub cũng có manifest nên dùng được **Cài đặt app** của
  trình duyệt.

---

# What's new after 0.9.0

claude-api agents, live chat with a permission box, tab mirror, Copilot model choice, tasks that run
themselves, `npm run setup --app`. Restart the hub after updating. Full API: [`docs/api.md`](api.md).

## 1. claude-api agents (another provider's API)

A background Claude Code agent that runs on a provider from `~/.bear-agent-manager/providers.json`
(OpenRouter, Intern AI, Ollama…) instead of your Claude account.

- Settings > Accounts > **Agent profiles (Copilot and claude-api)** > add a `claude-api` profile: ID, room name, working
  folder, provider (`providerId`), optional model.
- It runs lean: `claude --bare` with only the room tools (MCP room). Every @its-name in the room
  wakes it, every turn.
- Off-machine providers: the agent **only reads** and never reads secret files. An on-machine
  provider (Ollama) may edit files when the profile sets `edit: true`.
- The API key stays in `providers.json`; the hub never prints it.

## 2. Live chat and the permission box

In a private chat with a Claude agent, the **Live chat** button in the chat header starts a live
session: text appears as the agent types, tool calls show as collapsible blocks, and there is a
**Stop** button. The panel shows only while the session runs.

- The hub runs one `claude` stream-json process that resumes that agent's chat. Room @mentions for
  the agent go into the same live session.
- Opening the agent's tab in VS Code or Antigravity stops the live chat, so two claudes never write
  one chat.
- Not available for Copilot, claude-api agents, an agent running in the background, or past
  `agents.maxBackground`.
- **Permission box:** when the agent's permission mode is not `bypass` and the tool is not
  allowed yet, the page shows **Allow / Deny**. No answer within 120 seconds, or the chat stopping,
  counts as deny. Pending boxes survive a page reload.
- API: `GET|POST /api/sessions/:id/live`, `POST /api/sessions/:id/live/send`, `.../live/stop`,
  `GET /api/permissions`, `POST /api/permissions/:id {allow}`. SSE events `live`, `permission`,
  `permission-done`.

## 3. Tab mirror

What you type directly in an agent's tab (and its reply) is copied into that agent's private chat,
in a different color, labeled with the editor (**VS Code**, **Antigravity**). Mirrored messages wake nobody and are never delivered
back to the agent. Keys and tokens are redacted. Turn it off with the `mirrorTabs` setting.

## 4. Copilot model

Settings > Accounts > Copilot profile > **Model override**: enter a Copilot model ID and click **Save model**. Empty means
the Copilot SDK default. Copilot uses one GitHub account for now (profile `copilot`).

## 5. Tasks that run themselves

- The lead adds a task with `after` (ids): it stays blocked until those are all done, then the hub
  makes it todo and wakes the owner.
- A task set to done wakes the lead to audit it.
- An idle owner with a todo task gets it handed out and is woken (at most once per 10 minutes per
  owner).
- The lead changes owner, title and details with `room_tasks update` (`owner`, `title`, `detail`,
  `doneWhen`); others change only status, note and commit of their own tasks.

## 6. One-step install and app window

- `npm run setup`: installs the plugin for each Claude config dir, prints the permission change and
  asks before writing, safe to re-run. `--dry-run` to preview.
- `npm run setup -- --app`: creates a **Bear Agent Manager** shortcut (Desktop and Start Menu on
  Windows) that opens the hub in Edge/Chrome app mode. The hub page also has a manifest, so the
  browser's **Install app** works.
