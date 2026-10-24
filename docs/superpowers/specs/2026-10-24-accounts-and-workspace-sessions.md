# BAM quản lý tài khoản Claude + nhận biết phiên theo thư mục ở 3 nơi (spec, #274)

Ngày 2026-10-24. Yêu cầu user (DM): phiên chat Claude dùng chung ở 3 nơi là tab VS Code, tab Antigravity và nền BAM. Mỗi thư mục làm việc (`cwd` → `<configDir>/projects/<cwd mã hoá>/`) là "chủ đề gốc" của các phiên trong đó. BAM phải tự nhận biết phiên nào đang chạy ở đâu và bằng tài khoản nào. Khi chuyển nơi chạy hoặc đổi tài khoản, phiên phải liền mạch và không bao giờ có 2 nơi cùng ghi một phiên. Spec này chỉ mô tả, chưa có code.

## Đã có (không làm lại)

Xem `docs/superpowers/specs/2026-10-19-ide-independence-design.md` (D1–D3):

- Danh sách tài khoản: `GET /api/accounts` (`hub/accounts.ts`, `listAccounts`). Chỉ nhận thư mục thật sự là của Claude (`looksLikeClaudeDir`), nên bỏ qua `~/.claude-mem`.
- Chung chat: `projects/` của tài khoản phụ là junction tới tài khoản chính, nên cùng `cwd` là cùng file transcript. Bật/gỡ qua `POST /api/accounts/share`, có kế hoạch trước và xác nhận.
- Tự đổi tài khoản khi hết hạn mức: `hub/accountswitch.ts` (`pickAccount`, `carrySessionDirs`), chạy qua đường wake/revive.
- Chống 2 tiến trình trên 1 phiên, nằm ở `hub/server.ts`:
  - `tabHolds` (:1179) tính từ `liveKinds(s.pids)`;
  - `open-tab` (:2997) từ chối khi phiên đang chạy, `endBackground` trước khi mở tab;
  - #177 cảnh báo 1 phiên mở ở 2 tab và không mở tab lần 2 trong vòng 2 phút.
- Hook gửi lên hub `ide`, `configDir`, `pid` (kèm cờ headless) của mỗi tiến trình claude (`Session.ide/configDir/pids`, `hub/store.ts:19-42`).

## Khoảng trống đo được

1. **Nhãn `ide` của phiên không cho biết phiên đang chạy ở đâu.** Đếm trong `state.json` lúc 24/10:
   - 6 phiên ghi `ide=vscode` nhưng `configDir=~/.claude-antigravity`;
   - 11 phiên ghi `vscode` với configDir rỗng;
   - 8 phiên không có cả hai.

   Lý do: `ide` và `configDir` được giữ ở cấp phiên và ghi đè theo lần đăng ký gần nhất, còn `pids` chỉ có cờ `headless`. Hub vì vậy không trả lời được câu "tiến trình đang sống của phiên này là tab IDE nào, chạy tài khoản nào".
2. **Trạng thái đăng nhập chỉ dựa vào việc file `.credentials.json` có tồn tại** (`accounts.ts:35`). Không biết email, gói, hay token đã hết hạn chưa (D2 đang cần điều này cho tài khoản hdbank).
3. **Chưa đăng nhập hoặc thêm tài khoản được từ BAM.** User phải tự mở terminal và tự đặt `CLAUDE_CONFIG_DIR`.
4. **Chưa có màn hình xem theo thư mục.** UI chỉ có danh sách agent theo phòng. Các chat trong `projects/<slug>` chưa từng vào phòng thì BAM không thấy.
5. **Chưa có thao tác "chuyển nơi chạy"** (tab → nền, nền → tab IDE khác, đổi tài khoản) theo trình tự an toàn. `closeTab` không dùng được vì giết tab và báo "exited with code 1".

## Thiết kế

