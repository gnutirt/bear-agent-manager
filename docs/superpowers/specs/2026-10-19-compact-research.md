# Nghiên cứu: compact để tiết kiệm token (việc #19)

Ngày 2026-10-19, core-improve. Số đo lấy từ transcript thật của phòng #bear-agent-manager (thư mục `~/.claude-antigravity/projects/D--Antigravity-bear-agent-manager`; `d--` là cùng thư mục nên chỉ đếm một lần). Chưa code hub.

## 1. Mỗi lượt đọc lại bao nhiêu

| Chat | Lượt | Ctx trung bình/lượt | Ctx cao nhất | Tổng đọc lại | Phần là cache read |
|---|---|---|---|---|---|
| 3e916a8a | 1419 | 505k | 966k | 716 triệu | 98% |
| 5e5443ac (frontend) | 1548 | 402k | 809k | 622 triệu | 98% |
| 3549c8d9 | 1413 | 349k | 768k | 493 triệu | 99% |
| 0d041e33 (coder) | 1198 | 365k | 748k | 437 triệu | 98% |
| 2fcb9404 (core-improve) | 1269 | 335k | 749k | 425 triệu | 97% |
| 2524b6dd (thu-vien-skill) | 609 | 259k | 427k | 158 triệu | 97% |

Mỗi lượt (kể cả lượt chỉ chạy một lệnh) gửi lại toàn bộ ctx. Cache làm mỗi token đọc lại rẻ hơn nhiều so với token mới (giá API: cache read 0,1× input), nhưng hạn mức gói vẫn tính theo lượng dùng, nên ctx lớn đốt hạn mức nhanh. Đây là lý do các agent hết hạn mức 5 giờ trong vài giờ.

## 2. Compact thật đã đo

| Chat | Lúc | Kiểu | Trước → sau | Thời gian |
|---|---|---|---|---|
| 3e916a8a | 15/10 | auto | 968k → 23k | 104 s |
| 3549c8d9 | 16/10 | tay | 771k → 12k | 72 s |
| 5e5443ac | 18/10 | tay (hub) | 589k → 10k | 44 s |
| 0d041e33 | 18/10 | tay (hub) | 344k → 12k | 43 s |
| 23a0d75c | 18/10 | tay (hub) | 318k → 13k | 60 s |
| 2fcb9404 | 17/10 | tay | 238k → 12k | 67 s |
| 2075b3cf | 16/10 | tay | 115k → 11k | 33 s |

Compact đưa mọi chat về 10–23k bất kể to cỡ nào, trong 30–100 giây. Một lần compact tốn khoảng một lượt đọc ctx cũ cộng một bản tóm tắt; nó hoàn vốn ngay ở lượt sau.

## 3. Vì sao ctx phình tới 700–966k

Các agent chạy model cửa sổ 1M. Auto-compact của Claude Code chỉ chạy khi gần đầy CỬA SỔ, tức gần 1M. Cộng thêm quy tắc "chỉ compact khi đã xong + commit" và compact bị đẩy theo hạn mức, nên ctx sống lâu ở mức 300–900k.

