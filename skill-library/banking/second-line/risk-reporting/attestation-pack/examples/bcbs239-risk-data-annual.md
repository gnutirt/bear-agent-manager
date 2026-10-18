# Example: annual BCBS 239 risk-data attestation pack from the Head of Risk Reporting

Public-source-derived. No named institution. Framing patterns from BCBS 239 Principle 1 (governance), the BCBS Progress Reports, and the firm's most recent self-assessment (which is the upstream artifact produced by `bcbs239-gap-assessment`). Source-anchor verification flags carried forward per the source-anchors discipline.

## Input

- Institution: top-tier US bank holding company with an intermediate holding company (IHC) under regulatory capital reporting. G-SIB-equivalent in scope of supervisory expectations on risk data aggregation and reporting.
- Engagement scope supplied: primary regulators FRB and OCC; persona = Head of Risk Reporting, second line, reporting to CRO; sector overlay = banking; cross-cutting overlays = none beyond the BCBS 239 baseline; source posture = public-plus-firm-policy-plus-evidence.
- Attestation period: prior calendar year. Annual cadence underpinning the risk-data confidence label in the Risk Committee pack and the regulatory-capital-reporting attestation chain.
- Upstream artifacts on file: most recent BCBS 239 self-assessment from `bcbs239-gap-assessment` (fourteen-principle assessment with three Top-5 priority gaps); the firm's risk-data control matrix (22 controls organised by principle group); data-quality framework reports for the period; reconciliation logs between source systems and the regulatory-reporting layer; data-lineage documentation; internal-audit reports on risk data; risk-data committee minutes for the period; prior-period attestation pack with two carried-forward exceptions.

## Output sketch

The skill emits a markdown pack and a structured record. Headlines:

- **Cover** — attestation period, scope (top-tier BHC plus IHC; named systems: credit-loss data warehouse, market-risk source systems, operational-risk loss database, regulatory-reporting layer; legal-entity perimeter), attesting role = Head of Risk Reporting, attestation type = bcbs239-risk-data, assertion-language version 2.1, source posture, scope ID linked.
- **Executive summary** — five bullets in attesting role's voice. Headline: risk-data aggregation and reporting infrastructure operating effectively subject to three named exceptions; one Principle 6 (adaptability) gap, one Principle 2 (architecture) gap, one Principle 3 (accuracy) gap.
- **Scope statement** — names the legal-entity perimeter, the four in-scope source systems and the regulatory-reporting layer, the time period, and the exclusions (out-of-scope: pre-trade data quality at the broker-dealer subsidiary, addressed under a separate attestation chain).
- **Source criteria** — BCBS 239 (January 2013), Principles 1 to 14; the firm's risk-data policy v4.0; the firm's data-quality framework v3.2; the most recent BCBS 239 self-assessment.
- **Control inventory** — 22 controls from the upstream risk-data control matrix, organised by BCBS 239 principle group (overarching governance: Principles 1-2; aggregation: Principles 3-6; reporting: Principles 7-11; supervisory and remediation: Principles 12-14). Each row carries owner role, principle reference, design and operating effectiveness ratings, linked evidence IDs.
- **Evidence index** — 47 rows. Data-quality framework reports (quarterly); reconciliation logs between each source system and the regulatory-reporting layer (monthly); data-lineage documentation refreshed in the period; the most recent BCBS 239 self-assessment; internal-audit reports on risk data (two issued in the period); risk-data committee minutes (four entries); the regulatory-capital-reporting reconciliation evidence; CDO sign-off logs for material restatements. Each row names producer role, system of record, period covered, and linked control IDs.
- **Exceptions** — three open exceptions. Exception 1 (severity high, Principle 6 adaptability): ad-hoc stress aggregation capability is 5 business days versus an internal target of 48 hours; compensating control = pre-computed stress aggregations run weekly to reduce delay risk during a stress event, evidenced by the weekly aggregation logs; status = open, target remediation date next year, linked issue ID and linked to the gap-assessment Top-5 priority gap. Exception 2 (severity medium, Principle 2 architecture): manual reconciliation between two market-risk source systems persists; compensating control = daily reconciliation reviews with documented sign-off, evidenced by the sign-off log; status = open, target remediation date end of next year, linked issue ID. Exception 3 (severity medium, Principle 3 accuracy): operational-risk loss database carries a known understatement of small-event losses below the $50k threshold; compensating control = the threshold-based exclusion is explicit in committee-pack commentary so consumers calibrate accordingly; status = pending-review, investigation ongoing, linked issue ID.
- **Prior-period remediation status** — two prior-period exceptions. The Principle 4 (completeness) gap on counterparty-data scope was remediated; closure memo cited. The Principle 7 (accuracy of reporting) gap on regulatory-capital-report reconciliation timing is carried forward as Exception 2 above (the manual reconciliation was the root cause and has not been resolved).
- **Sub-certification chain** — the Head of Risk Reporting's sub-certification feeds the CDO sub-certification (data-quality side) and the CRO sub-certification (risk-reporting side); both feed the regulatory-capital-reporting attestation chain owned by the CFO function. Chain is named in `sub_certification_chain[]`.
- **Reviewer questions** — five questions anticipating internal-audit and FRB horizontal-review posture: whether the compensating control for Exception 1 actually mitigates the underlying gap; whether the manual reconciliation in Exception 2 has a credible automation path; whether the threshold exclusion in Exception 3 materially affects committee-pack interpretation; whether the data-lineage refresh covers the perimeter assessed; whether the CDO function has independence and resourcing to sustain the program.
- **Assertion text** — firm BCBS 239 risk-data attestation language, version 2.1, with the three named carve-outs surfaced in the qualification clause.
- **Sign-off block** — Head of Risk Reporting (signature blank), CDO (witness role on data-quality side, signature blank), CRO (witness role on risk-reporting side, signature blank), General Counsel (legal review role, signature blank). Date fields blank until signed.
- **Confidence label** — medium. Three open exceptions; full evidence-index coverage of the 22 in-scope controls supports medium rather than low. Not high because BCBS 239 known limitations are non-empty.

The pack stops at draft. The Head of Risk Reporting signs after the CDO and CRO review the carve-outs and after legal review.

## Why this scenario matters

- Three named exceptions tied to specific BCBS 239 principles, with compensating controls evidenced or honestly labelled as pending. No clean attestation against an active self-assessment with priority gaps.
- The pack consumes the upstream `bcbs239-gap-assessment` output and feeds downstream consumers (the Risk Committee pack's data confidence label; the regulatory-capital-reporting attestation chain).
- Prior-period remediation status is explicit and traces a prior carry-forward to the current-period exception.
- Sub-certification chain shows the ladder explicitly; the Head of Risk Reporting sub-certifies, not the CFO.
- Confidence label is medium because BCBS 239 known limitations are non-empty; the label is the BCBS 239 voice, not a marketing decision.

## Anchors

- BCBS 239, "Principles for effective risk data aggregation and risk reporting" (January 2013), Principle 1 (governance).
- BCBS Progress Reports on adoption (most recent thematic review applies; verify at pack-write time).
- COSO Internal Control — Integrated Framework (2013).
- OCC Heightened Standards (12 CFR Part 30 Appendix D), risk-data linkage.

See `references/source-anchors.md` for full citations and verification flags.
