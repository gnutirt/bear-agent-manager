# Example: structuring pattern at a community bank

Public-source-derived. No named institution. The shape mirrors a standing typology pattern at small and mid-sized community banks: a small-business customer making cash deposits structured to sit just below the $10,000 currency-transaction-report threshold across a short window and across more than one branch.

## Input

- **Institution**: a community bank with a regional footprint and one supervisory regulator (FDIC or state DBI plus FRB depending on charter; assume FDIC for this example).
- **Alert**: a structuring-detection scenario fires after a small-business customer makes nine cash deposits, each between $9,000 and $9,800, within a rolling 14-day window across two branches. Aggregate $80k+; expected monthly cash activity per the customer's CDD profile is $25k.
- **Investigation file (closed by the BSA program before QA)**:
  - Investigator pulled transaction history for the customer and the two related-party signers on the account.
  - Branch-staff interview notes attached: customer was asked about the deposits, gave a generic explanation about supplier prepayments, no supporting invoices produced.
  - Negative-news search: clean.
  - Sanctions screening: clear.
  - Disposition: SAR filed; structured fields on the SAR form populated for "structuring"; narrative attached.
- **Engagement scope supplied**: institution = community bank; primary regulator = FDIC; persona = second-line BSA QA reviewer reporting to the BSA officer; source posture = public-plus-firm-policy-plus-system-of-record-evidence; sector overlay = banking; cross-cutting overlays = none for this alert.

## Output sketch

The skill produces a QA memo against the alert decision file. Headlines:

- **Alert summary** — structuring scenario; aggregate $80k+ across nine deposits in 14 days; two branches; small-business customer with consumer-grade CDD profile.
- **Customer and account context** — small-business segment; CDD on file is consumer-grade; expected monthly cash $25k vs observed $80k+ in two weeks; signers carry no prior SAR history at customer level.
- **Investigation steps performed** — five dated, attributed steps with evidence pointers (transaction pull, signer review, branch interview, negative-news, sanctions screen). Related-party search at the institution beyond the named signers is not evidenced in the file.
- **Disposition** — `filed`. Filing window: within 30 days of detection.
- **Decision rationale** — narrative cites "structuring" by name; structured fields on the SAR form populated; no FinCEN advisory referenced (none materially apt for vanilla structuring at this scale; observation, not finding).
- **Confidentiality posture** — `tipping_off_risk_assessed = true`; branch-staff training note in the file references customer-conversation script. Internal access controls on the SAR record: documented.
- **Continuing activity posture** — first SAR for this customer; 90-day continuing review scheduled with `next_review_due` populated. `review_cadence_status = current`.
- **QA reviewer findings**:
  - `criterion = related-party-search`, severity moderate. The investigator did not document a search for related-party accounts at the institution beyond the named signers; for a small-business customer, related-entity DBA accounts are a common adjacent vector. `finding_description` notes the gap; `evidence_pointer` cites the missing artifact.
  - `criterion = narrative-coherence`, severity minor. The narrative cites typology and is coherent against the timeline; the QA observation is that the narrative reads as templated rather than facts-specific. Observation, not finding.
- **Material gaps** — related-party search artifact missing; CDD-segment refresh is overdue per the firm's risk model (small-business activity has outgrown consumer-grade CDD). The CDD gap is flagged for cross-reference to the `cdd-risk-review` skill, not handled in this QA.
- **Recommendation** — `training_feedback` (related-party search documentation); `process_change_recommendation` (CDD-segment refresh trigger should fire on detected business-grade activity in a consumer-segmented account). Explicit note: the QA reviewer does not recommend SAR amendment, supplement, or any change to the filed SAR. The SAR is filed; the BSA officer and SAR review committee own any subsequent action on the filing itself.
- **Source trace** — anchors to `references/source-anchors.md` (FFIEC SAR section, 31 CFR §1020.320, 31 USC 5318(g) confidentiality, FFIEC continuing-activity expectation), `references/sector-overlays/banking.md` (bank-specific filing-window and continuing-review framing).
- **Confidence label** — `high` for the disposition QA; `medium` for the CDD cross-reference because the CDD review is happening separately.

## Why this scenario matters

- **The QA tests decision quality, not the underlying SAR-file decision**. The SAR is filed. The QA finds a documentation gap and a CDD process gap. It does not say "the SAR should not have been filed" or "amend the SAR to add X". That separation is what the skill enforces.
- **Related-party search is the most common gap in structuring QA work** at community and mid-sized banks; the skill's `criterion = related-party-search` exists for this pattern.
- **Continuing-activity cadence shows up even on first SARs**: the 90-day continuing-review next-due date is part of the QA artifact, not just a finding triggered by an overdue review.
- **The boundary with `cdd-risk-review` is real**. The QA flags the CDD cross-reference but does not handle the CDD refresh itself; that is the other skill's job.
- **No FinCEN advisory citation for vanilla structuring**. The QA observation is that absence of an advisory citation is fine where no advisory is materially apt. Generic advisories cited for window-dressing are a different finding.

## Anchors

- FFIEC BSA/AML Examination Manual — Suspicious Activity Reporting section.
- 31 CFR §1020.320 — Reports by banks of suspicious transactions.
- 31 USC §5318(g) — statutory SAR authority and confidentiality.
- FinCEN BSA E-Filing — current SAR form and instructions (filing-window posture).

See `references/source-anchors.md` for full citations.
