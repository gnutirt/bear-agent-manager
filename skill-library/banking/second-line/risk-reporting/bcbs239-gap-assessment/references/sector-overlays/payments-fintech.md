# Payments and fintech sector overlay for bcbs239-gap-assessment

When the scope record names sector `payments-fintech`, this overlay adds payments- and fintech-specific fields and review demands to the assessment. Where there is conflict between the capability defaults and this overlay, the overlay governs the sector elements.

Loaded by: `bcbs239-gap-assessment/SKILL.md` when `scope.sector_overlay_set` includes `payments-fintech`. This is a stub overlay. BCBS 239 does not directly apply to non-bank payments and fintech firms. The overlay covers the case where a large nonbank payments firm voluntarily adopts BCBS 239 as a risk-data maturity benchmark, and the case where a sponsor-bank arrangement carries BCBS 239 reach into the fintech program through the sponsor bank.

## Source basis

Cited and section-referenced in `references/source-anchors.md`. This overlay names the regulators and sources without restating excerpts.

## What changes for payments and fintech BCBS 239 assessments

### 1. Direct reach is limited; voluntary adoption is the typical posture

For non-bank money transmitters, payments processors, and fintech apps, BCBS 239 does not directly apply. State money-transmission examiners, FinCEN under the BSA, and (for consumer-facing products) the CFPB are the operative supervisors; their data-quality expectations flow through state exam standards, the BSA program rule, and CFPB UDAAP / Reg E reach.

Where the firm voluntarily adopts BCBS 239 as a risk-data maturity benchmark, the assessment frames the rating vocabulary as internal benchmark and notes the voluntary status in the supervisory-context section. Principle 12 (Review) and Principle 13 (Remedial actions) read against internal review and internal-finding remediation rather than against a supervisory review.

### 2. Sponsor-bank arrangements carry BCBS 239 reach indirectly

For a fintech program operating through a sponsor-bank arrangement (deposit, lending, or card products on a sponsor-bank balance sheet), the sponsor bank carries the BCBS 239 expectations on the consolidated risk-data layer that includes the fintech program's exposures. The fintech program inherits the sponsor bank's risk-data discipline through the bank-fintech contract and through the sponsor bank's third-party risk management framework (Joint OCC / FRB / FDIC Interagency Guidance on Third-Party Relationships, June 2023).

Assessment-side implications:

- The assessment perimeter names the sponsor bank as the BCBS 239-binding entity and the fintech program as the dependent entity.
- The sponsor bank's risk-data layer is the operative subject; the fintech program's data feed into the sponsor bank's risk aggregation is the working evidence on the program-side.
- A fintech-only BCBS 239 assessment without sponsor-bank framing is incomplete.

### 3. BSA / AML transaction-monitoring data quality

For state-licensed money transmitters and for sponsor-bank-program fintechs with BSA/AML obligations, the transaction-monitoring data layer is the working evidence for Principle 3 (accuracy) and Principle 4 (completeness) on the BSA/AML side. The assessment carries:

- Transaction-monitoring data feed completeness (alert-population coverage by product, channel, geography).
- Transaction-monitoring data accuracy (data-quality issues affecting alert generation).
- SAR-workflow data lineage from alert to filing (or to dismissal).

### 4. NYDFS Part 504 / Part 500 reach in the NY footprint

For NY-licensed fintechs and DFS-regulated money transmitters, NYDFS Part 504 imposes specific transaction-monitoring program expectations including the senior-officer certification; NYDFS Part 500 cyber expectations apply across the operation. Both reach the data layer the BCBS 239-style assessment evaluates.

### 5. Consumer-product data quality and Reg E error resolution

For consumer-facing fintech products, Reg E error-resolution expectations (10-day provisional credit, 45-day investigation, 90-day extended investigation for new accounts and certain transaction types) impose timeliness expectations on the consumer-dispute data layer. Reg E timeliness is operative evidence for Principle 5 (timeliness) on the consumer-dispute side.

### 6. State money-transmission examiner expectations

For state-licensed money transmitters operating across multiple states, the Conference of State Bank Supervisors (CSBS) coordinated examination program (Money Services Businesses Networked Supervision) sets multi-state exam standards that reach the data layer. The assessment names the state-licensure footprint and the strictest-applicable-state posture.

## Payments and fintech-specific output template additions

- `scope.supervisory_context` — `voluntary` is the default for nonbank-fintech assessments unless a sponsor-bank framing applies.
- `scope.sponsor_bank_arrangement` — boolean; if true, sponsor-bank named as the BCBS 239-binding entity.
- `scope.state_licensure_footprint` — list of states with money-transmission or other licences.
- `scope.bsa_aml_obligations` — boolean.
- `principle_results[].evidence_summary` — Principles 3, 4, 5 entries reference transaction-monitoring data layer and Reg E dispute data layer where applicable.

## Common pitfalls in payments and fintech BCBS 239 assessments

- Asserting BCBS 239 binding reach to a non-bank fintech. It does not directly apply; the assessment frames as voluntary internal benchmark or as sponsor-bank-inherited.
- Omitting the sponsor-bank perimeter for a fintech program operating on a sponsor-bank balance sheet. The sponsor bank carries the binding reach; the assessment must address both.
- Treating Reg E error-resolution timeliness as a separate consumer-protection matter. Reg E timeliness is operative evidence for Principle 5 on the consumer-dispute side.
- Treating BSA/AML transaction-monitoring data quality as a separate program matter. TM data quality is operative evidence for Principles 3 and 4 on the BSA/AML side.
- Skipping NYDFS Part 504 / Part 500 reach in the NY footprint. Both reach the data layer the assessment evaluates.
- Treating the state-licensure footprint as not assessment-relevant. State examiners review TM and consumer-product data quality; the strictest-applicable-state posture sets the bar.
