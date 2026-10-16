# Cài Claude Code + Bear Agent Manager trên máy mới

Mọi bước đều có trong skill `/bear-setup`: mở một chat Claude Code và gõ `/bear-setup`, Claude sẽ
chạy kiểm tra, cho bạn xem, rồi mới làm. Trang này để bạn đọc khi cần làm tay.

## Trên máy cũ: xuất cấu hình

```bash
node scripts/machine.mjs check
node scripts/machine.mjs export --dir X:\Coding\claude-mem\machine
```

Hoặc bấm **Xuất cấu hình máy** trong tab Cài đặt của Bear Agent Manager.

Được mang theo: skill, agents, commands, output-styles, keybindings, `CLAUDE.md`, `settings.json`
(bỏ khối `env`), memory của từng project, cài đặt hub, danh sách plugin và marketplace.

Không bao giờ mang theo: file đăng nhập `.credentials.json` và `.claude.json`. Trên máy mới bạn
đăng nhập lại.

Thêm `--with-keys` nếu muốn mang theo key của worker (`providers.json`, khối `env`). Khi đó thư mục
xuất có chứa key: đừng chia sẻ nó.

## Trên máy mới

1. Cài Node ≥ 22.18, clone repo, đăng nhập Claude Code trong VS Code (và Antigravity nếu dùng).
2. `node scripts/machine.mjs import --dir <thư mục xuất>`. File đã có thì bị bỏ qua; thêm `--force`
   để ghi đè (bản cũ được đổi tên thành `.bak-<giờ>`).
3. Chạy các lệnh `claude plugin …` mà bước 2 in ra, **cho từng editor**: plugin không dùng chung,
   Antigravity cài riêng bằng `CLAUDE_CONFIG_DIR=%USERPROFILE%\.claude-antigravity claude plugin install …`.
4. Reload Window.

## VS Code và Antigravity dùng chung chat

VS Code dùng `~/.claude`, Antigravity dùng `~/.claude-antigravity`. Mỗi bên đăng nhập acc riêng và có
quota riêng. Để hai bên thấy cùng các chat, skill và cài đặt:

```bash
node scripts/machine.mjs check        # xem mục nào đã link, settings.json hai bên khác nhau chỗ nào
node scripts/machine.mjs link         # link các mục chưa có dữ liệu riêng
node scripts/machine.mjs link --merge # gộp dữ liệu riêng của Antigravity sang ~/.claude rồi link
```

- Thư mục (`projects`, `hooks`, `file-history`, `paste-cache`, `skills`) được link bằng junction
  (Windows, không cần quyền admin) hoặc symlink (macOS/Linux).
- File (`CLAUDE.md`, `history.jsonl`, `settings.json`) được link bằng hardlink. Link xong, Antigravity
  dùng chung hook và quyền với VS Code.
- `--merge` không xoá gì: bản cũ của Antigravity được giữ lại thành `.bak-<giờ>`.
- Hardlink có thể bị tách khi Claude Code ghi lại file. `check` sẽ báo, và chạy `link` lại là nối lại.
- Đừng mở cùng một chat ở cả hai editor cùng lúc: cả hai sẽ ghi vào một file.
