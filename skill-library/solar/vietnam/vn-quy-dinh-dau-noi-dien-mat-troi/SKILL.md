---
name: vn-quy-dinh-dau-noi-dien-mat-troi
description: Tra cứu và áp dụng quy định Việt Nam cho điện mặt trời mái nhà tự sản xuất, tự tiêu thụ (Nghị định 58/2025/NĐ-CP, thay Nghị định 135/2024/NĐ-CP) — đối tượng áp dụng, có được bán điện dư lên lưới không và tối đa bao nhiêu, khi nào được miễn giấy phép hoạt động điện lực, thủ tục đăng ký với điện lực, chống phát ngược (zero export). Dùng skill này mỗi khi người dùng hỏi lắp điện mặt trời mái nhà có phải xin phép không, có bán điện cho EVN được không, hệ bao nhiêu kW thì cần giấy phép, thủ tục đấu nối, hoặc soạn hồ sơ/thuyết minh pháp lý cho dự án điện mặt trời mái nhà ở Việt Nam, kể cả khi họ không nêu số hiệu nghị định.
legalAsOf: 2026-10-19
legalDocs: [58/2025/NĐ-CP, 135/2024/NĐ-CP]
---

# Điện mặt trời mái nhà tự sản xuất, tự tiêu thụ — quy định Việt Nam

Skill này giúp trả lời và soạn hồ sơ pháp lý cho dự án điện mặt trời mái nhà ở Việt Nam. Nó **không** thay văn bản.
Các ngưỡng, thủ tục và đối tượng phải đối chiếu nguyên văn văn bản đang có hiệu lực. Phần kỹ thuật (chuỗi, inverter, cáp) dùng skill `pv-system-design`.

## Căn cứ pháp lý

**Chưa đọc được nguyên văn.** Mọi điểm dưới đây lấy từ bài tóm tắt và bình luận của các nguồn ghi ở cuối mục, truy cập ngày 2026-10-19. Đều gắn `[cần xác minh]` cho tới khi có nguyên văn trong `references/van-ban/`.

| Văn bản | Nội dung | Hiệu lực |
|---|---|---|
| Nghị định 58/2025/NĐ-CP | Quy định chi tiết Luật Điện lực về phát triển điện năng lượng tái tạo, điện năng lượng mới, gồm điện mặt trời mái nhà tự sản xuất, tự tiêu thụ. **Thay thế Nghị định 135/2024/NĐ-CP.** | 03/03/2025 [cần xác minh ngày ban hành] |
| Nghị định 135/2024/NĐ-CP, ban hành 22/10/2024 | Văn bản cũ, **hết hiệu lực từ 03/03/2025**. Chỉ dùng khi xét hệ lắp trong thời gian nó còn hiệu lực hoặc khi xét quy định chuyển tiếp. | 22/10/2024 – 02/03/2025 |

Các điểm chính của Nghị định 58/2025 theo tóm tắt `[cần xác minh]`:
- Chia 2 nhóm: hệ đấu nối với hệ thống điện quốc gia, và hệ độc lập không đấu nối.
- Điện dư được bán không quá **20% sản lượng điện thực phát trong tháng**. Lưu ý: Nghị định 135/2024 cũ tính 20% theo **công suất lắp đặt**; nhiều tài liệu trên mạng vẫn ghi theo cách cũ.
- Thông báo hoặc đăng ký tuỳ công suất và việc có bán điện hay không (theo bình luận: dưới 100 kW thông báo; 100 kW đến dưới 1 MW không bán điện thì thông báo; từ 1 MW hoặc có bán điện thì đăng ký). Nơi nhận: Sở Công Thương, đơn vị điện lực, cơ quan quản lý xây dựng và phòng cháy chữa cháy ở địa phương. Số điều và ngưỡng chính xác `[cần xác minh]`.
- Hệ độc lập không đấu nối cũng phải thông báo: công suất, cách đấu nối, mức tiêu thụ dự kiến, mô hình vận hành.
- Có quy định chuyển tiếp cho hệ lắp từ 01/01/2021 tới ngày nghị định có hiệu lực mà chưa làm đủ thủ tục.

