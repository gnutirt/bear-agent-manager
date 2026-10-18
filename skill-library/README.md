# Thư viện skill (skill-library)

Kho skill dự trữ cho hệ thống bear-agent-manager. Gom ngày 2026-10-18 từ các repo GitHub công khai.
Thư mục này **không** tự nạp vào Claude Code (khác với `skills/` của plugin) — muốn dùng skill nào thì cài skill đó.

Tổng: **151 skill** — Ngân hàng 94 · Slide 11 · Training 12 · Chung 3 · Pháp lý 20 · Solar 11.
Trường `jurisdiction` trong index ghi skill viết theo luật nước nào (`US` hoặc `VN`); giao diện cảnh báo khi dùng skill luật Mỹ cho việc ở Việt Nam. Danh sách máy đọc: `index.json` (tạo lại bằng `node skill-library/build-index.mjs`). Nguồn và giấy phép: `NOTICE.md`.
Vai trò: mỗi skill có `roles` (mặc định là nhóm của nó; ngoại lệ ghi tay ở `roles.json`). Gói vai trò "cốt lõi" (tối đa 8 skill mỗi gói) ở `packs.json`. Mô tả tiếng Việt (`descVi`) ghi tay ở `descriptions.vi.json`. Skill con của `course-training-skills` có trường `bundle`: chỉ chạy khi cài cả bộ. File mà kho gốc vốn thiếu được ghi ở `known-gaps.json`. Kiểm tra: `node --test test/skill-library.test.ts`.

## Cách cài một skill

Chép thư mục chứa `SKILL.md` vào thư mục skill của Claude Code (máy này: `~/.claude-antigravity/skills/`, mặc định: `~/.claude/skills/`):

```powershell
Copy-Item -Recurse skill-library\banking\casemark\assessing-credit-risk "$HOME\.claude-antigravity\skills\"
```

Lưu ý: chỉ cài những skill cần dùng. Mỗi skill đã cài tốn khoảng 100 token trong mọi phiên (phần mô tả luôn được nạp).
Có vài skill trùng tên giữa các nguồn (ví dụ KYC/AML), nên chọn một bản cho mỗi việc.

## Ngân hàng (`banking/`) — 94

