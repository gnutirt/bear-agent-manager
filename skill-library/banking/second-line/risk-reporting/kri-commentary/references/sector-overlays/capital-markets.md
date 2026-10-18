# Capital-markets sector overlay for kri-commentary

When the scope record flags `capital-markets`, this overlay sets the KRI-commentary content for broker-dealers, registered investment advisers, fund complexes, and prime-brokerage / market-maker firms.

Loaded by: `kri-commentary/SKILL.md` when `scope.sector_overlay_set` includes `capital-markets`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- FINRA Rule 3110 (Supervision) and Rule 3120 (Supervisory Control System) for broker-dealer supervisory KRIs (trade surveillance alerts by type, customer-complaint volume, registered-representative attrition with open complaints).
- SEC Rule 15c3-1 (net capital) and Rule 15c3-3 (customer protection) for broker-dealer regulatory-capital and reserve-formula KRIs.
- SEC Market Access Rule 15c3-5 for KRIs on pre-trade risk controls (capital and credit limits, erroneous-order rejections, market-access controls effectiveness).
- For investment advisers: Investment Advisers Act §206 (anti-fraud) and Rule 206(4)-7 (compliance program); Form ADV disclosure-related KRIs; trading-error KRIs.
- For fund complexes: Investment Company Act §38(a) (compliance program) under Rule 38a-1, fund-board reporting KRIs (compliance violations, NAV errors, dilution events).
- For market-makers and prime brokers: liquidity-coverage and intraday-liquidity KRIs; concentration KRIs on prime-brokerage clients.

## What changes for capital-markets-flagged KRI commentary

### 1. Firm-level versus fund-level scope

For adviser-firm KRIs, the audience is the firm's risk committee (or equivalent management committee). For fund-level KRIs (NAV errors, compliance violations, distribution-related KRIs), the audience is the fund board (Rule 38a-1 reporting). Conflating firm-level and fund-level blocks is a recurring defect; the block names the entity scope and the receiving committee explicitly.

The committee pack at the adviser firm (per `risk-committee-pack`) is the firm-level enterprise view; fund-level reporting flows separately to fund boards. KRIs that materially affect both surface in both with cross-link, not collapse.

### 2. Trade surveillance and customer-complaint KRIs

For broker-dealers, trade-surveillance alert KRIs (volume by alert type, alert-to-disposition cycle time, false-positive rate) and customer-complaint KRIs (complaint volume by theme, complaint-to-disposition cycle time, repeat-complaint rate) are FINRA Rule 3110 expectations. The commentary names the disposition cohort (open / closed / referred to enforcement / SAR-filed where relevant) and the disposition timeliness; counts alone are insufficient.

### 3. Net-capital and reserve-formula KRIs

For broker-dealers, net-capital and Rule 15c3-3 reserve-formula KRIs are continuous-monitoring metrics. Breach commentary on these is regulator-attention-grade; the block carries:

- Specific basis for the breach (e.g., concentration deduction, haircut change, customer-asset reclassification).
- Notification status (Rule 17a-11 early-warning notices to FINRA / SEC).
- Remediation status (capital injection, position reduction, customer-asset reclassification reversal).

### 4. Trading-error and operational KRIs at advisers

For RIAs, trading-error KRIs (error rate per million orders, error-cost-to-AUM ratio) and operational KRIs (NAV-error rate, custody-reconciliation breaks) commonly appear. The block carries the fiduciary-duty implication for trading errors that affect client returns and the corrective-action posture (client make-whole status).

### 5. Concentration KRIs for prime brokers

Prime-brokerage and market-maker KRIs on client concentration, financing-mismatch, and intraday-liquidity carry an enterprise-risk implication. The block carries:

- Top-N client concentration with current headroom.
- Financing-tenor mismatch summary.
- Intraday-liquidity peak-usage versus available headroom.

## Capital-markets-specific output additions

- `risk_subtype` populated against the firm's broker-dealer or adviser taxonomy.
- Wrapper-level entity-scope field where the engagement covers both firm-level and fund-level KRIs.
- `linked_material_event_ids` populated for trading errors, NAV errors, and net-capital breaches that meet the firm threshold for material-event reporting.

## Common pitfalls in capital-markets-flagged KRI commentary

- Firm-level and fund-level KRIs collapsed into one block. Separate blocks; name the entity scope and the receiving committee.
- Trade-surveillance KRI commentary that reports counts without disposition cohorts. The Rule 3110 expectation is on supervision quality, not alert volume.
- Net-capital breach commentary without the Rule 17a-11 notification status. Examiners read for the notification status by name.
- Trading-error KRI commentary without the fiduciary-duty implication and client make-whole status. For RIAs the client-impact lens is binding.
- Prime-brokerage concentration KRI commentary without top-N detail and headroom. Aggregate concentration figures alone are insufficient.
