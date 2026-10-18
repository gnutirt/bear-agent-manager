---
name: pv-system-design
description: Thiết kế kỹ thuật hệ điện mặt trời (PV) ở giai đoạn thiết kế, trước khi lắp — tính số tấm mỗi chuỗi (string sizing) theo nhiệt độ, số chuỗi song song mỗi MPPT, chọn inverter và tỷ lệ DC/AC, bảo vệ quá dòng chuỗi, sụt áp cáp DC/AC, khoảng cách hàng tránh bóng che, và đối chiếu tiêu chuẩn IEC. Dùng skill này mỗi khi người dùng hỏi nên đấu bao nhiêu tấm một chuỗi, inverter nào hợp với dàn pin, Voc lúc trời lạnh có vượt điện áp inverter không, tiết diện cáp, sụt áp, khoảng cách hàng pin, hoặc cần thuyết minh thiết kế PV, kể cả khi họ không dùng chữ "string sizing". Không dùng cho phân tích dữ liệu vận hành của hệ đang chạy (việc đó là của skill solar-skills:analyze).
---

# Thiết kế kỹ thuật hệ PV

Skill này làm phần tính toán thiết kế: chuỗi, inverter, bảo vệ, cáp, bóng che. Mọi kết quả là bản tính sơ bộ để kỹ sư kiểm tra.

## Nguồn số liệu

- Thông số tấm pin và inverter lấy từ **datasheet** người dùng đưa (Voc, Vmp, Isc, Imp, hệ số nhiệt β_Voc, β_Vmp hoặc γ_Pmax, NOCT/NMOT, dòng cầu chì tối đa; điện áp DC tối đa, dải MPPT, dòng vào tối đa mỗi MPPT, công suất AC). Thiếu số nào thì hỏi, không tự điền "giá trị điển hình".
- Nhiệt độ thiết kế (thấp nhất kỷ lục, cao nhất) lấy từ số liệu khí tượng của địa điểm, người dùng cung cấp hoặc tra nguồn chính thức. Ghi rõ nguồn.
- Công thức và tiêu chuẩn: xem `references/`. Mỗi tiêu chuẩn có trạng thái "đã xác minh" hay "[cần xác minh phiên bản]". Không trích số điều hoặc ngưỡng của tiêu chuẩn mà không có bản gốc.

Lý do: chuỗi quá dài làm Voc lúc sáng sớm mùa lạnh vượt điện áp tối đa của inverter, có thể làm hỏng thiết bị và mất bảo hành. Sai số do đoán thông số thường lớn hơn sai số do công thức.

## Quy trình

1. **Thu thập đầu vào:** datasheet tấm và inverter, số tấm dự kiến, mặt mái/hướng/góc nghiêng, nhiệt độ thiết kế, chiều dài cáp, tiêu chuẩn hoặc yêu cầu của chủ đầu tư/điện lực.
2. **Số tấm mỗi chuỗi:** chạy `scripts/string_sizing.py` (đọc cách dùng ở đầu file). Công thức ở `references/string-sizing.md`.
3. **Số chuỗi mỗi MPPT và bảo vệ quá dòng:** `references/string-sizing.md`, mục dòng điện.
4. **Inverter và tỷ lệ DC/AC:** `references/inverter-selection.md`.
5. **Cáp và sụt áp:** `references/cable-voltage-drop.md`.
6. **Bóng che và khoảng cách hàng:** `references/shading.md`. Tổn thất năng lượng do bóng che phải mô phỏng (PVsyst, SAM, pvlib), không ước lượng bằng một con số cố định.
7. **Đối chiếu tiêu chuẩn:** `references/standards.md`.
8. **Viết thuyết minh** theo mẫu dưới.

## Mẫu đầu ra

```
# Thuyết minh thiết kế PV — [công trình], [ngày]
## Đầu vào (nguồn từng số: datasheet, khí tượng, khảo sát)
## Cấu hình chuỗi
| MPPT | Số chuỗi | Tấm/chuỗi | Voc max (Tmin) | Vmp min (Tmax) | Isc max | Kiểm tra |
## Inverter: công suất AC, tỷ lệ DC/AC, giới hạn
## Bảo vệ: cầu chì chuỗi (có/không, lý do), SPD, cách ly
## Cáp: tiết diện, chiều dài, sụt áp từng đoạn
## Bóng che: khoảng cách hàng, giờ thiết kế, đề xuất mô phỏng
## Tiêu chuẩn áp dụng và mục còn cần xác minh

> Bản tính do AI lập để hỗ trợ thiết kế. Cần kỹ sư có chứng chỉ hành nghề kiểm tra và ký trước khi thi công.
```

Dòng lưu ý cuối mẫu luôn giữ lại.
