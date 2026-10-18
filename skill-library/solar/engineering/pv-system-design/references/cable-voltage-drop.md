# Cáp và sụt áp

## Điện trở dây

    ρ_T = ρ_20 × [1 + α × (T − 20)]
    ρ_20 (đồng) ≈ 0.0175 Ω·mm²/m,  α (đồng) ≈ 0.00393 /°C
    ρ_20 (nhôm) ≈ 0.0282 Ω·mm²/m,  α (nhôm) ≈ 0.00403 /°C

Dùng nhiệt độ làm việc của dây (ví dụ 70 °C với dây đồng: ρ ≈ 0.0175 × 1.197 ≈ 0.0209). Nếu có điện trở/km trên datasheet cáp thì dùng số đó.

## Sụt áp

DC (đi và về, L là chiều dài một chiều, mét; A là tiết diện, mm²):

    ΔV = 2 × L × I × ρ / A          ΔV% = ΔV / V × 100

AC một pha:   ΔV = 2 × L × I × (R cosφ + X sinφ)
AC ba pha:    ΔV = √3 × L × I × (R cosφ + X sinφ)
(R, X tính theo Ω/m của cáp; với cáp nhỏ, X thường bỏ qua được.)

Dùng I = Imp (đánh giá tổn thất khi vận hành) và V = Vmp của chuỗi cho phía DC; dùng dòng định mức inverter cho phía AC.

## Mức sụt áp chấp nhận

Không có một con số chung cho mọi dự án. Thông lệ thiết kế PV thường giữ khoảng 1–3% cho mỗi phía DC và AC.
IEC 60364-5-52 (phụ lục về sụt áp) có khuyến nghị cho mạch điện công trình: **[cần xác minh phiên bản và giá trị]**.
Theo yêu cầu của chủ đầu tư nếu có.

## Chọn tiết diện

Tiết diện phải thoả cả ba điều kiện: khả năng mang dòng (theo cách lắp và hệ số suy giảm do nhiệt độ hoặc đi chung máng), sụt áp, và chịu ngắn mạch.
Cáp DC dùng loại chuyên cho PV (ví dụ theo EN 50618 / IEC 62930).