| Nhóm | Nguồn · Giấy phép | Skill |
|---|---|---|
| `anthropic-financial-services` (17) | [anthropics/financial-services-plugins](https://github.com/anthropics/financial-services-plugins) · Apache-2.0 | kyc-doc-parse, kyc-rules, gl-recon, break-trace, variance-commentary, accrual-schedule, roll-forward, 3-statement-model, dcf-model, comps-analysis, audit-xls, clean-data-xls, xlsx-author, sector-overview, morning-note, dd-checklist, ic-memo |
| `casemark` (33) | [CaseMark/skills](https://github.com/CaseMark/skills) · Apache-2.0 | assessing-credit-risk, drafting-credit-memos, managing-commercial-loan-underwriting, managing-credit-approval-packages, conducting-credit-committee-presentations, managing-loan-documentation-review, managing-loan-portfolio-monitoring, managing-loan-loss-provisioning, managing-credit-risk-models, managing-credit-portfolio-risk, managing-interest-rate-risk-banking, managing-deposit-operations, managing-fraud-operations-banking, auditing-aml-transactions, managing-bank-regulatory-reporting, analyzing-banking-system-health, managing-correspondent-banking, analyzing-trade-finance-instruments, managing-loan-syndication-processes, structuring-asset-based-lending, managing-commercial-real-estate-lending, managing-construction-lending, analyzing-digital-lending-platforms, managing-open-banking-integration, managing-private-banking-reviews, managing-liquidity-risk, analyzing-liquidity-risk, conducting-stress-testing, managing-treasury-management-services, modeling-default-and-recovery-analysis, evaluating-sustainability-linked-loans, evaluating-green-bonds, analyzing-esg-integration |
| `second-line` (27) | [anotb/second-line-financial-services](https://github.com/anotb/second-line-financial-services) · MIT | **banking-risk-compliance**: banking-supervision-readiness, credit-risk-governance, deposit-operations-controls, bank-fintech-partnership-review · **financial-crime-governance**: cdd-risk-review, edd-escalation-pack, sar-decision-qa, sanctions-screening-qa, aml-model-monitoring, negative-news-triage · **risk-compliance-core**: scoping, obligation-mapping, control-matrix, policy-gap-review, evidence-binder, issue-writeup, human-review-gates · **risk-reporting**: risk-committee-pack, kri-commentary, bcbs239-gap-assessment, attestation-pack, management-response, cyber-disclosure-readiness · **payments-fintech-compliance**: payments-risk-assessment, fintech-partner-controls, open-banking-data-controls, payment-operations-incident-review |
| `finance-skills` (10) | [JoelLewis/finance_skills](https://github.com/JoelLewis/finance_skills) · MIT | anti-money-laundering, know-your-customer, account-opening-compliance, account-opening-workflow, reconciliation, operational-risk, counterparty-risk, lending, financial-statements, time-value-of-money |
| `vietnam` (2) | Tự viết · MIT | **vn-phan-loai-no** (Thông tư 31/2024/TT-NHNN), **vn-phong-chong-rua-tien** (Luật 14/2022/QH15). Chỉ ghi điều đã xác minh; số ngày, tỷ lệ, ngưỡng tiền phải lấy từ văn bản gốc đặt trong `references/van-ban/`. |
| `kyc-analyst` (5) | [vyayasan/kyc-analyst](https://github.com/vyayasan/kyc-analyst) · MIT | onboarding, screening, risk-assessment, transaction-monitoring, refresh |

Các skill ngân hàng viết theo quy định Mỹ/EU (OCC, FDIC, BSA/AML, BCBS 239, DORA). Khi dùng cho ngân hàng Việt Nam cần đối chiếu
với quy định của NHNN (ví dụ Thông tư 11/2021 về phân loại nợ, Luật Phòng chống rửa tiền 2022).

## Slide (`slides/`) — 11

| Nhóm | Nguồn · Giấy phép | Skill |
|---|---|---|
| `frontend-slides` | [zarazhangrui/frontend-slides](https://github.com/zarazhangrui/frontend-slides) · MIT | Slide HTML có hiệu ứng, chạy trên trình duyệt |
| `anthropic-financial-services` (6) | anthropics/financial-services-plugins · Apache-2.0 | pptx-author, ppt-template-creator, deck-refresh, ib-check-deck, pitch-deck, teaser |
| `revealjs-skill` | [ryanbbrown/revealjs-skill](https://github.com/ryanbbrown/revealjs-skill) · MIT | revealjs: slide HTML bằng reveal.js |
| `agent-toolkit` | [softaworks/agent-toolkit](https://github.com/softaworks/agent-toolkit) · MIT | marp-slide: slide Marp từ Markdown |
| `anthropic` (2) | [anthropics/skills](https://github.com/anthropics/skills) · Apache-2.0 | theme-factory, brand-guidelines |

Skill `pptx`, `docx`, `xlsx`, `pdf` chính thức của Anthropic không chép vào đây vì giấy phép không cho phân phối lại.
Máy này đã có sẵn chúng (`anthropic-skills:pptx` …).

## Training (`training/`) — 12

| Nhóm | Nguồn · Giấy phép | Skill |
|---|---|---|
| `course-training-skills` (11) | [Mosapmohamd/course-training-skills](https://github.com/Mosapmohamd/course-training-skills) · MIT | Bộ thiết kế khoá học từ yêu cầu tới tài liệu cho giảng viên: course-designer, course-outline, session-designer, activity-designer, assessment-designer, practical-work, slide-designer, instructor-guide, notebook-designer, course-reviewer (+ skill điều phối ở thư mục gốc) |
| `onewave` | [onewave-ai/claude-skills](https://github.com/onewave-ai/claude-skills) · MIT | quiz-maker: tạo câu hỏi kiểm tra kèm đáp án |

## Chung (`general/`) — 3

`anthropic/`: skill-creator (tạo skill mới), internal-comms, mcp-builder — anthropics/skills · Apache-2.0.

## Pháp lý (`legal/`) — 20

| Nhóm | Nguồn · Giấy phép | Skill |
|---|---|---|
| `anthropic-legal` (8) | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) · Apache-2.0 | review-contract, triage-nda, legal-risk-assessment, compliance-check, legal-response, brief, meeting-briefing, vendor-check |
| `casemark` (12) | CaseMark/skills · Apache-2.0 | contract-analysis, contract-summarization, contract-playbook-review, contract-dispute-analysis, due-diligence-checklist, due-diligence-report, confidentiality-nda, employment-contract-summary, loan-and-security-agreement, term-loan-agreement, corporate-compliance-checklist, policy-brief |

Viết theo luật Mỹ và thông lệ quốc tế. Dùng cho hợp đồng theo luật Việt Nam thì đối chiếu Bộ luật Dân sự 2015, Luật Thương mại 2005 và nhờ luật sư xác nhận.
`review-contract`, `vendor-check` chạy tốt nhất khi có bộ quy tắc đàm phán (playbook) của tổ chức và các kết nối CLM/CRM (xem `CONNECTORS.md` trong skill).

## Solar (`solar/`) — 11

`engineering/pv-system-design` · tự viết · MIT: thiết kế kỹ thuật PV (số tấm mỗi chuỗi theo nhiệt độ, số chuỗi mỗi MPPT, chọn inverter và tỷ lệ DC/AC, cầu chì chuỗi, sụt áp cáp, khoảng cách hàng tránh bóng che, danh mục tiêu chuẩn IEC). Có script `scripts/string_sizing.py` tính chuỗi từ datasheet. Kết quả là bản tính sơ bộ, kỹ sư có chứng chỉ phải kiểm tra.

`casemark/` · CaseMark/skills · Apache-2.0: modeling-renewable-resource-yields (sản lượng P50/P90), analyzing-renewable-energy-project-finance, modeling-project-finance-structures, structuring-energy-offtake-agreements, modeling-energy-transition-infrastructure, power-purchase-agreement, epc-contract, interconnection-agreement, solar-site-lease, energy-regulation-summaries.

Đây là skill về tài chính và hợp đồng dự án. Chưa tìm được skill kỹ thuật PV (thiết kế chuỗi, chọn inverter, bóng che, sụt áp) có giấy phép rõ ràng.
Máy này đã có sẵn `solar-skills` (phân tích dữ liệu Deye/SolisCloud) và `epc-contractor-evaluation` (chấm điểm nhà thầu EPC).

## Đã tìm nhưng không chép

- Pháp lý: lawve-ai/awesome-legal-skills, cslawyer1985/contract-review-pro (không có giấy phép rõ ràng). Solar: các skill "renewable-energy" trên claudskills.com không rõ repo gốc.
- `doc-coauthoring` (anthropics/skills): không có file giấy phép kèm theo.
- [narosemena/master-instructional-design](https://github.com/narosemena/master-instructional-design): giấy phép CC BY-NC-ND 4.0 (không thương mại, không sửa), không hợp để đưa vào kho dùng chung. Chỉ ghi link.
- [jiji262/claude-design-skill](https://github.com/jiji262/claude-design-skill): chuyển thể từ system prompt nội bộ của Claude.ai, giấy phép MIT do tác giả tự ghi nên không đáng tin. Chỉ ghi link.
- [espialuso/id-skills-for-claude](https://github.com/espialuso/id-skills-for-claude), [zarazhangrui/codebase-to-course](https://github.com/zarazhangrui/codebase-to-course): repo không có giấy phép nên không được phép sao chép. Chỉ ghi link.
- [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills): phần lớn là skill tự động hoá API qua Composio, không liên quan ngân hàng/slide/training.
- CaseMark có hơn 2.000 skill (pháp lý, y tế, thị trường vốn). Ở đây chỉ lấy 25 skill ngân hàng thương mại. Muốn thêm thì clone repo đó và chọn trong `skills/finance` hoặc `skills/capital`.
