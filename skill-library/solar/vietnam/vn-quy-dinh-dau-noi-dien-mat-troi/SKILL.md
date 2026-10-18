---
name: vn-quy-dinh-dau-noi-dien-mat-troi
description: Tra cứu và áp dụng quy định Việt Nam cho điện mặt trời mái nhà tự sản xuất, tự tiêu thụ (Nghị định 135/2024/NĐ-CP) — đối tượng áp dụng, có được bán điện dư lên lưới không và tối đa bao nhiêu, khi nào được miễn giấy phép hoạt động điện lực, thủ tục đăng ký với điện lực, chống phát ngược (zero export). Dùng skill này mỗi khi người dùng hỏi lắp điện mặt trời mái nhà có phải xin phép không, có bán điện cho EVN được không, hệ bao nhiêu kW thì cần giấy phép, thủ tục đấu nối, hoặc soạn hồ sơ/thuyết minh pháp lý cho dự án điện mặt trời mái nhà ở Việt Nam, kể cả khi họ không nêu số hiệu nghị định.
---

# Điện mặt trời mái nhà tự sản xuất, tự tiêu thụ — quy định Việt Nam

Skill này giúp trả lời và soạn hồ sơ pháp lý cho dự án điện mặt trời mái nhà ở Việt Nam. Nó **không** thay văn bản.
Các ngưỡng, thủ tục và đối tượng phải đối chiếu nguyên văn văn bản đang có hiệu lực. Phần kỹ thuật (chuỗi, inverter, cáp) dùng skill `pv-system-design`.

## Căn cứ pháp lý

Đã kiểm tra trên nguồn công khai ngày 2026-10-19 (luatvietnam.vn, lsvn.vn, Deloitte Việt Nam, vneconomy.vn):

| Văn bản | Nội dung | Hiệu lực |
|---|---|---|
| Nghị định 135/2024/NĐ-CP, ban hành 22/10/2024 | Cơ chế, chính sách khuyến khích phát triển điện mặt trời mái nhà tự sản xuất, tự tiêu thụ | Từ ngày ký |

Các điểm chính, **theo bản tóm tắt của các nguồn trên, chưa đối chiếu nguyên văn**:
- Phạm vi: điện mặt trời lắp trên mái công trình xây dựng: nhà ở, trụ sở cơ quan, khu và cụm công nghiệp, khu chế xuất, khu công nghệ cao, khu kinh tế, cơ sở sản xuất kinh doanh.
- Điện dư được bán lên hệ thống điện quốc gia, nhưng không quá 20% công suất lắp đặt (áp dụng cho trường hợp đấu nối lưới theo quy định của nghị định).
- Miễn giấy phép hoạt động điện lực và không giới hạn công suất trong một số trường hợp: không đấu nối lưới, có thiết bị chống phát ngược, hoặc hộ gia đình dưới 100 kW.
- Hộ gia đình, cá nhân lắp cho nhà ở được miễn hoặc không phải điều chỉnh đăng ký kinh doanh.

Chưa xác minh, phải hỏi người dùng hoặc tự tra trước khi dùng:
- Nghị định 135/2024 đã được sửa đổi, bổ sung hay thay thế chưa, nhất là sau Luật Điện lực năm 2024 và các văn bản hướng dẫn. **Hỏi người dùng văn bản đang áp dụng cho ngày nộp hồ sơ.**
- Số điều, khoản của từng điểm trên; giá mua điện dư; mẫu hồ sơ đăng ký; thời hạn trả lời của đơn vị điện lực.
- Yêu cầu kỹ thuật đấu nối và đo đếm của Bộ Công Thương/EVN (thông tư, quy định nội bộ của điện lực).

## Nguyên tắc dùng nguồn

1. Trước khi nêu ngưỡng hay thủ tục, xem trong `references/van-ban/` có nguyên văn nghị định và văn bản sửa đổi không. Có thì trích nguyên văn kèm số điều.
2. Chỉ có bản tóm tắt ở trên thì nói rõ "theo tóm tắt, chưa đối chiếu nguyên văn". Đánh dấu `[cần xác minh]`.
3. Không suy ra quy định cho trường hợp văn bản không nói tới (ví dụ dự án bán toàn bộ điện, điện mặt trời mặt đất, DPPA). Nói rõ là nằm ngoài phạm vi Nghị định 135/2024 và cần văn bản khác.

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
