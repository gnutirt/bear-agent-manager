# Giao diện: tiếp cận và tương phản

Đo ngày 2026-10-19 trong Chrome thật (phòng bear-agent-manager, dữ liệu thật). Chuẩn: WCAG 2.1 AA, chữ thường ≥ 4.5:1, chữ lớn (≥ 24 px hoặc ≥ 18.66 px đậm) ≥ 3:1.

## Cách đo

- Trong trang: duyệt mọi nút chữ đang hiện, lấy màu chữ và màu nền thật (cộng dồn các lớp nền trong suốt từ phần tử lên gốc), tính tỉ lệ. Script nằm trong lịch sử phòng (tin của frontend); chạy lại bằng cách dán vào console.
- Trong test: `test/ui-contrast.test.ts` đọc bảng màu của `ui/index.html` và kiểm cặp token chính cho MỌI chủ đề: `--text/--bg`, `--text/--panel`, `--mute/--bg`, `--mute/--panel`, `--side-text/--side`, `--side-mute/--side`, và chữ trên màu nhấn (`--on-accent` hoặc trắng / `--accent`). Đổi màu làm tụt dưới 4.5:1 là test đỏ. Hai chủ đề kính (glass, glasslight) có nền trong suốt chồng lên nền động nên chỉ đo trong trình duyệt.

## Kết quả (số chữ không đạt / tổng số nút chữ đang hiện)

| Chủ đề | Trước | Sau, 5 màn hình: Phòng · Việc · Skill · Cài đặt · Sức khoẻ |
|---|---|---|
| light | 47/152 | 0 · 0 · 0 · 0 · 0 |
| gray | 10 | 0 · 0 · 0 · 0 · 0 |
| dark (= auto tối) | 11/162 | 0 · 0 · 0 · 0 · 0 |
| midnight | 2-6 | 0 · 0 · 0 · 0 · 0 |
| nord | 27/175 | 0 · 0 · 0 · 0 · 0 |
| dracula | 6 | 0 · 0 · 0 · 0 · 0 |
| forest | 2 | 0 · 0 · 0 · 0 · 0 |
| sunset | 2 | 0 · 0 · 0 · 0 · 0 |
| glass | 13/162 | 0 · 0 · 0 · 0 · 0 |
| glasslight | 20/152 | 0 · 0 · 0 · 0 · 0 |
| excel | 0 | 0 · 0 · 0 · 0 · 0 |
| solarized | 23 | 0 · 0 · 0 · 0 · 0 |
| rose | 19 | 0 · 0 · 0 · 0 · 0 |
| ocean | 23 | 0 · 0 · 0 · 0 · 0 |

## Quy tắc màu của giao diện

- Chữ trên màu nhấn dùng `var(--on-accent, #fff)`; chủ đề có màu nhấn sáng (dark, nord, dracula, midnight, forest, sunset, glass, auto tối) đặt `--on-accent` là mực tối.
- Chữ màu nhấn trên nền nhạt (`@mention`, `#topic`, số, nút phụ) dùng `color-mix(in srgb, var(--accent) 70-82%, #000)`, không dùng thẳng `--accent`.
- Tên agent theo màu riêng: chủ đề sáng trộn với đen, chủ đề tối trộn với trắng (rule `.group .head>b[data-name]`).
- Màu "xanh/vàng/đỏ" của nhãn trạng thái được trộn với `--text` của chủ đề (`color-mix`), không gắn cứng, nên đọc được ở cả sáng và tối.

## Bàn phím và trình đọc

- Mọi điều khiển có vòng focus 2 px màu nhấn (`:focus-visible`), kể cả select, summary, link, hàng phòng, tab.
- Menu: mũi tên Lên/Xuống, Home, End chuyển giữa mục; Esc đóng và trả focus về nút đã mở. Esc cũng đóng mention, zoom ảnh, tìm kiếm, sửa tên việc.
- Mọi điều khiển hiển thị có tên (71/71). Toast `role=status`; vùng `aria-live` ẩn đọc tin mới của phòng đang xem; `<html lang>` theo ngôn ngữ giao diện.
- Cửa sổ hẹp: ≤ 1100 px thanh trên cùng tự xuống dòng; ≤ 560 px nút chỉ còn biểu tượng và số (nhãn chữ vẫn có cho trình đọc). Không tràn ngang ở 800 px và 400 px.