Claude Code có sẵn cần chỉnh (đọc từ mã extension 2.1.301, chưa đo trên chat thật):
- `settings.json` → `"modelSettings": { "<model>": { "autoCompactWindow": 200000 } }`: cửa sổ auto-compact cho model đó (100000–1000000 hoặc "auto"). Khoá theo tên model; tên chuẩn khớp cả biến thể `[1m]`.
- Biến môi trường `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: phần trăm cửa sổ để auto-compact. Hub đặt được cho tiến trình nền mà nó tự spawn.

## 4. So sánh cách cắt ctx

| Cách | Ctx sau | Mất gì | Thời gian | Đóng tab? |
|---|---|---|---|---|
| Auto-compact với `autoCompactWindow` thấp | ~10–25k, lặp mỗi khi chạm ngưỡng | chi tiết cũ (tóm tắt giữ việc đang làm) | 30–100 s, trong lượt | Không |
| `/compact` hub chạy nền (`spawnCompact`) | 10–23k (đo ở trên) | như trên | 33–104 s | Có, nếu tab đang mở (nay hub từ chối, d18c375) |
| Hồ sơ bàn giao + session mới (clear-lead) | vài k + hồ sơ | mọi thứ ngoài hồ sơ | ~1 phút | Có |
| osin tóm tắt (API rẻ) | dùng làm hồ sơ, không cắt ctx của chat | không cắt gì | vài phút | Không |

## 5. Đề xuất (chờ duyệt)

1. **Ngưỡng theo vai** (giảm đọc lại ước tính 70–80%: ctx dao động 12k → ngưỡng, trung bình ~½ ngưỡng thay vì 335–505k):
   - Trưởng phòng/planner: 200k.
   - Coder/frontend: 250k (cần nhiều file trong đầu).
   - Agent nền/worker: 150k.
2. **Hub đặt `autoCompactWindow`** cho model đang dùng trong `settings.json` của từng tài khoản. Ghi một khoá, liệt kê trước, bấm xác nhận, gỡ được. Mức đặt theo tài khoản là ngưỡng của vai lớn nhất (250k), vì cài đặt áp cho cả tài khoản chứ không theo agent.
   - Với tiến trình nền hub tự spawn, đặt `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` theo vai của agent.
   - Đây là cách "compact không đóng tab" duy nhất, vì hub không gõ được `/compact` vào tab IDE.
3. **Giữ chặn pre-compact (`agentCompact.hold`) chỉ cho agent cần**. Mặc định để auto, vì `hold` đẩy ctx lên cao.
4. **Hồ sơ bàn giao trước compact:**
   - Hook PreCompact (đã có) kích osin viết hồ sơ (`autoJobs.handoff`).
   - SessionStart(compact) đưa hồ sơ + task đang mở vào lại.
   - Với chế độ này, "đã xong + commit" không còn là điều kiện bắt buộc, vì compact giữ việc đang làm.
5. **Sức khoẻ:**
   - Thẻ vàng khi ctx > 300k, đỏ > 500k.
   - Một tin sys có nút "Compact" cho agent offline/đã xong.
   - Agent có tab mở thì nhắc gõ `/compact` hoặc hạ `autoCompactWindow`.

## 6. Cần xác minh trước khi code

- Đặt `autoCompactWindow: 200000` trên một chat thử: auto-compact chạy ở đúng mức nào (ngưỡng tuyệt đối hay phần trăm của nó), có chạy giữa lượt không, PreCompact hook có nhận `trigger: auto` không.
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` tính theo cửa sổ nào khi đã đặt `autoCompactWindow`.

## 7. Đã thử (2026-10-19, chat thử haiku, không đụng cài đặt tài khoản)

- Lượt 1 đưa ctx lên ~198k (cửa sổ haiku 200k). Lượt 2 resume với `--settings` có `modelSettings.<model>.autoCompactWindow: 100000`: KHÔNG compact. Lượt 3 với `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=40`: KHÔNG compact.
- Ở 99% cửa sổ mà vẫn không compact cho thấy chế độ `claude -p` (mọi tiến trình nền của hub) có lẽ không tự compact. Vậy với agent nền, hub phải tự chạy `/compact` (đã có `spawnCompact`) theo ngưỡng; cần chỉnh tự compact chỉ có ích cho tab tương tác.
- Còn phải thử trên chat tương tác: thư mục thử có `.claude/settings.json` cấp project (`autoCompactWindow: 100000`), mở bằng VS Code, dán nội dung `big.txt` rồi gửi thêm một tin, xem có dòng compact tự động không.

## Nguồn

- Transcript thật (bảng 1, 2), quét bằng script đọc `message.usage` và dòng `compact_boundary.compactMetadata`.
- Mã extension Claude Code 2.1.301 (`extension.js`): khoá `modelSettings.<model>.autoCompactWindow` (mô tả "Auto-compact window for this model, in tokens (100000 to 1000000), or "auto""), biến `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`.