Còn phải hỏi người dùng hoặc tự tra:
- Nguyên văn Nghị định 58/2025 (số điều, khoản), và văn bản sửa đổi sau đó nếu có.
- Giá mua điện dư, mẫu hồ sơ, thời hạn trả lời; yêu cầu kỹ thuật đấu nối và đo đếm của Bộ Công Thương/EVN.

Nguồn (truy cập 2026-10-19):
- luatvietan.vn, "Điểm mới của Nghị định 58/2025/NĐ-CP…": https://luatvietan.vn/diem-moi-cua-nghi-dinh-58-2025-nd-cp-trong-phat-trien-dien-nang-luong-tai-tao-dien-nang-luong-moi.html
- lsvn.vn, "Chi tiết trình tự thủ tục đăng ký lắp điện mặt trời mái nhà": https://lsvn.vn/chi-tiet-trinh-tu-thu-tuc-dang-ky-lap-dien-mat-troi-mai-nha-a163110.html
- Nghị định 135/2024 (văn bản cũ): luatvietnam.vn, Deloitte Việt Nam (https://www2.deloitte.com/content/dam/Deloitte/vn/Documents/tax/vn-tax-alert-on-decree-135-rooftop-solar-energy-vi.pdf)

## Nguyên tắc dùng nguồn

1. Trước khi nêu ngưỡng hay thủ tục, xem trong `references/van-ban/` có nguyên văn nghị định và văn bản sửa đổi không. Có thì trích nguyên văn kèm số điều.
2. Chỉ có bản tóm tắt ở trên thì nói rõ "theo tóm tắt, chưa đối chiếu nguyên văn". Đánh dấu `[cần xác minh]`.
3. Không suy ra quy định cho trường hợp văn bản không nói tới (ví dụ dự án bán toàn bộ điện, điện mặt trời mặt đất, DPPA). Nói rõ là nằm ngoài phạm vi quy định về điện mặt trời mái nhà tự sản xuất, tự tiêu thụ và cần văn bản khác.

Lý do: quy định về điện mặt trời mái nhà ở Việt Nam đã đổi nhiều lần trong vài năm gần đây. Trích nhầm quy định cũ có thể làm hỏng hồ sơ hoặc làm khách hàng tính sai hiệu quả đầu tư.

## Quy trình xác định trường hợp áp dụng

1. Hỏi đủ dữ kiện: loại công trình (nhà ở, cơ quan, nhà xưởng, khu công nghiệp), chủ đầu tư (hộ, cá nhân, tổ chức), công suất lắp đặt (kWp/kW), có đấu nối lưới không, có chống phát ngược không, có muốn bán điện dư không, ngày dự kiến nộp hồ sơ.
2. Xác định văn bản có hiệu lực tại ngày đó (mục "Chưa xác minh").
3. Xếp trường hợp: không đấu nối / đấu nối có chống phát ngược / đấu nối có bán điện dư. Với từng trường hợp, ghi yêu cầu giấy phép, đăng ký, giới hạn bán điện theo văn bản.
4. Liệt kê hồ sơ và bước làm với điện lực, chỉ theo những gì có trong văn bản hoặc hướng dẫn mà người dùng cung cấp.

## Mẫu đầu ra

```
# Điện mặt trời mái nhà — [công trình], [công suất], [ngày]
**Văn bản áp dụng:** [số hiệu, điều — ghi "theo tóm tắt" nếu chưa có nguyên văn]
**Chưa đối chiếu:** [văn bản sửa đổi, thủ tục, giá…] [cần xác minh]

## Dữ kiện dự án
## Trường hợp áp dụng
| Câu hỏi | Kết luận | Căn cứ |
| Có cần giấy phép hoạt động điện lực? | | |
| Có được bán điện dư? Tối đa? | | |
| Cần đăng ký/thông báo với điện lực? | | |
## Hồ sơ và các bước
## Việc cần người có thẩm quyền xác nhận

> Bản này do AI soạn để hỗ trợ, không phải ý kiến pháp lý. Cần luật sư hoặc đơn vị điện lực xác nhận trước khi sử dụng.
```

Dòng lưu ý cuối mẫu luôn giữ lại.
