# Troubleshooting: payments-risk-assessment

Recurring pitfalls. Read before drafting if the engagement looks unfamiliar; consult after drafting if the artifact does not feel right to a senior payments compliance reviewer.

## Generic enterprise taxonomy with payments flavour dropped in

Symptom: the matrix has rows for "operational risk", "compliance risk", "credit risk" with payments-flavoured failure modes inside.

Why it fails: the artifact exists to be denominated in rails, segments, and geographies. Auditors and examiners cannot read a generic taxonomy as a payments risk assessment.

Fix: rebuild the matrix from rails, segments, and geographies first; the failure modes follow. The cross-cutting risks layer carries fraud, AML / sanctions, operational resilience, customer-harm / UDAAP, reporting, and cyber as a separate view.

## Default-to-USA on the geography row

Symptom: a single "USA" row covering all 50 states.

Why it fails: the operative obligations are state-by-state. MTL via NMLS, MTMA adoption status, state UDAP regimes, state breach-notification statutes, and state-AG enforcement vary materially. CA DFPI under CCFPL is not the same as TX DOB; NY DFS is not the same as either.

Fix: one row per US state in scope. Where the state footprint is large (50 states), a state-grouping is acceptable for the rows that are genuinely homogeneous, but the heterogeneous states (CA, NY, TX, FL, IL, others by current enforcement posture) get their own rows.

## Sponsor-bank-only concentration view

Symptom: a single "vendor concentration" line in the assessment.

Why it fails: sponsor-bank, processor, and BIN-sponsor concentration fail differently. A sponsor-bank exit leaves the program without rails and a depository; a processor outage cascades into customer-impact and Reg E §1005.11 timing; a BIN-sponsor exit leaves the card book without an issuer of record. A single line collapses the three failure modes.

Fix: three sub-tables. Each axis denominated in its own way (deposits / volume / customer count for sponsor-bank; volume and value per rail for processor; card volume and outstanding cards for BIN-sponsor). Cross-link to `concentration-risk-review` for the portfolio-level analysis; raise the flag here, do the analysis there.

## Treating BNPL as a single rail

Symptom: a "BNPL" rail row in the matrix.

Why it fails: BNPL is not a rail. The operative rails are debit-card (settlement and dispute mechanics), ACH (repayment-pull mechanics), and sometimes card-credit. The risk profile shifts with the rail. A "BNPL" row hides the underlying rail-specific failure modes.

Fix: keep the rails as rails. Use a BNPL borrower segment row for the borrower-side risks and a BNPL merchant segment row for the merchant-side risks; cite the operative rails in those segment rows where the failure mode is rail-specific.

## Missing the faster-payments irrevocability shift

Symptom: FedNow and RTP rows reuse the card-rail recovery template. Chargeback appears as a recovery mechanic.

Why it fails: settlement is final on receipt for FedNow and RTP. There is no chargeback. Recovery is request-for-return-of-funds plus monitoring escalation. The fraud-loss curve shifts forward; mule patterns on instant-funded inbound are heightened. The 24/7/365 staffing posture is operative, not optional.

Fix: rebuild the FedNow and RTP rows against the operative mechanics. Cite FedNow Service Operating Procedures and The Clearing House RTP Operating Rules (current; verify version) for the recovery mechanic.

## Categorical MSB-vs-not assertion

Symptom: a sentence in the assessment that says "the firm is an MSB" or "the firm is not an MSB" without configuration-specific grounding.

Why it fails: MSB status is fact-pattern-specific against the FinCEN administrative-ruling library. Different configurations of the same product can fall on different sides of the line. A categorical assertion is an examiner-friendly target.

Fix: name the configuration as fact, the determination as a legal question that sits with counsel, and the operative posture (registration on file, written AML program, CIP applicability, SAR-filing chain) as evidence. The MSB / MTL status note in the artifact carries this discipline.

## Skipping the cross-cutting UDAAP layer

Symptom: the matrix is "this is risk, not consumer compliance" and the UDAAP layer is omitted.

