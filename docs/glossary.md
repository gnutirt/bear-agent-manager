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
