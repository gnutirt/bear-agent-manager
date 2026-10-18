# Tính chuỗi (string sizing)

Ký hiệu: STC = điều kiện chuẩn (1000 W/m², 25 °C nhiệt độ cell). Hệ số nhiệt β tính theo %/°C, thường âm với điện áp.

## 1. Điện áp hở mạch lớn nhất (Voc lúc lạnh)

    Voc_max = Voc_STC × [1 + (β_Voc / 100) × (T_cell,min − 25)]

T_cell,min lấy bằng nhiệt độ không khí thấp nhất của địa điểm (sáng sớm, cell chưa được nắng làm nóng).
Số tấm tối đa mỗi chuỗi:

    N_max = floor( V_dc,max(inverter) / Voc_max )

Đây là giới hạn cứng: vượt là có thể hỏng inverter.

## 2. Điện áp làm việc nhỏ nhất (Vmp lúc nóng)

Nhiệt độ cell theo mô hình NOCT (công thức thông dụng, gần đúng):

    T_cell = T_amb + (NOCT − 20) / 800 × G        (G tính W/m²)

    Vmp_min = Vmp_STC × [1 + (β_Vmp / 100) × (T_cell,max − 25)]

Nếu datasheet không có β_Vmp: nói rõ, có thể tạm dùng γ_Pmax làm gần đúng và **ghi là gần đúng**.
Số tấm tối thiểu để chuỗi vẫn nằm trong dải MPPT khi nóng:

    N_min = ceil( V_mppt,min / Vmp_min )

Kiểm tra thêm: N × Vmp ở T_cell,min không vượt V_mppt,max (nếu vượt, inverter vẫn chạy nhưng ngoài dải tối ưu).
Chọn N trong [N_min, N_max]. Nếu N_min > N_max thì cặp tấm/inverter không hợp.

## 3. Dòng điện và số chuỗi song song

    Isc_max = 1.25 × Isc_STC          (hệ số 1.25 cho bức xạ cao; IEC 62548 và NEC 690.8 đều dùng)

- Tổng Isc_max của các chuỗi song song vào một MPPT không vượt dòng ngắn mạch tối đa cho phép của MPPT đó (theo datasheet inverter).
- Tổng Imp có thể vượt dòng vào tối đa (inverter tự giới hạn), nhưng sẽ mất công suất. Ghi rõ nếu có.
- Bảo vệ quá dòng chuỗi: khi có Np chuỗi song song, dòng ngược vào một chuỗi bị sự cố có thể tới (Np − 1) × Isc_max.
  Cần cầu chì chuỗi khi giá trị này vượt dòng cầu chì tối đa của tấm (I_R, "maximum series fuse rating" trên datasheet).
  Thông thường 1–2 chuỗi mỗi đầu vào không cần cầu chì. **Đối chiếu điều khoản của IEC 62548 bản đang áp dụng [cần xác minh phiên bản].**
- Hệ số chọn dây dẫn: NEC (Mỹ) dùng 1.25 × Isc_max = 1.56 × Isc_STC. Dự án theo IEC dùng hệ số của IEC 62548. Ghi rõ dự án theo hệ tiêu chuẩn nào.

## Ví dụ kiểm tra nhanh

Tấm Voc 49.5 V, β_Voc −0.27 %/°C, T_min 10 °C:
Voc_max = 49.5 × [1 + (−0.0027) × (10 − 25)] = 49.5 × 1.0405 ≈ 51.5 V.
Inverter V_dc,max 1000 V → N_max = floor(1000 / 51.5) = 19 tấm.
