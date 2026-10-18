# Capital-markets sector overlay for attestation-pack

When the scope record names sector `capital-markets`, this overlay adds capital-markets-specific structure and content expectations. Where there is conflict between capability defaults and this overlay, the overlay governs the capital-markets-sector elements.

Loaded by: `attestation-pack/SKILL.md` when `scope.sector_overlay_set` includes `capital-markets`, or when the institution type is a registered investment adviser, broker-dealer, registered fund, transfer agent, or other capital-markets-registered entity.

## Source basis

Cited and section-referenced in `references/source-anchors.md`. This overlay names the regulators and sources without restating excerpts.

## What changes for capital-markets attestation packs

### 1. Fund CCO annual report under Rule 38a-1

For registered investment companies, Rule 38a-1 under the Investment Company Act of 1940 requires the fund CCO to provide a written report at least annually to the fund board addressing the operation of the fund's compliance policies and procedures, material changes since the prior report, and material compliance matters since the prior report. The attestation pack supporting the report typically:

- Covers the fund-complex-level compliance program elements and the per-fund tailoring.
- Surfaces material compliance matters with linked issues and remediation status.
- Anchors to Rule 38a-1 explicitly in the assertion text.
- Carries fund CCO sign-off and routes to the board (typically via the fund board's Audit Committee or a dedicated Compliance Committee).

The fund CCO is the named signer; this is fund-board-level, not adviser-level.

### 2. Adviser CCO annual review under Rule 206(4)-7

For registered investment advisers, Rule 206(4)-7 under the Investment Advisers Act of 1940 requires the adviser CCO to conduct an annual review of the adequacy of the adviser's compliance policies and procedures and the effectiveness of their implementation. The annual review is not a regulator-filed report but typically generates an internal attestation pack reviewed by the firm's senior management and (for many firms) the board or governing body. The attestation pack typically:

- Covers the firm-level compliance program elements (Code of Ethics under Rule 204A-1, advertising, custody, books and records, marketing, privacy).
- Reflects findings from the annual review with linked remediation.
- Anchors to Rule 206(4)-7 explicitly.
- Carries adviser CCO sign-off and routes to senior management.

The adviser-level attestation and the fund-CCO attestation are distinct artifacts even where the same firm serves as adviser to registered funds. This skill produces both as separate pack instances.

### 3. Broker-dealer Rule 17a-5 annual report

For registered broker-dealers, Rule 17a-5 (17 CFR §240.17a-5) requires annual filing including (depending on broker-dealer category) a financial-responsibility report and either a compliance report or an exemption report. The compliance report includes management assertions on compliance with the financial-responsibility rules (Rule 15c3-1 net capital, Rule 15c3-3 customer-protection, books-and-records requirements). The attestation pack typically:

- Carries process-owner sub-certifications on net-capital computation, customer-protection segregation, and books-and-records integrity.
- Anchors to the specific financial-responsibility rules in the assertion text.
- Coordinates with the PCAOB AS 3105 auditor on the audit of the financial reports.

### 4. FINRA 3120 / 3130 supervisory and CEO certifications

FINRA Rule 3120 requires a written report on the supervisory system to senior management at least annually. FINRA Rule 3130 requires the CEO to certify annually that the member firm has processes in place to establish, maintain, review, test, and modify policies and procedures reasonably designed to achieve compliance with applicable securities laws. The attestation pack supporting Rule 3130 typically:

- Anchors to Rule 3130(b) explicitly.
- Surfaces the Rule 3120 report content as an evidence-index entry.
- Carries CEO sign-off (this is the executive certification at the broker-dealer level; the skill produces the CCO and CCO-equivalent sub-certifications that ladder to the CEO certification).

### 5. Form ADV and Form CRS attestation chain

While not formal attestation packs in their own right, Form ADV and Form CRS filings carry implicit attestations. The annual amendment cycle generates internal attestation work supporting the filing accuracy; the attestation pack for the underlying compliance program is consumed as evidence.

### 6. Sign-off and review machinery

Capital-markets attestation packs typically include the General Counsel's office (with securities counsel for executive-certification-adjacent work), the Chief Compliance Officer (for both adviser and fund CCO depending on the entity), the Chief Audit Executive, and the CFO and CEO at the function-head and executive layers respectively. Fund-board attestations route to the fund board (typically Audit Committee or dedicated Compliance Committee); adviser attestations route to senior management; broker-dealer attestations route to the firm's governing body and (for certain reports) to FINRA and the SEC.

## What the overlay leaves to the SKILL workflow

This overlay names the capital-markets-specific anchors and use cases. It does not replicate the workflow steps.
