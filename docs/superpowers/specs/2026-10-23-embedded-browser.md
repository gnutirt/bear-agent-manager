# Spec: trình duyệt nhúng trong BAM (CDP screencast + Playwright MCP dùng chung)

User 23/10: "nhúng được 1 trình duyệt trực tiếp vào BAM". Nghiên cứu: function-research.

## Mục tiêu
- Tab **Trình duyệt** trong UI BAM (hub web và webview VS Code) hiện trực tiếp một Chrome do BAM giữ. User xem, click, cuộn, gõ được.
- Agent điều khiển **cùng Chrome đó** qua Playwright MCP (`--cdp-endpoint`), nên user thấy agent làm gì và giành lại chuột/phím bất cứ lúc nào.

## Vì sao không dùng iframe
Phần lớn trang chặn nhúng (`X-Frame-Options`, CSP `frame-ancestors`), cookie bên thứ ba trong iframe bị chặn. Simple Browser của VS Code cũng là iframe nên có cùng giới hạn.

## Cách làm
1. Hub chạy Chrome riêng: `--remote-debugging-port=<browser.port>` (mặc định 9333), `--remote-debugging-address=127.0.0.1`, `--user-data-dir=<home>/browser/profile`. Hồ sơ riêng là bắt buộc: Chrome 136+ bỏ qua cờ debug trên hồ sơ mặc định (https://developer.chrome.com/blog/remote-debugging-port). Mặc định `--headless=new` (không bật thêm cửa sổ); có setting để mở dạng cửa sổ.
2. Hub nối CDP bằng `WebSocket` có sẵn của Node, giống `mcp/muse.ts`. Chạy `Page.startScreencast` (jpeg, chất lượng 60). Mỗi `Page.screencastFrame` được ack (`Page.screencastFrameAck`) rồi đẩy tới UI qua **SSE** (cơ chế hub đã có), không thêm WS server.
3. UI vẽ frame lên `<canvas>`. Input gửi lên qua POST: chuột theo toạ độ chuẩn hoá 0..1, hub đổi sang px của trang bằng metadata của frame cuối, rồi gọi `Input.dispatchMouseEvent`. Chữ gõ (kể cả IME tiếng Việt và paste) dùng `Input.insertText`, phím đặc biệt dùng `Input.dispatchKeyEvent`.
4. Agent: nút trong Cài đặt thêm MCP server `bam-browser` ở scope user (dùng `addServer` của #155) chạy `@playwright/mcp@<bản ghim> --cdp-endpoint http://127.0.0.1:<port>`.

Spike đã chạy (headless, hồ sơ tạm): frame đầu tới sau ~0,8 s, mỗi frame ~4 KB, `insertText` và click tới được trang. Chrome chỉ gửi frame khi màn hình đổi.

## Ràng buộc
- Không thêm dependency npm cho hub.
- CDP chỉ nghe loopback; UI không bao giờ nối thẳng vào CDP, mọi thứ đi qua hub có `x-room-token`.
- Mở URL chỉ nhận `http:`, `https:`, `about:blank`.
- Mặc định TẮT (`browser.enabled: false`); user bật trong Cài đặt.
- Agent không nhập mật khẩu. Trang cần đăng nhập thì user tự gõ trong pane.

## Ngoài phạm vi v1
Tải file, hộp chọn file, popup/dialog, nhiều agent giành nhau một tab (v1 không khoá), giao diện trên điện thoại, chỉ báo "agent đang điều khiển".
