# Spec: trình duyệt ngầm của BAM cho agent

User 23/10, lần 1: "nhúng được 1 trình duyệt trực tiếp vào BAM".
User 23/10, lần 2 (thay lần 1): "trình duyệt nội bộ… không cần hiện giao diện hay cửa sổ gì cả. Đây là trình duyệt ngầm cho agent xài." (Khoan tính muse/agy.)

Nghiên cứu: function-research.

## Mục tiêu
- BAM tự giữ một Chrome **headless**: không cửa sổ, không tab UI, không xem trực tiếp. Hub bật khi khởi động (nếu đã bật trong Cài đặt) và giữ cho nó sống.
- Agent local dùng Chrome đó qua Playwright MCP (`--cdp-endpoint`) để mở trang, đọc, click, điền form, chụp ảnh, đọc console và network.
- Không còn phụ thuộc Chrome debug bên ngoài mà user phải tự mở.

## Cách làm
1. Hub chạy Chrome với các cờ:
   - `--headless=new`
   - `--remote-debugging-port=<browser.port>` (mặc định 9333) và `--remote-debugging-address=127.0.0.1`
   - `--user-data-dir=<home>/browser/profile`

   Phải dùng hồ sơ riêng, vì Chrome 136+ bỏ qua cờ debug trên hồ sơ mặc định (https://developer.chrome.com/blog/remote-debugging-port).
2. Hub chỉ quản lý vòng đời của Chrome: bật, tắt, tự bật lại tối đa 3 lần trong 10 phút, báo lỗi.
   - Hub không đọc trang, không nói CDP, chỉ cần `/json/version` để biết Chrome đã sống.
3. Agent dùng qua MCP server `bam-browser` ở scope user (thêm bằng `addServer` của #155):
   - Lệnh: `npx -y @playwright/mcp@<bản ghim> --cdp-endpoint http://127.0.0.1:<port> --isolated`.
   - Playwright MCP tự kết nối tới Chrome đó, không tự mở Chrome thứ hai.
   - Mỗi phiên Claude Code chạy một tiến trình MCP riêng, nên nhiều agent cùng nối vào một Chrome. README Playwright MCP: "concurrent MCP clients sharing the same workspace will conflict", và cách tránh là `--isolated`. Với `--isolated`, mỗi agent có browser context riêng (cookie, tab riêng) và context bị xoá khi agent đóng trình duyệt.
   - BAM kiểm tra `enabledPlugins` trong cấu hình Claude local trước khi khởi động hoặc đăng ký `bam-browser`. Nếu plugin Playwright đã bật, BAM không đăng ký MCP thứ hai và chỉ báo trạng thái; tránh trùng bộ tool làm tăng token context. Schema tool của Playwright MCP cũng tiêu thụ token context của agent.

   Phải kiểm trong bước e2e: hai agent mở hai trang cùng lúc mà không giành tab của nhau.

## Ràng buộc
- Không thêm dependency npm cho hub.
- CDP chỉ nghe loopback.
- Là một chức năng bật/tắt, **mặc định BẬT** (`browser.enabled: true`, user 23/10). Một công tắc duy nhất:
  - Bật: hub chạy Chrome ngầm và đăng ký MCP `bam-browser`.
  - Tắt: hub tắt Chrome và gỡ `bam-browser`.
- Máy không có Chrome thì chức năng nằm im: chỉ hiện trạng thái trong Cài đặt, không báo vào phòng, không thử lại liên tục.
- `@playwright/mcp` (bản ghim) do `npx` tải lần đầu khi một agent mở phiên có `bam-browser`. Hub không tự chạy `npm install`. User 23/10 cho mặc định bật, nên thay điều kiện cũ "chỉ tải khi user bấm" của lead.
- Chỉ dành cho agent local. Agent ngoài máy hoặc MCP-C không được nhận tool này và không được thấy cổng (lead).
- Agent không nhập mật khẩu. v1 không có cách đăng nhập trang; trang cần đăng nhập là ngoài phạm vi.

## Ngoài phạm vi v1
- Pane xem hoặc điều khiển trực tiếp trong UI (bản cũ có screencast; đã bỏ theo user).
- Đăng nhập trang: sau này có thể bật `headless: false` một lần để user tự đăng nhập.
- Dùng Chrome này cho muse hoặc duck.
- Tải file, khoá giữa các agent.
