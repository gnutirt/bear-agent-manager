# Tổng hợp kiến trúc: IDE độc lập, đa tài khoản, Copilot (việc #27)

Ngày 2026-10-19, new-planner. Gộp 3 tài liệu đã có — không viết lại từ đầu:
`2026-10-19-ide-independence-design.md` (D1-D4, cập nhật #25 bởi core-improve, commit 8593f8f),
`2026-10-19-headless-agent-profiles.md` (bea68d3), `2026-10-19-bam-as-ide-gap-analysis.md` (b859952).

## Đã xong (phía Claude, xác nhận bằng code — #25)

D1 (chung chat 2 IDE, công tắc), D2 (Claude A→B khi hết hạn mức), nửa D3 (`POST /api/agents`, autostart không IDE) đã có thật trong code, chưa từng được gắn vào task nên không ai thấy đã xong. Không cần làm lại. Giới hạn kỹ thuật đã xác định rõ, không phải bug: không có đồng bộ real-time 2 chiều giữa 2 IDE (chỉ chung lịch sử đã lưu, tiếp nối tuần tự); 2 tiến trình Claude không được ghi cùng 1 session cùng lúc.

## Còn thiếu thật — việc cần giao (theo vai [24]: code → coder/Coder_No_2/Copilot; audit/cải tiến → Copilot/new-planner/core-improve)

| # | Việc | Dựa trên | Owner đề xuất | Ghi chú |
|---|---|---|---|---|
| M1 | Sửa README: bỏ câu "no npm dependencies" sai từ khi có `@github/copilot-sdk`; ghi rõ `npm install` cần khi dùng Copilot, không cần nếu không dùng | #27 (a) | Coder_No_2 | Nhỏ, 1 dòng |
| M2 | Nối MCP server `room` vào session Copilot qua option `mcpServers` của SDK, để Copilot tự dùng room_tasks/room_note/room_send như Claude, không chỉ trả lời qua hub relay | truong-phong (#1516) | coder | Nền tảng để Copilot "giống Claude" thật sự — không có việc này thì M3 (nhiều Copilot) vẫn chỉ là nhiều cái máy câm tay về room |
| M3 | Triển khai `headless-agent-profiles.md`: `hub/copilot.ts` nhận `profile`, `hub/server.ts` tạo N agent theo `settings.agents.profiles`, migration từ `copilot.autoStart` | bea68d3 (#24, đã duyệt chia 3 việc) | coder (copilot.ts+server.ts), Coder_No_2 (settings.ts schema+migration+perAgent default), Copilot (Settings UI profile) | Giữ nguyên phân công đã gửi ở #24 |
| M4 | D3b lát 1-2 (MVP "BAM như IDE"): nền an toàn workspace (chuẩn hoá path, chặn symlink/root/home/network share) + tạo agent trong browser rõ account/quyền/folder trước khi chạy | b859952 (#26) | coder (nền workspace), frontend (UI tạo agent) | Lát 3-7 (file browser, diff, commit, approval tương tác) để SAU MVP này, chưa giao |
| M5 | D2b — Copilot tự chuyển profile khi hết quota: câu hỏi mở, CHƯA thiết kế code. Trước tiên cần xác nhận SDK Copilot có tín hiệu quota/rate-limit nào không | ide-independence-design.md §D2b (#25) | core-improve (tra tài liệu SDK trước, không code vội) | Không hứa parity với D2 cho tới khi có câu trả lời |

## Thứ tự đề xuất

M1, M2 trước (nhỏ, không phụ thuộc nhau, làm song song được) → M3 (đã có spec sẵn, 3 task rõ ràng) → M4 MVP (lớn hơn, cần workspace an toàn trước UI) → M5 là nghiên cứu mở, không chặn M1-M4, làm bất cứ lúc nào core-improve rảnh.

Tất cả đều TÁI SỬ DỤNG spec/audit đã có — không có việc nào trong bảng trên cần nghiên cứu lại từ đầu.
