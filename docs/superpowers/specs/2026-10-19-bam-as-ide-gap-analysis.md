# BAM như IDE: khoảng trống D3 và đề xuất tối thiểu

Ngày 2026-10-19. Audit phạm vi D3 của `ide-independence-design.md`: người dùng mở BAM, chọn repo, tạo agent Claude/Copilot, chat, xem file/diff, quản lý quyền và commit mà không cần mở IDE. Đây là phân tích hiện trạng và chia lát triển khai; chưa thay đổi code.

## Hiện trạng đã có

| Khả năng | Hiện tại |
|---|---|
| Chạy hub không IDE | Có: `npm run hub` hoặc hub autostart tùy chọn; UI browser local. |
| Tạo Claude trong repo | Có: Settings > Accounts có form nhập `cwd`, tên, phòng, tài khoản Claude và prompt. `POST /api/agents` canonicalize đường dẫn local, từ chối root/home và network share, yêu cầu xác nhận nếu folder chưa biết, áp `agents.maxBackground`, rồi spawn Claude headless. |
| Tiếp tục công việc | Có một phần: headless Claude được gọi theo lượt/wake và transcript lưu trong Claude `projects`; có thể mở lại cùng session ở IDE. Đây không phải process IDE tương tác liên tục. Chuyển account Claude có điều kiện qua D2/accountSwitch; không cho hai process cùng ghi một session. |
| Chat | Có: room/chat browser, gửi tin, mention, trạng thái thành viên và lịch sử. |
| Workspace/files | Chưa có file browser, editor hoặc xem file trong BAM. Có nút mở thư mục bằng trình quản lý file của OS, không phải folder picker hay workspace UI. |
| Git | Có trạng thái repo/dirty và danh sách file dirty qua `GET /api/sessions/:id/git`, dùng để cảnh báo trước End/Compact. Không có API/UI xem diff nội dung, stage/unstage hoặc commit. |
| Quyền | Có cấu hình permission mode và per-agent allow/deny trong Settings. Headless không có người trực để xử lý yêu cầu tương tác; `default` không tự approve và `plan` từ chối thao tác, còn `bypass` có quyền rộng. Xác nhận folder mới chỉ là xác nhận chạy agent tại folder, không phải duyệt từng tool/action. |
| Copilot | Chưa tạo được Copilot từ form agent: chỉ có một Copilot cố định ở `ROOT`, với toggle Settings. Spec profile (`headless-agent-profiles.md`) mới là thiết kế, chưa triển khai. |

## Khoảng trống / quyết định

1. **Thêm workspace**: form đường dẫn nhập tay có thể tạo Claude headless ngay, nhưng không có chọn folder trực quan. Vì UI chạy trong browser, không thể tự liệt kê filesystem; cần native folder picker được hub mở và trả path, hoặc tiếp tục nhập path thủ công trong MVP. Giữ kiểm tra local path/canonical path, xác nhận folder chưa biết và giới hạn truy cập theo workspace.
2. **Làm việc với file**: cần danh sách cây file, preview văn bản, trạng thái modified và diff. Bắt đầu read-only; mọi API phải nhận session/workspace ID (không nhận arbitrary absolute path), canonicalize symlink, giới hạn kích thước/số file, loại trừ secrets/binary và không cho path traversal. Editor/write API là lát sau, không cần để chứng minh BAM có thể thay IDE trong chat/review.
3. **Duyệt quyền**: trước mắt cho chọn permission preset rõ ràng lúc tạo agent và cho thấy quyền hiệu lực trước khi start. Muốn approve/deny từng yêu cầu trực tiếp trên UI thì cần giao thức permission request có ID, trạng thái chờ, timeout, SSE và callback từ Claude/Copilot; hiện chưa có đường nối approval UI cho headless. Không nên gọi cấu hình allowlist hiện có là “duyệt trực tiếp”.
4. **Diff và commit**: API git hiện chỉ trả summary/dirty file list. Thêm diff read-only trước; commit cần preview staged diff, chọn file, nhập message, xác nhận rõ ràng và chạy git trong repo đã xác minh. Không tự stage/commit toàn bộ thay đổi không phân biệt agent; repo có nhiều agent/IDE nên file ownership và thay đổi ngoài agent phải được giữ nguyên.
5. **Nhiều provider/profile**: Claude headless đã có account chọn lúc tạo; Copilot profile chưa code và hiện vẫn là một agent. Chỉ nối việc chọn provider/profile sau khi profile lifecycle, auth/home, workspace và concurrency được triển khai; không để UI hứa Copilot tạo workspace/profile trước khi backend có hỗ trợ.

## Các lát code đề xuất

1. **Nền an toàn workspace (backend)** — chuẩn hóa workspace handle/path, xác nhận folder mới, kiểm tra symlink/path containment; lưu provider, account/profile, workspace và permission mode trên agent. Nối với shared headless profile design; test Windows path, root/home, network share, symlink, workspace đã biết/chưa biết.
2. **Tạo agent trong browser (UI)** — đưa thao tác “Thêm folder / Tạo agent” ra khỏi Settings sâu; native folder picker nếu khả thi, nếu không giữ nhập path; tạo Claude trước, hiển thị account, quyền, folder và xác nhận trước khi chạy. Copilot chỉ xuất hiện khi profile backend đã sẵn sàng.
3. **File browser/preview read-only** — duyệt file trong workspace, xem text an toàn, giới hạn file lớn/binary/secrets, refresh trạng thái; không cung cấp tùy ý đọc path ngoài root.
4. **Git diff/review** — xem diff theo file và trạng thái staged/unstaged; test repo tạm, rename/deleted/untracked và repo dirty do người khác sửa.
5. **Commit có xác nhận** — chọn file, preview chính xác nội dung sẽ commit, commit message, xác nhận; không đụng file không chọn hoặc thay đổi ngoài workspace. Thực hiện sau khi diff UI ổn định.
6. **Approval tương tác (tách riêng)** — thiết kế/triển khai permission request lifecycle cho từng provider; nếu chưa có người duyệt, giữ chính sách không tự approve theo mode đã chọn, báo rõ agent bị chặn.
7. **Bổ sung vận hành** — hướng dẫn “dùng BAM không cần IDE”, kiểm thử end-to-end trên repo tạm, quyền truy cập UI local và hành vi restart/resume.

## Ranh giới MVP

MVP “BAM như IDE” nên là: chọn/nhập folder → tạo Claude headless với account và permission preset hiện rõ → chat → xem file và diff read-only → commit file được chọn sau preview/xác nhận. Live approval từng tool, editor toàn diện, Copilot profiles và tự động chuyển provider/account là các giai đoạn riêng. Folder access, shell, Git và quota là quyền của máy/tài khoản người dùng; room membership không phải sandbox.
