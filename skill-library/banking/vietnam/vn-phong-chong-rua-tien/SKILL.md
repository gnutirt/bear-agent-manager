---
name: vn-phong-chong-rua-tien
description: Hỗ trợ công việc phòng, chống rửa tiền (PCRT/AML) theo pháp luật Việt Nam cho ngân hàng và tổ chức tín dụng — nhận biết khách hàng (KYC), đánh giá và phân loại rủi ro khách hàng, rà soát giao dịch đáng ngờ, giao dịch phải báo cáo, lưu giữ hồ sơ, soạn quy định nội bộ hoặc báo cáo PCRT. Dùng skill này mỗi khi người dùng nhắc tới rửa tiền, PCRT, AML, KYC, Luật 14/2022/QH15, Nghị định 19/2023, Thông tư 09/2023/TT-NHNN, giao dịch đáng ngờ, Cục Phòng, chống rửa tiền, hoặc hỏi một khách hàng/giao dịch có phải báo cáo không, kể cả khi họ không nói chữ "rửa tiền".
---

# Phòng, chống rửa tiền theo pháp luật Việt Nam

Skill này giúp làm việc PCRT ở ngân hàng Việt Nam: khung quy trình, cách đọc văn bản, mẫu đầu ra.
Nó **không** thay văn bản pháp luật. Điều khoản, ngưỡng tiền, thời hạn báo cáo thay đổi theo từng lần sửa đổi,
nên mọi con số và số điều phải lấy từ văn bản gốc, không lấy từ trí nhớ.

## Căn cứ pháp lý

Đã kiểm tra trên nguồn công khai ngày 2026-10-18:

| Văn bản | Nội dung | Hiệu lực |
|---|---|---|
| Luật Phòng, chống rửa tiền số 14/2022/QH15, Quốc hội thông qua ngày 15/11/2022 | Luật khung, 4 chương, 66 điều | 01/03/2023 |
| Nghị định 19/2023/NĐ-CP | Quy định chi tiết một số điều của Luật PCRT | cần đọc văn bản |
| Thông tư 09/2023/TT-NHNN | Hướng dẫn thực hiện một số điều của Luật PCRT (đánh giá rủi ro, phân loại khách hàng…) | 28/07/2023 |

Chưa xác minh, phải hỏi người dùng văn bản hoặc tự tra trước khi dùng:
- Mức giá trị giao dịch phải báo cáo (thường được nhắc là 400 triệu đồng, theo một quyết định của Thủ tướng năm 2023): **chưa đối chiếu văn bản gốc**.
- Các văn bản sửa đổi, bổ sung ban hành sau 2023.
- Số điều cụ thể của từng nghĩa vụ.

## Nguyên tắc dùng nguồn

1. Trước khi trả lời câu hỏi về nghĩa vụ cụ thể, xem trong `references/van-ban/` có văn bản gốc không. Nếu người dùng dán văn bản vào chat thì dùng văn bản đó.
2. Chỉ trích số điều, khoản, ngưỡng tiền, thời hạn khi thấy chúng trong văn bản đang có. Trích nguyên văn kèm tên văn bản và số điều.
3. Không có văn bản thì nói thẳng: "chưa có văn bản gốc để đối chiếu". Trình bày ở mức khái niệm, đánh dấu `[cần xác minh]`, và ghi văn bản cần tìm.
4. Chuẩn quốc tế (FATF, Basel) chỉ dùng để tham khảo, ghi rõ không phải quy định Việt Nam.

Lý do: một ngưỡng tiền hoặc thời hạn sai trong quy định nội bộ hay báo cáo gửi cơ quan quản lý có thể khiến ngân hàng bị xử phạt. Nói "chưa chắc" an toàn hơn đoán đúng phần lớn.

## Các mảng công việc

Mỗi mảng dưới đây là một nhóm nghĩa vụ có trong khung pháp luật PCRT. Nội dung chi tiết phải lấy từ văn bản.

- **Nhận biết khách hàng (KYC):** thông tin cần thu thập và xác minh cho cá nhân, tổ chức, chủ sở hữu hưởng lợi; khi nào phải cập nhật.
- **Đánh giá rủi ro:** đánh giá rủi ro của tổ chức và phân loại rủi ro khách hàng (thấp, trung bình, cao), biện pháp tăng cường với khách hàng rủi ro cao và người có ảnh hưởng chính trị.
- **Giao dịch phải báo cáo:** giao dịch có giá trị lớn, giao dịch đáng ngờ, giao dịch chuyển tiền điện tử. Ngưỡng và thời hạn lấy từ văn bản.
- **Lưu giữ hồ sơ, bảo mật thông tin, không tiết lộ việc báo cáo cho khách hàng.**
- **Quy định nội bộ, đào tạo, kiểm toán nội bộ về PCRT.**

## Quy trình

1. Xác định việc người dùng cần: trả lời câu hỏi, rà một hồ sơ hoặc giao dịch, soạn quy định nội bộ, soạn báo cáo hay soạn tài liệu đào tạo.
2. Kiểm tra nguồn theo mục "Nguyên tắc dùng nguồn". Liệt kê văn bản sẽ dùng, đánh dấu cái nào có bản gốc, cái nào chưa có.
3. Với hồ sơ khách hàng hoặc giao dịch: tách dữ kiện, so với từng dấu hiệu hay tiêu chí trong văn bản, ghi dữ kiện nào khớp tiêu chí nào. Không kết luận thay cán bộ có thẩm quyền.
4. Viết đầu ra theo mẫu bên dưới.

## Mẫu đầu ra

```
# [Tên việc] — PCRT
**Căn cứ đã đối chiếu:** [văn bản, điều — chỉ những cái có bản gốc]
**Chưa đối chiếu:** [văn bản hoặc ngưỡng còn thiếu] [cần xác minh]

## Dữ kiện
## Đánh giá theo từng tiêu chí
| Tiêu chí (văn bản, điều) | Dữ kiện | Kết quả |
## Đề xuất
## Việc cần người có thẩm quyền quyết định

> Bản này do AI soạn để hỗ trợ, không phải ý kiến pháp lý. Cần cán bộ PCRT, luật sư hoặc kiểm toán xác nhận trước khi sử dụng.
```

Dòng lưu ý cuối mẫu luôn giữ lại. Người đọc cần biết đây là bản nháp phải được duyệt.
