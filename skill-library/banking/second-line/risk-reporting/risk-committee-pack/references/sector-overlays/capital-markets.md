# Capital markets sector overlay for risk-committee-pack

When the scope record names sector `capital-markets`, this overlay adds adviser, broker-dealer, and asset-manager-specific structure and content expectations to the committee pack. Where there is conflict between the capability defaults and this overlay, the overlay governs the capital-markets-sector elements.

Loaded by: `risk-committee-pack/SKILL.md` when `scope.sector_overlay_set` includes `capital-markets`, or when the institution type is an SEC-registered investment adviser, FINRA-member broker-dealer, dual-registrant, asset-management group, or registered fund complex.

## Source basis

Cited and section-referenced in `references/source-anchors.md`. This overlay names the regulators and sources without restating excerpts.

## What changes for capital-markets committee packs

### 1. Adviser-level enterprise risk committee, distinct from the fund board

The committee pack scope is the adviser firm (and the broker-dealer where dual-registrant), not individual funds. Items material to the fund board may also be material to the adviser risk committee, but the audiences and the recommendations differ. Fund-board reporting lives in the separate skill `capital-markets-asset-management-compliance/skills/fund-board-reporting`; the committee pack flags any items that should be elevated to the fund board but does not duplicate the fund-board pack.

For dual-registrants (BD and IA) and integrated asset-management groups, the pack typically covers both regulated entities with a clear delineation of which risks roll up where.

### 2. Capital-markets risk taxonomy

The heat map for advisers, BDs, and asset managers covers, at minimum: investment risk (portfolio risk, leverage, liquidity at fund and firm level); operational risk; technology risk; vendor risk; regulatory risk; conduct risk; financial-crime risk; cyber risk; fiduciary risk; and (for BDs) market-access and order-handling risk. Strategic and reputational risk are also standard. Climate is mapped under strategic unless the firm has elected a standalone cell or reports under EU SFDR / CSRD parent-group consolidation.

For BDs and dual-registrants, the heat map adds net-capital and customer-protection risk under Exchange Act Rules 15c3-1 and 15c3-3.

### 3. Compliance-program reporting under Rule 206(4)-7 and FINRA 3120 / 3130

Investment Advisers Act Rule 206(4)-7 requires advisers to adopt and implement written policies and procedures, conduct an annual review, and designate a CCO. The annual review summary frequently lands in the committee pack. The pack carries:

- Annual-review status and any material findings from the most recent review.
- Material compliance program changes in the period (policy updates, control redesign, CCO transition).
- Any 206(4)-7-tagged exam findings or self-identified deficiencies.

For FINRA-member BDs, FINRA Rule 3120 (supervisory control system testing) and Rule 3130 (CCO certification) drive parallel content:

- Annual 3120 testing summary and the report submitted to senior management.
- 3130 CEO/CCO annual certification posture.
- Any 3120-driven supervisory-system change in the period.

### 4. Form PF current-event triggers and large-trader reporting

For private fund advisers required to file Form PF, current-event triggers (Section 5 events: ARP advisers; Section 6 events: large hedge fund advisers; new triggers under 2023 amendments) feed the committee directly and on a same-business-day or 72-hour cadence, depending on the trigger. The pack carries:

- Any Form PF current-event filings made in the period and the underlying event detail.
- Pending or contemplated Form PF current-event analyses where the trigger threshold is approaching.
- Form 13F, 13D / 13G, and 13H (large-trader) reporting posture for in-scope filers.

Verify the current Form PF current-event-trigger framework at pack-write time as the 2023 amendments have phased compliance dates.

### 5. Net capital, customer protection, and market access for BDs

For BDs and dual-registrants, the pack carries a brief on:

- Net capital position and movement; aggregate indebtedness ratio (where applicable); haircut and concentration deductions.
- Customer-protection reserve formula computation status under Rule 15c3-3.
- Market access controls under Rule 15c3-5 for BDs with exchange or ATS access; control-failure events in the period; pre-trade-risk-control breach summary.
- Best-execution governance status under Reg NMS and FINRA 5310.

Net capital and reserve-formula detail lives outside the pack; the pack carries the executive summary and any items requiring committee attention (e.g., a near-breach, a policy-driven buffer change).

