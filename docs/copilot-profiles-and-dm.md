# Tính năng mới: chat riêng, nhiều Copilot, tạo agent trong trình duyệt

Dựa trên commit `8b6a752`, `f52195c` (chat riêng), `ef2227e`, `bacbbd7` (Copilot nhiều hồ sơ),
`cbf6418` (tạo agent có chọn thư mục). Cần khởi động lại hub sau khi cập nhật lên các commit này.

## 1. Chat riêng 1-1 với một agent

- Trong danh sách thành viên, bấm vào một agent rồi chọn **Chat riêng** để mở một phòng chỉ giữa
  bạn và agent đó, tách khỏi phòng chung.
- **Ẩn chat riêng** chỉ ẩn khỏi danh sách; lịch sử được giữ lại và mở lại được bất cứ lúc nào bằng
  cách chọn **Chat riêng** với agent đó lần nữa.
- API đứng sau tính năng này: `POST /api/rooms/dm/:sessionId` (tạo/lấy lại phòng riêng),
  `POST /api/rooms/:room/hide` (ẩn).

## 2. Nhiều Copilot, mỗi cái một hồ sơ (profile)

Trước đây hub chỉ chạy được một Copilot. Giờ Settings > Accounts > **Hồ sơ Copilot** cho thêm
nhiều hồ sơ, mỗi hồ sơ là một agent Copilot riêng với thư mục làm việc và tên trong phòng riêng.

1. Đăng nhập Copilot CLI bằng tài khoản Windows đang chạy hub (một lần, dùng chung cho mọi hồ sơ):
   ```
   copilot login
   ```
   hoặc chạy `copilot` rồi gõ `/login` trong phiên đó.
2. Settings > Accounts > Hồ sơ Copilot > **Thêm hồ sơ**: nhập ID (chữ thường, có gạch nối, vd.
   `copilot-work`), tên hiển thị trong phòng, thư mục làm việc tuyệt đối, và thư mục dữ liệu riêng
   nếu muốn tách lịch sử hội thoại với hồ sơ khác.
3. Bật **Cho phép chạy** cho hồ sơ đó; trạng thái chạy và đăng nhập GitHub hiện riêng cho từng hồ
   sơ. **Thử đăng nhập lại** khởi động lại một hồ sơ sau khi đăng nhập xong mà không cần restart hub.
4. Giới hạn 16 hồ sơ; ID và tên phải duy nhất.

API: `GET /api/copilot/profiles`, `POST /api/copilot/profiles/:id {on, confirm}`,
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

# What's new: private chats, multiple Copilot profiles, browser agent creation

Based on commits `8b6a752`, `f52195c` (private chat), `ef2227e`, `bacbbd7` (multi-profile
Copilot), `cbf6418` (agent creation with folder picker). A hub restart is required after updating
to these commits.

## 1. Private 1-1 chat with an agent

- In the member list, click an agent and choose **Chat riêng** (Private chat) to open a room
  shared only between you and that agent, separate from the shared room.
- **Ẩn chat riêng** (Hide private chat) only hides it from the list; history is kept and reopens
  any time by choosing the private chat with that agent again.
- API behind this: `POST /api/rooms/dm/:sessionId` (create/reopen the private room),
  `POST /api/rooms/:room/hide` (hide).

## 2. Multiple Copilots, one per profile

The hub used to run only one Copilot. Settings > Accounts > **Hồ sơ Copilot** (Copilot profiles)
now lets you add several, each its own Copilot agent with its own working folder and room name.

1. Sign in to the Copilot CLI once, as the Windows user running the hub (shared by every profile):
   ```
   copilot login
   ```
   or run `copilot` then type `/login` in that session.
2. Settings > Accounts > Copilot profiles > **Thêm hồ sơ** (Add profile): enter an ID (lowercase,
   hyphenated, e.g. `copilot-work`), the display name in the room, the absolute working folder,
   and an optional separate data folder if you want this profile's conversation history kept apart.
3. Turn on **Cho phép chạy** (Enabled) for that profile; runtime and GitHub sign-in status are
   shown per profile. **Thử đăng nhập lại** (Retry) restarts one profile after signing in, without
   a hub restart.
4. Limit: 16 profiles; IDs and names must be unique.

API: `GET /api/copilot/profiles`, `POST /api/copilot/profiles/:id {on, confirm}`,
`POST /api/copilot/profiles/:id/retry`.

## 3. Permissions per Copilot/agent

Each Copilot profile defaults to **Tự sửa file** (`acceptEdits`): it can read/write files in its
own working folder but not run shell commands on its own. To let a profile run commands (tests,
build, git), go to Settings > Quyền (Permissions) > **Ghi đè theo agent** (Per-agent override), add
that profile's name and set it to `bypass`. The change applies on the agent's next turn, no restart
needed.

## 4. Creating an agent in the browser, with a folder picker

Settings > Accounts > **Tạo agent nền** (Create background agent): the **Chọn thư mục…** (Browse…)
button opens a folder picker instead of typing a path by hand. Before you click **Chạy** (Run), a
review screen shows the room, account, permission and folder that will be used, so you can check
before the agent actually starts.
