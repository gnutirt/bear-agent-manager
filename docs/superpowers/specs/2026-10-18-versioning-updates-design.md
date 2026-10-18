# Phiên bản và cập nhật từ GitHub (thiết kế)

Ngày 2026-10-18. Yêu cầu của chủ repo: hệ thống phải có phiên bản để cập nhật bằng GitHub (repo công khai: https://github.com/gnutirt/bear-agent-manager). Áp cho mọi máy cài plugin; không hard-code tên phòng hay agent.

## Hiện trạng

Version đang ghi ở 2 chỗ, hiện đều 0.2.0: `package.json` và `.claude-plugin/plugin.json` (`.claude-plugin/marketplace.json` là marketplace cục bộ `bear-agent-manager-local`, nguồn `./`, không có trường version). Mọi chỗ trong spec nói "3 file" nghĩa là hai file này. Chưa có git tag, chưa có GitHub Release, CHANGELOG chỉ có mục "Unreleased". Hub không biết mình đang chạy phiên bản nào và không biết có bản mới.

## Mục tiêu / không làm

Mục tiêu: một nguồn phiên bản duy nhất; hub báo phiên bản đang chạy; kiểm tra bản mới trên GitHub; người dùng thấy và tự quyết cập nhật; quy trình phát hành lặp lại được.

Không làm: tự cập nhật không hỏi; tự chạy script tải về; cập nhật khi người dùng đang có thay đổi chưa commit trong thư mục cài; kiểm tra bản mới khi người dùng tắt.

## Quyết định (người viết tự quyết, chủ repo kiểm)

- **Một nguồn**: `package.json` là nguồn; test bắt buộc `plugin.json`, `marketplace.json` có cùng version, và CHANGELOG có mục cho version đó (hoặc "Unreleased" khi chưa phát hành). Quy tắc số: semver `MAJOR.MINOR.PATCH`; tag Git dạng `vX.Y.Z`.
- **Phát hành** (`scripts/release.mjs <X.Y.Z>`, chạy tay): kiểm tra working tree sạch và test xanh, đổi version ở 3 file, đổi "Unreleased" thành `## X.Y.Z - <ngày>` kèm mục "Unreleased" trống mới, commit `release: vX.Y.Z`, tạo tag `vX.Y.Z`. KHÔNG push; chủ repo push và tạo GitHub Release (nội dung lấy từ CHANGELOG) bằng `gh release create`.
- **Hub biết version**: đọc `package.json` lúc khởi động; `GET /api/version` trả `{ current, latest, url, notes, checkedAt, canApply, reason }`.
- **Kiểm tra bản mới**: hub gọi `GET https://api.github.com/repos/gnutirt/bear-agent-manager/releases/latest` (repo lấy từ `repository` trong package.json, không hard-code trong mã), ghép ETag để không tốn hạn mức, tối đa 1 lần mỗi 6 giờ và khi bấm "Kiểm tra ngay"; lỗi mạng thì giữ kết quả cũ. Không gửi token hay dữ liệu người dùng; chỉ gửi User-Agent `bear-agent-manager/<version>`. Tắt được bằng `settings.updates.check` (mặc định bật). So sánh semver; bỏ qua bản prerelease/draft.
- **Giao diện**: dòng "Phiên bản 0.2.0" ở tab con Chung; khi có bản mới hiện chấm + "Có bản mới 0.3.0" ở thanh bên và nút xem ghi chú phát hành (hiện văn bản, không chạy HTML từ GitHub: luôn escape).
- **Áp dụng cập nhật**: nút "Cập nhật" chỉ bật khi `canApply`: thư mục cài là một git checkout của đúng remote, nhánh sạch (không thay đổi chưa commit), và bản mới là tiến lên (`git merge --ff-only` tới tag `vX.Y.Z` sau `git fetch --tags`). Làm đúng thứ tự: kiểm tra chữ ký/ tag tồn tại → `git fetch` → `merge --ff-only` → chạy test nhanh tải được hub (như cơ chế khởi động thử của nút Restart hub) → báo cần restart hub. Không có `canApply` (cài qua marketplace của Claude Code, hay có thay đổi chưa commit) thì chỉ hiện lời hướng dẫn đúng cách cập nhật (`/plugin marketplace update` rồi `/plugin update`, hoặc `git pull`) kèm `reason`. Không chạy gì sau khi tải ngoài `git` và bản thử khởi động.
- **An toàn** (repo công khai): chỉ tin remote đã cấu hình và tag do chính repo đó công bố; không tải/chạy mã từ URL trong ghi chú phát hành; mọi lệnh `git` dùng `execFile` không shell; ghi nhật ký ở hub.log.

## Giai đoạn

- V1 (@coder): `GET /api/version`, kiểm tra GitHub (ETag, cache 6 giờ, tắt được), `settings.updates.check`, test với `fetch` giả và tên giả, một test khớp version 3 file. Một commit, cần restart hub.
- V2 (@frontend, sau V1): dòng phiên bản, chấm "có bản mới", ghi chú, nút kiểm tra ngay, nút Cập nhật + hướng dẫn khi không áp dụng được, `t()` vi/en, chụp màn hình.
- V3 (@coder, sau V1): `POST /api/update` theo thứ tự an toàn ở trên (+ test trên repo git tạm).
- V4 (@coder): `scripts/release.mjs` + mục "Cách phát hành" trong README. Chủ repo chạy lần đầu phát hành 0.3.0 khi đủ tính năng.

## Cách cài trên máy này (trưởng phòng chốt 2026-10-18, chủ repo giao tự quyết)

Marketplace cục bộ trỏ thẳng thư mục `D:\Antigravity\bear-agent-manager` (`source=directory`, trong `~/.claude/plugins/known_marketplaces.json`); Claude Code giữ một bản chép 0.2.0 ở `plugins/cache/bear-agent-manager-local` và hook/MCP chạy từ bản chép đó. Hệ quả cho V3: `git merge --ff-only` trong thư mục nguồn chỉ cập nhật hub (hub chạy từ thư mục nguồn); hook và MCP trong bản chép chỉ đổi sau khi chạy cập nhật plugin của Claude Code. Nút "Cập nhật" vì vậy tự áp dụng phần thư mục git sạch, rồi hiện đúng lệnh cập nhật plugin cho phần bản chép (và nhắc mở lại các chat để nạp hook mới). Máy khác cài từ marketplace GitHub chỉ nhận hướng dẫn cập nhật plugin. V1 phải báo riêng hai phiên bản: `current` của hub và phiên bản của bản chép plugin (đọc `plugin.json` trong thư mục cài mà hook đang dùng), cảnh báo khi lệch nhau.
