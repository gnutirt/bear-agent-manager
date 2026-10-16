# Khung chat tự cuộn xuống cuối — nghiên cứu & kế hoạch (2026-10-16, research-UI)

Triệu chứng (user báo): khung chat không tự cập nhật xuống tin mới nhất.

## Nguyên nhân (đọc code `ui/index.html`, chưa tái hiện trên trình duyệt)

`renderLog()` quyết định có cuộn hay không bằng cách đo **trước khi render**:
`atBottom = scrollHeight - scrollTop - clientHeight < 80` (dòng 690), rồi sau
`innerHTML` thì `scrollTop = scrollHeight` (dòng 717). Cách đo này sai ở 4 chỗ:

1. **Vùng dưới `#log` đổi chiều cao sau khi đã cuộn.** `#presence`, `#cost`,
   `#notice`, `#banner` và ô soạn (`autosize` cao tới 180px) nằm cùng cột flex.
   Khi chúng cao lên (ví dụ `updateCost()`/`note()` chạy sau khi gửi tin, chip
   presence xuống dòng, gõ tin dài), `#log` bị co lại mà không cuộn bù. Tin cuối bị
   che, khoảng hụt >80px nên lần render sau `atBottom = false` và **khung chat bị
   kẹt ở đó**, tin mới không kéo xuống nữa.
2. **Ngưỡng 80px đo trên DOM cũ.** Nếu render trước đó chưa ghim sát đáy (ảnh,
   font Google tải muộn, tin bị clamp/bỏ clamp), khoảng hụt cộng dồn qua mỗi lần
   render.
3. **Tin do chính mình gửi không ép cuộn.** Đang cuộn lên một chút rồi bấm gửi thì
   tin vừa gửi nằm ngoài màn hình. Các app chat đều cuộn xuống trong trường hợp này.
4. **`renderLog()` chạy lại toàn bộ ở mỗi sự kiện `session`.** Sự kiện này đến liên
   tục mỗi khi activity đổi, nên DOM bị dựng lại nhiều lần. Hệ quả kèm theo: tin đang
   mở "Xem thêm" bị gập lại, vì `dataset.open` không bao giờ được gán (dòng 708).
   Mỗi lần gập lại thì chiều cao nhảy lần nữa.

## Kế hoạch sửa (chỉ đụng `ui/index.html`, không thêm thư viện)

- **T-UI1. Theo dõi "đang dính đáy" bằng ý định của người dùng, không đo lúc render.**
  Thêm biến `S.stick = true`. Thêm listener `scroll` trên `#log`:
  `S.stick = el.scrollHeight - el.scrollTop - el.clientHeight < 40`.
  Trong `renderLog()`, thay `atBottom` bằng `S.stick` (giữ điều kiện đổi phòng).
- **T-UI2. Ghim lại đáy khi layout đổi.** Dùng một `ResizeObserver` theo dõi `#log`
  (khung bị co hoặc giãn) và phần nội dung bên trong (ảnh, font, clamp). Khi
  `S.stick` đang bật thì gán `el.scrollTop = el.scrollHeight`. Cách này sửa nguyên
  nhân 1 và 2 tận gốc.
- **T-UI3. Gửi tin hoặc đổi phòng thì luôn xuống đáy.** Trong `composer.onsubmit`
  sau khi gửi thành công, và trong `select()`: đặt `S.stick = true`, rồi cuộn.
- **T-UI4. Nút "↓ Tin mới".** Khi `S.stick = false` mà có tin mới đến, hiện một nút
  nổi ở đáy `#log`, ghi số tin mới. Bấm vào thì cuộn xuống và `S.stick = true`.
  Nút phải có `aria-label`.
- **T-UI5. Giữ trạng thái "Xem thêm".** Lưu id các tin đang mở vào
  `S.expanded` (một Set). Khi render, tin nào có trong Set thì bỏ qua clamp. Đồng thời
  sự kiện `session` không cần dựng lại cả log; chỉ cần cập nhật receipts, hoặc vẫn
  `renderLog()` nhưng nhờ T-UI1/T-UI2 thì không còn nhảy.
- **Kiểm thử:** UI hiện không có test tự động. Kiểm thủ công bằng trình duyệt (CDP):
  (a) đang ở đáy, agent gửi 20 tin dài liên tiếp thì vẫn ở đáy;
  (b) gõ tin 6 dòng (ô soạn cao lên) thì tin cuối vẫn thấy được;
  (c) cuộn lên đọc thì tin mới đến không kéo xuống, mà hiện nút "↓ Tin mới (n)";
  (d) mở "Xem thêm" một tin, sự kiện session đến thì tin đó vẫn mở;
  (e) chạy trong webview VS Code (iframe), ẩn panel rồi hiện lại thì vẫn ở đáy.

Ước lượng: khoảng 30–40 dòng JS và CSS, một commit. Có thể gộp vào nhóm T11–T14
(review UI) của plan workforce-v2, hoặc làm một task riêng nhỏ chạy trước.