### 6. Marketing Rule, custody, and books-and-records risk

For advisers, the pack carries:

- Marketing Rule (Rule 206(4)-1) compliance posture: hypothetical performance, testimonials and endorsements, third-party ratings, performance presentation. Material findings or self-identified gaps belong in the issues section.
- Custody Rule (Rule 206(4)-2) status: surprise exam posture for advisers with custody; any custody-rule breach or change in custody posture.
- Books and records (Rule 204-2) status: any material gap that affects examination readiness.

For BDs, the parallel content covers Rules 17a-3 / 17a-4 books-and-records posture, with attention to electronic-communications retention given the SEC and CFTC enforcement focus on off-channel-communications.

### 7. Liquidity risk for funds and the firm

Open-end-fund liquidity-risk-management posture under Rule 22e-4 lives primarily in fund-board reporting; the committee pack carries the firm-level rollup: any board-approved bucket changes, any swing-pricing or in-kind-redemption activation in the period, and any liquidity event that affected the firm. Money-market fund (Rule 2a-7) reform implementation status (where applicable) is included for affected complexes.

### 8. Cross-link to other capability skills

- KRI commentary for individual RAG-breached metrics: `risk-reporting/skills/kri-commentary`.
- Open-issue write-ups beyond the standing aging summary: `risk-compliance-core/skills/issue-writeup`.
- Fund-board reporting: `capital-markets-asset-management-compliance/skills/fund-board-reporting`.
- Cyber-disclosure-decision content (Reg S-K Item 106; 8-K Item 1.05): `risk-reporting/skills/cyber-disclosure-readiness`.

## Capital-markets-specific output template additions

Added to the pack (mapped to schema where present):

- `pack_metadata.entity_types` — array (RIA, BD, dual-registrant, registered-fund-complex, private-fund-adviser).
- `pack_metadata.primary_regulators` — array (SEC, FINRA, CFTC, NFA, state securities, NYDFS, FCA where applicable).
- `pack_metadata.public_company` — boolean for parent reporting issuer (drives SEC Item 106 cyber and other disclosure considerations).
- `heat_map[]` — capital-markets-taxonomy rows (investment, operational, technology, vendor, regulatory, conduct, financial crime, cyber, fiduciary, plus market-access and net-capital for BDs).
- `compliance_program_status` — object with 206(4)-7 annual-review summary; FINRA 3120 / 3130 status for BDs.
- `form_pf_current_events` — array of Form PF current-event filings or near-trigger items in the period for in-scope advisers.
- `bd_capital_status` — object with net capital, aggregate indebtedness ratio, customer-protection-reserve status for in-scope BDs.
- `marketing_rule_posture` — object summarizing Marketing Rule findings and remediation status for advisers.
- `liquidity_program_status` — object summarizing 22e-4 liquidity-program activity and any swing-pricing or in-kind-redemption activations for fund-complex packs.

## Common pitfalls in capital-markets committee packs

- Conflating the adviser risk committee with the fund board. The pack scope is the firm; fund-specific items go to the fund board through a separate channel and are flagged here only when they affect the firm.
- Reporting Form PF current events as a counter rather than as a substantive brief. Each filing or near-trigger should have an explanation; the committee owns the policy choices that affect the trigger calibration.
- Net-capital reporting that shows the ratio without the buffer policy and the management-action triggers. The committee owns the buffer policy; the pack supports that ownership.
- Marketing Rule treated as a routine compliance matter when the SEC has surfaced enforcement on hypothetical performance and testimonials. Material findings belong in issues with named owner and forward action.
- Off-channel-communications enforcement risk under-reported. The SEC and CFTC have brought multi-firm enforcement actions on this surface; the pack carries the firm posture and the books-and-records remediation status.
- Liquidity items reported only at fund level for fund-complex packs. The firm-level rollup (any swing pricing, any in-kind redemption, any liquidity-bucket change board-approved in the period) is the committee-level view.
- Cyber-disclosure decisions reported in the pack as if they bind the disclosure committee. The disclosure-committee process is separate; the pack flags material cyber events and the disclosure-committee referral, not the disclosure decision itself.