Why it fails: Reg E §1005.11 timing failures, account-closure / hold patterns, fee-disclosure failures, and FDIC-insurance representation are the highest-frequency examiner findings in this lane. The CFPB pursues both Reg E and UDAAP findings simultaneously. Omitting the UDAAP layer produces an assessment that the next CFPB Supervisory Highlights cycle will read as incomplete.

Fix: pull the conduct overlay (`references/cross-cutting/conduct.md`) in by default for any consumer-facing program. Read the theme list into the consumer segment row and into the cross-cutting UDAAP row. Cross-link to `consumer-compliance-fair-lending/udaap-risk-review` for the deep-dive.

## Reg E §1005.31 subpart B treated as a domestic Reg E variant

Symptom: a cross-border remittance flow is read against Reg E §1005.6 / §1005.11 only.

Why it fails: the remittance transfer rule under Reg E §1005.31 subpart B has its own pre-payment and post-payment disclosure structure, its own error-resolution mechanics, and its own consumer-protection posture (verify exact subpart B section structure on the analysis date). A domestic Reg E read misses it.

Fix: where the program operates cross-border consumer remittance, read against Reg E §1005.31 subpart B. Cite the rule with the verify-section flag if the exact subpart structure is uncertain; do not invent.

## Heat-map without supporting rows

Symptom: the deliverable is a colour-coded matrix with no underlying detail.

Why it fails: a heat-map without the supporting rows loses the auditability the artifact exists to provide. An examiner or sponsor-bank reviewer cannot trace the colour to a failure mode, control, or KRI.

Fix: heat-map summaries are appropriate for board and ERC audiences; the supporting matrix rows go in the appendix. The delivered artifact carries both.

## Stale §1033 status note

Symptom: the §1033 status note is a generic paragraph that does not name the firm's tier or the implementation date.

Why it fails: the Personal Financial Data Rights Final Rule was finalised October 22, 2024 and the docket has been active. Tier dates and any compliance-date relief may have shifted. A generic note carries the citation but not the operational fact the firm needs.

Fix: name the firm's role under §1033 (data provider, data recipient, both, none) and the implementation tier date as of the analysis date. Verify the current docket status and date-stamp the citation.

## Drafting against the "current edition" of NACHA without the disclaimer

Symptom: the artifact cites NACHA Operating Rules section numbers without the paywalled-disclaimer.

Why it fails: NACHA Operating Rules are paywalled. Section numbers and threshold values shift between editions. Without the disclaimer, the citation reads as if it were verified against the current edition when it cannot be (the firm holds the licensed copy; the assessment cites against it conceptually).

Fix: every NACHA citation carries the disclaimer "current edition; specific sections to be confirmed against the firm's licensed copy." Same pattern for Visa Core Rules, Visa Product and Service Rules, and Mastercard Rules.

## The matrix is rail-by-rail but the rails are mislabeled

Symptom: a "Zelle" rail row, an "ACH push" rail row, a "wallet load" rail row.

Why it fails: Zelle is a P2P scheme that runs on top of underlying rails. ACH push is just ACH origination. Wallet load is the funding leg of a wallet program (debit card, ACH, or card-credit). Mislabeling the rails fragments the matrix and hides the operative rule set.

Fix: keep the rail row to the underlying rail (ACH, debit card, FedNow, RTP, etc.). Use the segment row to capture P2P consumer behaviour, wallet usage patterns, or scheme-specific risk. Cross-reference the scheme name in the segment row notes if helpful.

## Engagement scope absent and not flagged

Symptom: the artifact reads as if a formal scope record were on file when it was not.

Why it fails: downstream skills key off the scope record (institution type, primary regulators, sector overlay set, persona, source posture). When scope was not formalised, the assessment must say so; otherwise downstream consumers (the concentration-risk-review skill, the exam-brief skill) cannot calibrate.

Fix: when the practitioner did not supply a formal scope record, ask the four questions (program-operator role, rails / segments / geographies in scope, review trigger, audience) and default to public posture if the practitioner declines. Note in the artifact that scope was not formalised; do not silently apply a default.
