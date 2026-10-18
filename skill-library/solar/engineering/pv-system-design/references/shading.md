# Bóng che và khoảng cách hàng

## Vị trí mặt trời (công thức thiên văn gần đúng)

    δ = 23.45° × sin( 360/365 × (284 + n) )        (độ xích vĩ, n = ngày thứ n trong năm; công thức Cooper)
    ω = 15° × (giờ mặt trời − 12)                  (góc giờ)
    sin α = sin φ × sin δ + cos φ × cos δ × cos ω  (α = độ cao mặt trời, φ = vĩ độ)
    cos γ_s = (sin α × sin φ − sin δ) / (cos α × cos φ)   (γ_s = góc phương vị tính từ hướng Nam; lấy dấu theo buổi sáng/chiều)

Cần độ chính xác cao thì dùng thuật toán SPA của NREL (pvlib có sẵn: `pvlib.solarposition.get_solarposition`).

## Khoảng cách hàng (mái bằng, mặt đất)

Chiều cao mép sau của hàng trước so với mép trước của hàng sau: h = L × sin(β) (L là chiều dài tấm theo phương nghiêng, β là góc nghiêng).

    d = h × cos(γ_s − γ_panel) / tan(α)        (d = khoảng cách mép–mép theo phương vuông góc với hàng)

Chọn thời điểm thiết kế (thường là đông chí, khoảng 9:00–15:00 giờ mặt trời, ở bắc bán cầu) và ghi rõ trong thuyết minh. Gần xích đạo (ví dụ miền Nam Việt Nam), hướng mặt trời đổi theo mùa, nên kiểm tra cả hạ chí.

## Tổn thất do bóng che

- Bóng che gần (cây, bồn nước, lan can, hàng bên cạnh) phụ thuộc cách đấu chuỗi, diode bypass và MLPE (tối ưu hoá công suất, microinverter). Không có hệ số cố định.
- Ước lượng tổn thất năng lượng năm bằng mô phỏng 3D (PVsyst, SAM, pvlib + mô hình hình học). Báo số mô phỏng kèm tên phần mềm và giả định.
- Chưa mô phỏng thì chỉ nêu nguồn bóng che, giờ và mùa bị ảnh hưởng, và cách giảm: đổi cách đấu chuỗi, MPPT riêng, MLPE, dời vị trí.
