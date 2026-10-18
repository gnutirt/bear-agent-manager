# Chọn inverter

Kiểm tra theo datasheet inverter, từng mục một:

1. **Điện áp DC tối đa** ≥ Voc_max của chuỗi dài nhất (xem `string-sizing.md`).
2. **Dải MPPT** chứa Vmp của chuỗi ở cả nhiệt độ nóng nhất và lạnh nhất.
3. **Dòng vào mỗi MPPT:** Isc_max tổng ≤ dòng ngắn mạch tối đa cho phép; Imp tổng so với dòng vào tối đa.
4. **Số MPPT:** mỗi mặt mái có hướng hoặc độ nghiêng khác nhau nên vào MPPT riêng. Các chuỗi chung một MPPT phải cùng số tấm, cùng hướng và cùng độ nghiêng.
5. **Tỷ lệ DC/AC** = P_dc (kWp) / P_ac (kW). Đây là lựa chọn kinh tế, không phải giới hạn của tiêu chuẩn. Thực tế hay dùng khoảng 1.1–1.3; tỷ lệ cao hơn sẽ cắt ngọn (clipping) vào giờ nắng mạnh. Tổn thất do cắt ngọn phải lấy từ mô phỏng theo giờ, không đoán. Nhiều hãng còn ghi giới hạn tỷ lệ DC/AC tối đa trong datasheet: tuân theo giới hạn đó.
6. **Phía AC:** số pha, điện áp lưới, yêu cầu của điện lực về công suất phát lên lưới, chống phát ngược (zero export) nếu có.
7. **Chứng nhận:** an toàn inverter IEC 62109-1/-2. Yêu cầu đấu nối lưới thì theo quy định của điện lực địa phương: hỏi người dùng văn bản áp dụng.
