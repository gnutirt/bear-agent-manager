# Banking sector overlay — sar-decision-qa

When the scope flags banking, load this overlay alongside `references/source-anchors.md`. It carries the bank-specific SAR-decision frame the generic capability skill does not own.

## Operative SAR rule

- **31 CFR §1020.320** [verify section] — the bank SAR rule. Operative thresholds: $5,000 where a suspect is identified; $25,000 where no suspect is identified. Operative filing window: 30 days from initial detection of facts that may constitute a basis for filing; 60 days where no suspect can be identified at the 30-day mark. Continuing-activity reviews are an examination expectation rebuilt on top of the rule and the FFIEC manual, conventionally on a 90-day cadence. The QA reads the disposition file against the rule and the manual, not against any single internal SLA.

## Examiner frame

- **FFIEC BSA/AML Examination Manual — Suspicious Activity Reporting section** is the examiner-facing detail. The QA reads the alert-management, case-investigation, decision-to-file, narrative-quality, structured-field-completeness, continuing-activity, confidentiality, and program-level-control expectations from this section.
- **OCC / FRB / FDIC / NCUA Joint Statement on Risk-Focused BSA/AML Supervision (July 22, 2021)** sets the risk-focused supervisory tone. QA depth should track risk: high-risk typology alerts (structuring, trade-based, layering, sanctions-adjacent, fraud-typology) get deeper QA than commodity false positives that closed routinely.
- **FinCEN / Federal Banking Agencies Joint Statement on Innovation in BSA/AML Compliance (December 3, 2018)** supports innovation. The QA does not penalise governed innovation in the detection or decision pipeline as long as the decision file shows the work.

## Bank-specific typology population the QA encounters most

- Structuring against the $10,000 CTR threshold (single-customer and related-party patterns).
- Check kiting and on-us / cross-bank deposit float patterns.
- ACH origination fraud, including business-email-compromise-funded ACH and account-takeover ACH.
- Commercial wire fraud, including BEC pattern.
- Elder financial exploitation, anchored to the elder-financial-exploitation FinCEN advisory.
- BIN-attack / card-fraud patterns funnelling to deposit accounts.
- Trade-based money laundering on commercial customers.
- Insider-conduct typologies (employee, branch-manager schemes) — handled here, not under a separate conduct overlay.

## Continuing-activity at a bank

The 90-day continuing-activity review is an examination expectation rebuilt on the FFIEC manual. Reviews concluding "no continuing activity" are still papered. The QA's `continuing_activity.last_continuing_review_date` and `next_review_due` fields apply regardless of outcome. A bank that papers reviews only when a follow-on SAR is filed has an evidence gap.

## BSA-officer accountability

The bank's BSA officer is the named filer-of-record. The QA recommends; the BSA officer (with the SAR review committee where the firm uses one) decides on filing, amendment, supplement, or close. The QA does not direct the filing decision.

## Cross-link inside the plugin

- **`cdd-risk-review`** carries the customer-segmentation and CDD-refresh work. Where the alert decision file flags a segment-mismatch (e.g., consumer-segment CDD on a small-business customer), the QA cross-references but does not handle the CDD refresh.
- **`edd-escalation-pack`** carries EDD posture for high-risk customers. Where the alert sits on an EDD-trajectory customer, the QA cross-references.
- **`aml-model-monitoring`** carries the alert-source model governance. The alert-decision QA notes whether the source scenario or rule has model-risk coverage on file; it does not re-do model-monitoring work.
- **`sanctions-screening-qa`** carries sanctions-screening alert-decision QA. Where the alert is sanctions-adjacent, the QA cross-references rather than absorbing both lenses.
- **`negative-news-triage`** carries adverse-media triage. A standalone negative-news triage that did not produce a SAR alert belongs there, not here.

## Output-template additions for banking

- 31 CFR §1020.320 filing-window status as a named field (`within-30-day-window`, `within-60-day-window-no-suspect`, `late`).
- 90-day continuing-activity cadence status as a named field, regardless of disposition.
- BSA-officer-and-SAR-review-committee handoff status.
- Bank-specific typology label drawn from the bank typology list above.

## Common pitfalls in banking SAR-decision QA

- Treating a community-bank SAR-decision file with the same depth as a large-bank file regardless of typology and customer risk; the risk-focused supervisory frame asks for proportionality.
- Reading the FFIEC manual sections as binding rules rather than as examiner expectations layered on the SAR rule.
- Letting the QA drift into a comment on whether the SAR should have been filed; the QA reviews the decision file against criteria and does not direct the filing decision.
- Skipping the cross-link to CDD or EDD when the alert evidence reveals a segment-mismatch or an EDD-trajectory customer.
- Confusing model-risk coverage of the alert-source scenario with decision-quality of the closed alert; the former belongs in `aml-model-monitoring`.