### Đăng nhập (T1)
- Claude Code 2.1.302 có sẵn `claude auth login|logout|status`. `claude auth status --json` trả `loggedIn`, `authMethod`, `email`, `subscriptionType`, `orgName`, `configDirectory`, `projectsDirectory` và **không có token** (đã chạy thử trên `~/.claude-antigravity`).
- Trạng thái: `GET /api/accounts` chạy `claude auth status --json` với `CLAUDE_CONFIG_DIR=<dir>` cho mỗi tài khoản:
  - kết quả lưu cache 60 giây, mỗi lần chạy giới hạn 10 giây;
  - danh sách trường được lấy là cố định: `loggedIn`, `email`, `subscriptionType`, `orgName`, `authMethod`;
  - lỗi hoặc hết thời gian thì báo `loggedIn: null` kèm lý do;
  - bỏ kiểu kiểm tra chỉ dựa trên file tồn tại.
- Đăng nhập: `POST /api/accounts/login {dir}` (chỉ nhận `dir` nằm trong danh sách tài khoản) mở **một cửa sổ console riêng**: `cmd /c start "BAM login <label>" cmd /k claude auth login`, kèm env `CLAUDE_CONFIG_DIR=<dir>`, `stdio: 'ignore'`, `detached`. BAM không đọc output, user đăng nhập trên trình duyệt. Khi xong, UI bấm "Kiểm tra lại" để đọc status, không cache.
- Đăng xuất: `POST /api/accounts/logout {dir, confirm}` chạy `claude auth logout`, có xác nhận trên UI.
- Thêm tài khoản: `POST /api/accounts/new {name}`.
  - `name` khớp `^[a-z0-9-]{1,32}$`, tạo `~/.claude-<name>`, từ chối nếu đã tồn tại.
  - Đi tiếp qua kế hoạch chung chat (`planShare`), rồi mở cửa sổ login như trên.
- **`claude setup-token` không dùng.** Lệnh này in ra một token dài hạn, và người dùng phải tự giữ token đó trong `CLAUDE_CODE_OAUTH_TOKEN`. Nếu BAM chạy hộ thì BAM phải lưu token, trái quy định. Chỉ ghi trong tài liệu cho người tự dùng.

### Nơi giữ phiên (T2)
- `pids[]` ghi thêm `ide` và `configDir` của chính tiến trình đó, lấy từ register và hook. Kiểu mới: `{ pid, headless, ide, configDir, at }`. `Session.ide/configDir` chỉ còn là "lần gần nhất" để hiển thị khi phiên offline.
- Hàm dùng chung `holderOf(s)`:
  - đọc mọi pid còn sống;
  - trả `{ where: 'vscode'|'antigravity'|'cursor'|'cli'|'bam'|'none', account: configDir, pid, count }`;
  - `count > 1` nghĩa là đang có 2 nơi cùng giữ, đúng ca #177.
- Mọi đường khởi động đều đi qua `holderOf` thay cho các điều kiện rải rác (`tabHolds`, `waiters`, `reviving`): open-tab, revive, account switch, livechat, compact. Dùng chung một thông báo lỗi: "<tên> đang chạy ở <nơi> (tài khoản <email>)".

### Màn hình theo thư mục (T3)
- `GET /api/workspaces` nhóm phiên theo `cwd` đã chuẩn hoá: realpath, chữ thường trên Windows, cùng cách tính với `projectSlug`. Mỗi thư mục gồm:
  - các phiên của hub, mỗi phiên kèm `holderOf`, email tài khoản (từ cache T1), tên, phòng, thời điểm hoạt động cuối, `hasTranscript`;
  - `unregistered`: số file `.jsonl` trong `projects/<slug>` không thuộc phiên nào của hub (chat ngoài phòng). Chỉ đếm và lấy mtime, không đọc nội dung.
- UI có tab "Thư mục": mỗi thư mục là một nhóm. Mỗi phiên hiện huy hiệu nơi chạy (VS Code / Antigravity / BAM nền / tắt) và email. Có cảnh báo đỏ khi `count > 1`.

