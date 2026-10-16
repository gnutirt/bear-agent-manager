# T-UI2: làm đẹp giao diện

Tác giả: research-UI. Chủ repo duyệt hướng làm ("ok tiến hành"), Boss duyệt P1–P7 ngày 2026-10-16 kèm 2
chỉnh sửa (đã gộp vào P1 và P7). Căn cứ: ảnh `C:\Temp\tui-b.png`, `ui-t12b`, `ui-t13`, `ui-t14`.

Thứ tự (cùng sửa `ui/index.html`): T17 → T10a → **T-UI2**. Không làm song song.

## P1. Chip trạng thái chỉ ở tin mới nhất

`receipts` trong `ui/index.html`: hiện tin nào có `wake` cũng có chip của mọi agent được gọi, kể cả tin cũ.
Agent offline thì mỗi tin có 3 chip đỏ "✕ đã tắt · bấm để gọi dậy", cả khung chat thành màu đỏ.

- Mỗi agent chỉ hiện chip ở **tin mới nhất đã gọi nó**; tin cũ hơn không hiện.
- Giữ trạng thái "chưa nhận" / "đã nhận" ở tin mới nhất đó (read receipt có trong README). Bỏ chip
  "↩ đã trả lời" (câu trả lời đã nằm ngay bên dưới).
- Nút gọi dậy agent offline vẫn có ở thanh presence.

## P2. Cột đọc ở giữa

`.group` rộng tối đa 920px canh trái, `.group.you` 720px canh phải: trên màn hình rộng mắt nhảy zig-zag.
`#log`, presence và composer cùng nằm trong một cột `max-width:820px; margin:0 auto`. Tin của bạn vẫn
canh phải nhưng trong cột đó.

## P3. Đầu sidebar

"Bear Agent Manager" và "đã kết nối" đều xuống 2 dòng. Chỉ hiện "Bear Agent" trên 1 dòng
(`white-space:nowrap`); trạng thái kết nối chỉ còn chấm LED, chữ đưa vào `title`.

## P4. Tab Cài đặt, bảng skill

Mọi skill của mọi plugin là một hàng 3 nút, trang cao khoảng 2400px. Mặc định chỉ hiện các skill **có
rule** của agent đang chọn. Bên dưới có ô "Thêm rule: tìm skill…"; gõ vào thì hiện kết quả tìm, mỗi kết
quả có 3 nút. Nút "Hiện tất cả skill" (gập sẵn) cho ai muốn xem đủ.

## P5. Chiều rộng các tab Worker, Token, Cài đặt

Nội dung tối đa `960px`. Mỗi hàng cài đặt tối đa `720px`, để công tắc / ô số nằm gần nhãn.

## P6. Giảm khung

Mỗi section chỉ một card có viền; bảng bên trong bỏ viền ngoài, chỉ giữ đường kẻ giữa các hàng. Bỏ
tiêu đề h1 trùng tên tab ("Worker" dưới tab Worker), chỉ giữ dòng mô tả.

## P7. Sidebar không lặp tab Worker

Khối "Worker" ở sidebar **gập lại** thành 1 dòng "Worker 1/4 · đang chạy: …", bấm vào thì mở tab Worker.
Khi có worker **lỗi**, dòng đó hiện chấm đỏ để không mất cảnh báo.

## Không làm

Đổi font, đổi palette, đổi bố cục mobile (đều đã ổn), thêm thư viện.

## Kiểm tra

- Ảnh trước / sau trên demo hub (`node scripts/demo-hub.mjs 7797`) ở 1400, 2560 và 700px, đủ 3 theme,
  gửi Boss.
- Test: 2 tin cùng gọi một agent offline thì chỉ tin sau có chip `dead`.
- Khoảng 80–120 dòng, chủ yếu CSS. 2 commit: P1–P3 (tab Phòng), P4–P7 (các tab còn lại).
