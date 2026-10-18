# Troubleshooting: deposit-operations-controls

Recurring defects in deposit-operations control matrices and how to fix them. Read against `SKILL.md` and `templates/default-output.md`.

## Conflating dispute-timing rows with consumer-liability rows

The dispute-timing rows under §1005.11 (the 10 / 45 / 90 business-day windows for provisional credit, full investigation, and notification) and the consumer-liability rows under §1005.6 (the $50 / $500 / unlimited tiers based on timeliness of consumer notice) are separate obligations. The matrix must keep them in separate rows even when they surface in the same dispute case. A row labelled "Reg E dispute handling" that conflates both is the most common defect on this process area; examiners read each rule line-by-line.

## Missing the §1005.18 prepaid sub-regime when the bank issues prepaid products

Prepaid is a discrete sub-regime with its own pre-acquisition disclosure (short form and long form), error-resolution adapted from §1005.11, and the credit-feature rules under §1005.18(g). Do not fold prepaid into general consumer-EFT controls; carve it out as a separate sub-section of the consumer-EFT process area. If the bank does not issue prepaid products, mark the §1005.18 row as not applicable and flag in the coverage-gaps section as "scoped out, not a gap."

## Treating §1030.8 advertising review as a single control

Advertising controls split into ad-content review (the message), APY-accuracy review (the math), and triggering-term review (when an APY ad triggers additional disclosures under §1030.8(c)). The matrix needs all three rows. Add a fourth row for sponsor-bank-program advertising approval-gate where applicable, and a fifth for marketing-claim review against the FDIC misrepresentation rule (12 CFR Part 328 Subpart B).

## Skipping pass-through deposit-insurance recordkeeping on FBO accounts

12 CFR Part 330 §330.5 [verify section] establishes the recordkeeping conditions for pass-through coverage on fiduciary and custodial accounts. Without compliant recordkeeping, the FBO depositors lose pass-through coverage, and the bank's reputational and operational-risk exposure spikes. The matrix must include a §330 row when the scope includes a sponsor-bank program. Status field with values `documented` / `partial` / `not-applicable` / `gap`.

## Treating the deposit-insurance misrepresentation row as a one-place row

The FDIC misrepresentation rule (12 CFR Part 328 Subpart B) covers three control surfaces: the bank's marketing-claim review (advertising-review process area), the customer-facing surfaces of any sponsor-bank fintech program where the bank is named as the insured depository institution (FBO overlay), and the periodic re-attestation that customer-facing surfaces remain compliant (exception-handling process area). Carry the row in all three places, not just one.

## Citing the CFPB small-entity compliance guide instead of the regulation

The Compliance Aid is a plain-language interpretive aid. The obligation source on the matrix is the underlying CFR section (12 CFR Part 1005, 1030, or the relevant Reg CC / CIP / BO / Part 330 / Part 328 section). Cite the regulation; the guide goes in the secondary anchor row only.

## Citing the OCC Comptroller's Handbook as the obligation source

The Comptroller's Handbook booklets (Bank Operations, Internal Control, Deposit-Related Credit) are supervisory guidance. The obligation source is the federal regulation. The Handbook goes in the secondary anchor row to explain the OCC's expectation on segregation-of-duties, reconciliation, and exception handling beyond the regulation text.

## Citing the FFIEC BSA / AML manual as the only CIP source

The manual is interpretive guidance built on top of 31 CFR §1020.220 and the BSA. Cite the regulation; the manual goes in the secondary anchor row.

## Treating supervisory guidance as a regulation

The 2024 Joint Statement on Banks' Arrangements with Third Parties to Deliver Bank Deposit Products and Services is supervisory guidance, not a regulation. Phrase obligation-source as "supervisory guidance" and cite the underlying regulation (consumer-EFT regime, truth-in-savings regime, 12 CFR Part 330, Part 328 Subpart B) for the binding text.

## Treating exception governance as a hygiene control

Override and exception logs are an examiner-favourite review point. The matrix must include aggregate-reporting cadence, override-authority matrix, and a UDAAP screen on overrides that affect customers. A row that reads only as "exceptions are logged" misses the aggregate reporting and the customer-impact screen.

## Reading NSF and overdraft rows only as truth-in-savings disclosure

The conduct lane is where the recurring CFPB enforcement on representment fees, surprise overdraft fees, and the authorised-positive-settled-negative pattern sits. Read the NSF and overdraft rows through both the truth-in-savings disclosure lens and the UDAAP screen lens. A row that reads only as a disclosure check misses the conduct lane.

## Using a single dollar variance threshold across heterogeneous FBO programs

Variance thresholds on FBO daily reconciliation are risk-based per program. A $1k threshold is too tight on a $300M-deposit program (noise) and too loose on a $20M-deposit program (signal hidden). The matrix must surface the threshold per program, not a single firm-wide value.

## Defaulting to "USA" on garnishment and escheatment rows

Garnishment processing is federal (31 CFR Part 212 for federal-benefit-payment lookback, 26 USC §6332 for IRS levy) plus state-by-state for state garnishment and state-tax levy. Escheatment is state-by-state. Default-to-USA on these rows misses the operative obligations; cite per state in the firm-overlay file rather than restating per state in the matrix body, but flag the multi-state scope explicitly.

## Treating dormant-account reactivation as a hygiene control

Vulnerable-customer protection is a recurring conduct theme. Dormant-account reactivation rows must include joint-action requirements on large reactivations and a customer-protection screen for reactivations that trigger fees or that occur without the customer's clear request.

## Skipping the Heightened Standards tie-in for covered banks

12 CFR Part 30 Appendix D applies to covered banks ($50B+ avg total consolidated assets). The matrix tail must carry a sub-section tying the deposit-operations controls into the operational-risk and risk-governance framework: which process areas feed which named operational-risk drivers; aggregate-exception reporting cadence to the chief risk officer and to the board independent-risk-committee; three-lines-of-defense maturity over the matrix. For banks approaching the threshold (typically $40B+), carry the forward-looking row even where Appendix D is not yet binding.

## Treating "current edition" sources as evergreen

Comptroller's Handbook booklets, the FFIEC BSA / AML manual, the FFIEC IT Examination Handbook, and the CFPB Supervisory Highlights / Circular series are revised periodically. Pin the edition / cycle date in the source-trace block. Mark `[verify current state]` where the engagement relies on a specific edition.

## Carrying confidential supervisory information forward into a matrix at a lower access population

Prior supervisory letters, prior MRAs / MRIAs, and prior examination reports are CSI under 12 CFR Part 4 Subpart C (OCC), Part 261 (FRB), and Part 309 (FDIC). The access population for the matrix itself constrains what it can include. A matrix shared with a fintech partner cannot carry the bank's CSI on a prior examination finding even where the finding informs the control rationale.