### Chuyển nơi chạy, đổi tài khoản (T4)
- `POST /api/sessions/:id/move {to: 'vscode'|'antigravity'|'bam', account?: dir}`. Hub chạy theo trình tự sau, mỗi bước có tin hệ thống trong phòng:
  1. Kiểm tra `holderOf`. Nếu đích trùng nơi đang chạy thì không làm gì.
  2. Nếu đang chạy nền: `endBackground`, chờ pid chết (tối đa 30 giây).
  3. Nếu đang ở một tab: hub **không** đóng tab, vì `closeTab` giết tiến trình. UI báo "Đóng tab ở <IDE> rồi BAM tự chuyển". Hub chờ SessionEnd hoặc pid chết, tối đa 10 phút, quá thì huỷ và báo.
  4. Nếu đổi tài khoản: cần chung chat (D1). Chạy `carrySessionDirs(from, to, sid)` như D2. Tài khoản đích phải `loggedIn: true` (T1).
  5. Khởi động ở đích:
     - `bam`: revive bằng `CLAUDE_CONFIG_DIR` của đích;
     - IDE: mở tab qua `tabLink` với IDE đích, ghi đè `s.ide`.

  Tài khoản của một tab IDE là tài khoản mà IDE đó đang chạy, BAM không ép được. Nếu `account` khác tài khoản của IDE đích (lấy từ lần register gần nhất của IDE đó, T2) thì báo trước, không chặn.
- Trong lúc chuyển, phiên bị khoá (`moving: true`): wake, revive và compact không khởi động phiên này.

## Việc giao coder

| # | Việc | File chính | Test |
|---|---|---|---|
| T1 | `auth status` cho từng tài khoản + login/logout/new mở cửa sổ console | `hub/accounts.ts`, `hub/server.ts`, UI tab Tài khoản | `status` giả (`opts.authStatus`) trả email và không có trường token. Login từ chối `dir` lạ và gọi `spawn` với đúng env. Tên tài khoản sai thì 400. |
| T2 | `pids[]` có `ide/configDir` + `holderOf` + thay các điều kiện rải rác | `hub/store.ts`, `hub/server.ts` (open-tab, revive, switch, livechat, compact) | 1 tab VS Code bằng `~/.claude` cộng 1 nền bằng `~/.claude-antigravity` thì `count=2`. open-tab bị từ chối với thông báo có nơi chạy và email. |
| T3 | `GET /api/workspaces` + tab "Thư mục" | `hub/server.ts`, `ui/index.html`, i18n | 2 phiên cùng `cwd`, khác chữ hoa thường hoặc đi qua junction, nằm chung 1 nhóm. File `.jsonl` lạ được đếm vào `unregistered` và không bị đọc. |
| T4 | `move` theo trình tự an toàn + khoá `moving` | `hub/server.ts`, `hub/accountswitch.ts` | Từ nền sang tab: pid nền bị kết thúc trước khi mở tab. Từ tab sang nền: chờ SessionEnd, quá hạn thì huỷ. Đổi tài khoản khi chưa chung chat thì 409. Trong lúc `moving`, một @ không khởi động phiên. |

Thứ tự: T1 và T2 làm song song được vì khác vùng code. T3 làm sau T1 và T2. T4 làm cuối.

## Rủi ro và giới hạn

- Không đọc, sao chép hay in token, `.credentials.json` hoặc `.claude.json`. `auth status` chỉ lấy các trường trong danh sách cố định ở T1, và chỉ ghi log mã thoát.
- Cửa sổ login là do user tự thao tác. Nếu hub chạy không có desktop, ví dụ dạng service, thì `start` không hiện cửa sổ, UI phải báo rõ.
- Hai tab IDE do user tự mở cùng một phiên: hub chỉ cảnh báo, không chặn được (giới hạn đã ghi ở D1).
- `claude auth` có từ bản 2.1.302, nhưng tab Antigravity vẫn chạy extension 2.1.69 (#184). T1 chỉ gọi CLI trong PATH, không phụ thuộc bản extension.
