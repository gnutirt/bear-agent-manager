---
name: vn-phan-loai-no
description: Hỗ trợ phân loại nợ và tài sản có theo quy định của Ngân hàng Nhà nước Việt Nam — xếp khoản vay vào 5 nhóm nợ, rà soát việc chuyển nhóm, đối chiếu kết quả của ngân hàng với kết quả CIC, soạn báo cáo chất lượng tín dụng và căn cứ trích lập dự phòng. Dùng skill này mỗi khi người dùng nhắc tới phân loại nợ, nhóm nợ, nợ xấu, nợ quá hạn, nợ cần chú ý, cơ cấu lại thời hạn trả nợ, Thông tư 31/2024/TT-NHNN, Thông tư 11/2021/TT-NHNN, trích lập dự phòng rủi ro, hoặc hỏi một khoản vay thuộc nhóm nào, kể cả khi họ không nêu số hiệu văn bản.
---

# Phân loại nợ theo quy định NHNN

Skill này giúp xếp nhóm nợ và rà soát chất lượng tín dụng ở ngân hàng Việt Nam. Nó **không** thay văn bản:
số ngày quá hạn của từng nhóm, các trường hợp chuyển nhóm và tỷ lệ trích lập phải lấy từ văn bản gốc đang có hiệu lực.

## Căn cứ pháp lý

Đã kiểm tra trên nguồn công khai ngày 2026-10-18:

| Văn bản | Nội dung | Hiệu lực |
|---|---|---|
| Thông tư 31/2024/TT-NHNN, ban hành 30/06/2024 | Phân loại tài sản có trong hoạt động của NHTM, TCTD phi ngân hàng, chi nhánh NH nước ngoài. **Thay thế Thông tư 11/2021/TT-NHNN.** | 01/07/2024 |
| Thông tư 37/2025/TT-NHNN | Sửa đổi, bổ sung Thông tư 31/2024/TT-NHNN | cần đọc văn bản |

Theo Thông tư 31/2024, nợ chia 5 nhóm:

| Nhóm | Tên |
|---|---|
| 1 | Nợ đủ tiêu chuẩn |
| 2 | Nợ cần chú ý |
| 3 | Nợ dưới tiêu chuẩn |
| 4 | Nợ nghi ngờ |
| 5 | Nợ có khả năng mất vốn |

Nợ xấu thường hiểu là nhóm 3 đến 5. Định nghĩa chính xác phải đối chiếu văn bản.

Chưa xác minh, phải hỏi người dùng văn bản hoặc tự tra trước khi dùng:
- Số ngày quá hạn làm ranh giới giữa các nhóm, và các trường hợp phải chuyển nhóm theo Thông tư 31/2024 và những điểm Thông tư 37/2025 sửa.
- **Văn bản hiện hành về trích lập dự phòng rủi ro** (tỷ lệ dự phòng cụ thể theo nhóm, dự phòng chung). Thông tư 11/2021 trước đây quy định cả phần này; văn bản thay thế phần trích lập **chưa được xác minh**.
- Ngày ban hành và hiệu lực của Thông tư 37/2025/TT-NHNN.

Nhiều tài liệu trên mạng vẫn trích Thông tư 11/2021. Khi người dùng dẫn Thông tư 11/2021, nhắc rằng phần phân loại đã được thay bằng Thông tư 31/2024, và hỏi họ đang áp dụng cho kỳ nào.

## Nguyên tắc dùng nguồn

1. Trước khi xếp nhóm hoặc nêu tỷ lệ, xem trong `references/van-ban/` có văn bản gốc không. Nếu người dùng dán văn bản vào chat thì dùng văn bản đó.
2. Chỉ dùng số ngày, tỷ lệ, số điều khi thấy chúng trong văn bản đang có. Trích nguyên văn kèm tên văn bản và số điều.
3. Không có văn bản thì nói thẳng: "chưa có văn bản gốc để đối chiếu". Chỉ nêu 5 nhóm nợ ở trên, đánh dấu phần còn lại `[cần xác minh]`.
4. Phân loại theo kỳ: dùng văn bản có hiệu lực tại ngày phân loại, không phải văn bản mới nhất.

Lý do: xếp sai nhóm làm sai số dự phòng và tỷ lệ nợ xấu báo cáo lên NHNN. Đây là sai sót kiểm toán và thanh tra hay bắt.

## Quy trình xếp nhóm một khoản vay

1. Thu thập dữ kiện: dư nợ, lịch trả nợ, số ngày quá hạn gốc và lãi, lịch sử cơ cấu lại, nhóm nợ CIC của khách hàng ở tổ chức khác, đánh giá khả năng trả nợ, ngày phân loại.
2. Xác định văn bản có hiệu lực tại ngày phân loại và kiểm tra có bản gốc chưa.
3. Xếp nhóm theo tiêu chí định lượng (số ngày quá hạn) trong văn bản.
4. Xét các trường hợp bắt buộc chuyển nhóm theo văn bản (ví dụ cơ cấu lại, nhóm CIC cao hơn). Ghi rõ từng trường hợp có áp dụng hay không.
5. Nếu ngân hàng dùng thêm phương pháp định tính hoặc hệ thống xếp hạng nội bộ, ghi kết quả đó riêng và nêu điều kiện văn bản đặt ra.
6. Kết luận nhóm cuối cùng là nhóm cao nhất trong các kết quả bắt buộc. Liệt kê căn cứ của từng bước.

## Mẫu đầu ra

```
# Phân loại nợ — [khách hàng / danh mục], ngày [dd/mm/yyyy]
**Văn bản áp dụng tại ngày phân loại:** [số hiệu, điều — chỉ những cái có bản gốc]
**Chưa đối chiếu:** [ranh giới ngày, tỷ lệ dự phòng…] [cần xác minh]

| Khoản vay | Dư nợ | Quá hạn (ngày) | Nhóm theo quá hạn | Chuyển nhóm bắt buộc | Nhóm CIC | Nhóm cuối | Căn cứ |

## Ghi chú từng khoản
## Ảnh hưởng tới dự phòng (chỉ khi có văn bản trích lập)
## Việc cần người có thẩm quyền quyết định

> Bản này do AI soạn để hỗ trợ, không phải ý kiến pháp lý hay kết luận kiểm toán. Cần bộ phận quản lý rủi ro, luật sư hoặc kiểm toán xác nhận trước khi sử dụng.
```

Dòng lưu ý cuối mẫu luôn giữ lại.
