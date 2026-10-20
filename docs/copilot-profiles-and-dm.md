# Tính năng mới: chat riêng, Copilot, tạo agent trong trình duyệt

Dựa trên commit `8b6a752`, `f52195c` (chat riêng), Copilot model settings và `cbf6418` (tạo agent có
chọn thư mục). Cần khởi động lại hub sau khi cập nhật lên các commit này.

## 1. Chat riêng 1-1 với một agent

- Trong danh sách thành viên, bấm vào một agent rồi chọn **Chat riêng** để mở một phòng chỉ giữa
  bạn và agent đó, tách khỏi phòng chung.
- Chỉ bạn và đúng agent đó được vào/gửi tin trong phòng riêng; agent khác, kể cả trưởng phòng,
  không được tham gia. Muốn nhắn agent khác, hãy `@` họ trong phòng chung.
- **Ẩn chat riêng** chỉ ẩn khỏi danh sách; lịch sử được giữ lại và mở lại được bất cứ lúc nào bằng
  cách chọn **Chat riêng** với agent đó lần nữa.
- API đứng sau tính năng này: `POST /api/rooms/dm/:sessionId` (tạo/lấy lại phòng riêng),
  `POST /api/rooms/:room/hide` (ẩn).

## 2. Một tài khoản Copilot, chọn model

Copilot hiện dùng một tài khoản đã đăng nhập, với hồ sơ mặc định `copilot`; không cấu hình nhiều
tài khoản Copilot. Đăng nhập CLI một lần bằng tài khoản Windows đang chạy hub:

```
copilot login
```

Hoặc chạy `copilot` rồi gõ `/login` trong phiên đó. Trong Settings > Accounts > hồ sơ Copilot, chọn
model cho `copilot` và bấm **Lưu model**. Để trống thì Copilot SDK dùng model mặc định; model được
hiển thị cạnh hồ sơ. Tài khoản đăng nhập không tách theo model hay thư mục làm việc.

API hồ sơ: `GET /api/copilot/profiles`, `POST /api/copilot/profiles/:id {on, confirm}`,
`POST /api/copilot/profiles/:id/retry`.

## 3. Quyền của từng Copilot/agent

Mỗi hồ sơ Copilot mặc định chạy ở quyền **Tự sửa file** (`acceptEdits`): tự đọc/ghi file trong thư
mục làm việc của nó, nhưng không tự chạy lệnh shell. Để cho một hồ sơ chạy lệnh (test, build, git),
vào Settings > Quyền > **Ghi đè theo agent**, thêm tên hồ sơ đó và đặt quyền `bypass`. Thay đổi áp
dụng ngay cho lượt tiếp theo của agent, không cần khởi động lại nó.

## 4. Tạo agent trong trình duyệt, chọn thư mục

Settings > Accounts > **Tạo agent nền**: nút **Chọn thư mục…** mở hộp thoại chọn thư mục thay vì
gõ tay đường dẫn. Trước khi bấm **Chạy**, màn hình xem lại hiện rõ phòng, tài khoản, quyền và thư
mục sẽ dùng, để kiểm tra trước khi agent thật sự khởi động.

---

# What's new: private chats, Copilot, browser agent creation

Based on commits `8b6a752`, `f52195c` (private chat), Copilot model settings, and `cbf6418` (agent
creation with folder picker). A hub restart is required after updating to these commits.

## 1. Private 1-1 chat with an agent

- In the member list, click an agent and choose **Private chat** to open a room shared only
  between you and that agent, separate from the shared room.
- Only you and that specific agent may join or send messages in the private room. No other agent,
  including the lead, may participate. To message another agent, `@` them in the shared room.
- **Hide private chat** only hides it from the list; history is kept and reopens any time by
  choosing the private chat with that agent again.
- API behind this: `POST /api/rooms/dm/:sessionId` (create/reopen the private room),
  `POST /api/rooms/:room/hide` (hide).

## 2. One Copilot account, choose a model

Copilot currently uses one signed-in account with the default `copilot` profile; do not configure
multiple Copilot accounts. Sign in to the CLI once as the Windows user running the hub:

```
copilot login
```

Or run `copilot` and type `/login` in that session. In Settings > Accounts > the Copilot profile,
choose a model for `copilot` and click **Save model**. Leave the field blank to use the Copilot SDK
default; the selected model is shown beside the profile. The signed-in account is not separate by
model or working folder.

Profile API: `GET /api/copilot/profiles`, `POST /api/copilot/profiles/:id {on, confirm}`,
`POST /api/copilot/profiles/:id/retry`.

## 3. Permissions per Copilot/agent

Each Copilot profile defaults to **Auto-accept edits** (`acceptEdits`): it can read/write files in
its own working folder but not run shell commands on its own. To let a profile run commands
(tests, build, git), go to Settings > Permissions > **Per-agent overrides**, add that profile's
name and set it to `bypass`. The change applies on the agent's next turn, no restart needed.

## 4. Creating an agent in the browser, with a folder picker

Settings > Accounts > **Create a background agent (no editor needed)**: the **Choose folder…**
button opens a folder picker instead of typing a path by hand. Before you click Run, a review
screen shows the room, account, permission and folder that will be used, so you can check before
the agent actually starts.
