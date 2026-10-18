# Thuật ngữ / Glossary

Mọi chuỗi giao diện và thông báo hub dùng đúng bảng này (`shared/i18n/vi.ts`, `shared/i18n/en.ts`). Thêm thuật ngữ mới thì thêm một dòng ở đây trước.

| Tiếng Việt | English | Nghĩa |
|---|---|---|
| phòng | room | Nơi các chat Claude và người dùng nhắn cho nhau. |
| thành viên | member | Một chat Claude đã vào phòng. |
| trưởng phòng | room lead | Thành viên ★ chia việc và tổng hợp báo cáo cho người dùng. |
| biên bản | room notes | Các thỏa thuận lâu dài của phòng, giao lại cho mọi thành viên khi đổi. |
| gọi dậy / đánh thức | wake | Báo cho một thành viên đang chờ rằng có tin mới. |
| hồi sinh | revive | Chạy lại một chat đã đóng ở chế độ nền (`claude --resume`) để nó trả lời phòng. |
| compact | compact | Rút gọn ngữ cảnh của một chat (giữ nguyên tiếng Anh). |
| hồ sơ bàn giao | handoff | Bản tóm tắt để một chat mới làm tiếp việc của chat cũ. |
| worker | worker | Lượt Claude chạy trên API rẻ/free để đọc hoặc sửa thay chat chính (tên riêng). |
| osin | osin | Worker dọn dẹp: bàn giao, rút gọn, dọn biên bản (tên riêng). |
| nhà cung cấp | provider | Nơi cấp API cho worker. |
| hạn mức | usage limit | Phần quota Claude Pro dùng trong cửa sổ 5 giờ hoặc tuần. |
| cài đặt | settings | `~/.bear-agent-manager/settings.json`, dùng chung cho cả máy. |
| sao lưu | backup | Bản chép các chat sang thư mục do người dùng chọn; không bao giờ xoá gì. |

## Tin hệ thống (mẫu chuẩn)

Hub đăng tin hệ thống với `sys: {type, level, agent?, ref?}`; giao diện vẽ trên một đường ray riêng, không giống tin người. Chế độ xem: Ẩn (chỉ lỗi và chat riêng của agent) · Gọn (một dòng) · Đầy đủ (mở rộng).

| Loại (`type`) | Cách hiển thị | Ví dụ |
|---|---|---|
| usage | một thẻ cho mỗi tài khoản, thanh %, cập nhật tại chỗ | Claude Pro (n***@gmail.com) 86%, làm mới lúc 02:00 |
| relay | thẻ mang tên agent, "↩ chat riêng", tối đa 600 ký tự, "Xem thêm" | truong-phong trả lời trong chat riêng |
| wake, tab | một dòng, mức theo `level`; nút "Mở tab" khi tab đã đóng | frontend hết hạn mức, hub dậy lại lúc 20:30 |
| compact, task, update, backup, lead, info | một dòng; cùng loại liền nhau gộp ×n kèm khoảng giờ | frontend đã compact 588k → 10k |
| error (mọi loại có `level: error`) | một dòng, nút đỏ; luôn hiện kể cả chế độ Ẩn | Sao lưu chat không chạy được |
