# Insurance sector overlay for bcbs239-gap-assessment

When the scope record names sector `insurance`, this overlay adds insurance-specific fields and review demands to the assessment. Where there is conflict between the capability defaults and this overlay, the overlay governs the insurance-sector elements.

Loaded by: `bcbs239-gap-assessment/SKILL.md` when `scope.sector_overlay_set` includes `insurance`. This is a light overlay. BCBS 239 does not directly apply to insurers. The overlay covers the case where an insurance group voluntarily applies BCBS 239 as an internal benchmark, and maps the BCBS 239 principles onto the operative insurance regimes (NAIC ORSA, IAIS ICPs, state Holding Company filings).

## Source basis

Cited and section-referenced in `references/source-anchors.md`. This overlay names the regulators and sources without restating excerpts.

## What changes for insurance BCBS 239 assessments

### 1. ORSA is the operative US analogue

NAIC Model #505 (Risk Management and Own Risk and Solvency Assessment Model Act) requires insurers above the premium threshold to maintain risk-management functions including risk identification, measurement, monitoring, and reporting [verify section]. The ORSA Summary Report is the firm-level artifact; the data layer that supports it carries the analogues to BCBS 239 Principles 3, 4, 5, 7, 8, and 10.

Assessment-side mapping:

- Principle 3 (Accuracy and integrity) maps to the ORSA risk-identification and measurement data quality.
- Principle 4 (Completeness) maps to the ORSA scope of risks identified across the enterprise.
- Principle 5 (Timeliness) maps to the ORSA reporting cadence (annual minimum; more frequent for material change).
- Principle 7 (Accuracy of risk reporting) maps to the ORSA Summary Report's risk-position accuracy.
- Principle 8 (Comprehensiveness) maps to the ORSA coverage of all material risk types (insurance, market, credit, operational, liquidity, strategic).
- Principle 10 (Frequency) maps to the ORSA cycle plus the insurer's internal management-reporting cadence.

The assessment names the ORSA cycle as the working evidence for the mapped principles and labels the ORSA Summary Report (or the supporting working files) as the evidence pointer.

### 2. IAIS ICP 8 and ICP 16 frame the international view

IAIS ICP 8 (Risk Management and Internal Controls) and ICP 16 (Enterprise Risk Management for Solvency Purposes) [verify section] set the IAIS expectations that home and host supervisors of internationally active insurance groups apply. Where the insurance group operates across jurisdictions, the assessment carries the ICP frame as the international analogue to BCBS 239's banking-group view.

### 3. State Holding Company filings (Form B and Form F)

NAIC Model #440 (Insurance Holding Company System Regulatory Act) and Model #450 (Insurance Holding Company System Model Regulation) require Form B (annual registration) and Form F (enterprise risk report) filings [verify section]. The Form F enterprise risk report is the operative reporting artifact for the holding-company-level risk view; the data layer that supports it is the assessment-relevant infrastructure.

### 4. ComFrame and IAIG designation

For an Internationally Active Insurance Group (IAIG) under the IAIS Common Framework (ComFrame), the supervisory expectations carry additional weight on Principle 14 (Home/host cooperation). The home supervisor typically convenes the supervisory college; the assessment records the college framework and the data-sharing protocols.

### 5. SOX 404 / NAIC Model #205 financial-reporting controls are not BCBS 239 evidence

Insurance financial-reporting controls (SOX 404 for SEC-registered insurance holding companies; NAIC Model Audit Rule #205 for statutory audit) are doctrinally distinct from the risk-data layer that BCBS 239 addresses. The assessment does not cite SOX 404 or Model #205 evidence as Principle 3 or Principle 7 evidence on the risk side.

### 6. Voluntary-adoption framing

Where the insurance group has voluntarily adopted BCBS 239 as an internal benchmark (typical at IAIGs and at large internationally active groups), the assessment notes the voluntary status in the supervisory-context section and frames the rating vocabulary as internal benchmark rather than as a supervisory rating. The Principle 12 (Review) and Principle 13 (Remedial actions) sections read against internal review and internal-finding remediation, not against a supervisory review.

## Insurance-specific output template additions

- `scope.supervisory_context` — `voluntary` is the default for insurance assessments unless the group is otherwise designated.
- `scope.iaig_designation` — boolean.
- `scope.orsa_inscope` — boolean.
- `scope.holding_company_filings` — Form B / Form F filing status reference.
- `principle_results[].evidence_summary` — Principles 3, 4, 5, 7, 8, 10 entries reference ORSA Summary Report and supporting working files.
- `principle_results[].evidence_summary` — Principle 14 entries reference the supervisory college framework where the group is an IAIG.

## Common pitfalls in insurance BCBS 239 assessments

- Importing the BCBS 239 banking vocabulary verbatim without mapping to ORSA / ICP terminology. State DOI rate analysts and ORSA reviewers use the insurance vocabulary; the assessment translates.
- Treating SOX 404 financial-reporting controls as risk-data evidence. The doctrines do not substitute.
- Asserting that BCBS 239 is binding on the insurer. It is not; the assessment frames the rating as internal benchmark unless the group is otherwise designated.
- Omitting Form F as the operative holding-company reporting artifact. For Holding Company Act-regulated groups, Form F is the artifact the assessment's Principle 8, 9, and 11 evidence rests on.
- Treating Principle 14 as not applicable for an insurance group. For an IAIG with cross-border operations, the supervisory college and home/host data-sharing protocols are operative.
- Skipping the voluntary-adoption framing. A reviewer reading the assessment without this context misreads the rating vocabulary.
