# Sector overlay — banking (deposit-operations-controls)

This skill is banking-sector-only by definition. The overlay is fixed-loaded, not scope-conditional. The file carries the banking-specific row vocabulary that makes the deposit-operations matrix recognisably a banking matrix rather than a generic controls inventory.

## What the overlay puts into the matrix

### Charter and primary federal regulator

The deposit-operations control matrix reads against the bank's primary federal regulator (OCC for national banks and federal savings associations; FRB for state-member banks; FDIC for state-non-member banks and state savings associations) and the state DFI for state-chartered banks. The federal consumer-deposit obligations apply across charter types; the supervisory frame and the examination posture differ. The matrix does not need to re-cite the regulator on each row, but the cover names the primary federal regulator and the state DFI overlay status, and the source-anchors file carries the regulator label per source.

### Heightened Standards posture (covered banks only)

For covered banks under 12 CFR Part 30 Appendix D ($50B+ avg total consolidated assets), the matrix tail carries a sub-section tying the deposit-operations controls into the operational-risk taxonomy and the risk-governance framework. The tie-in points are:

- The deposit-operations process areas (especially exception handling, override governance, and the FBO overlay) feed the operational-risk taxonomy as named risk drivers.
- The aggregate-exception reporting cadence feeds the chief risk officer reporting and the board independent-risk-committee reporting required under Appendix D.
- The deposit-insurance representation row and the FBO end-user-ledger governance row feed the operational-risk and reputational-risk views.
- The compliance and audit independence over the deposit-operations control matrix is part of the three-lines-of-defense maturity assessment.

For banks approaching the $50B threshold (typically $40B+), carry a forward-looking row even where Appendix D is not yet binding, because OCC examiners will probe it.

### CIP, BO, and the BSA / AML manual interpretive layer

The CIP and beneficial-ownership rows cite the underlying regulation (31 CFR §1020.220 and §1010.230) in the obligation-source column. The FFIEC BSA / AML Examination Manual sections on CIP and CDD / BO are interpretive guidance and go in the secondary anchor row, not the obligation-source column. A matrix that cites only the manual is not citing the regulation.

The FinCEN beneficial-ownership reporting rule under the Corporate Transparency Act is distinct from the bank rule under §1010.230; the CTA reporting-rule docket has been active and litigation has affected the operative state. Carry a status note where the engagement touches CTA-reporting-company beneficial-ownership data flow.

### FBO-account ledgering for sponsor-bank fintech programs

For banks operating sponsor-bank deposit programs with fintech partners, the FBO overlay sub-section of the reconciliation-and-ledgering process area carries:

- **Daily reconciliation control.** Bank reconciles total FBO balance at the bank's level to total of fintech-reported end-user ledger daily. Variance threshold is risk-based per program; the same dollar threshold applied across heterogeneous programs is wrong (too tight on a high-deposit program, too loose on a low-deposit program). Cite the 2024 Joint Statement on Banks' Arrangements with Third Parties to Deliver Bank Deposit Products and Services as supervisory guidance and the underlying 12 CFR Part 330 and federal consumer-EFT regime as the binding text.
- **Pass-through deposit-insurance recordkeeping.** Status field with values `documented`, `partial`, `not-applicable`, `gap`. The 12 CFR Part 330 recordkeeping conditions for fiduciary and custodial accounts are the operative rules. Without compliant recordkeeping, the FBO depositors lose pass-through coverage. The bank's custodial-account agreement and the fintech partner's end-user ledger together must satisfy the recordkeeping requirements; daily snapshots of end-user balances at the bank's level are the recurring gap.
- **End-user ledger governance.** Each fintech provides signed attestations on ledger accuracy; the matrix flags whether attestations are signed by an officer with adequate authority and independence at the fintech, and whether the bank has a right to independent-third-party verification.
- **Wind-down sequence tabletop status.** Cross-link to `bank-fintech-partnership-review` for the partnership-level view; the deposit-operations matrix carries the operational-control row and routes the partnership-level wind-down readiness to the partnership skill.
- **Customer-facing deposit-insurance representation.** Marketing-claim review against 12 CFR Part 328 Subpart B (the FDIC misrepresentation rule) on customer-facing surfaces of the fintech program where the bank is named as the insured depository institution. This row sits in three places: the advertising-review process area (the bank's review obligation), the FBO overlay (the customer-facing surface), and the exception-handling process area (periodic re-attestation as an aggregate report).

### Federal-benefit-payment garnishment processing

The 31 CFR Part 212 lookback procedure and protected-amount calculation applies across charter types where the account holds federal-benefit direct deposits. The garnishment-processing rows carry the lookback-procedure control, the protected-amount-calculation control, the notice-to-account-holder control, and the cross-walk to state garnishment, IRS levy, and state-tax-levy processing. Federal-benefit lookback errors are an examiner-attention pattern.

### Escheatment

State unclaimed-property statutes vary by state on dormancy-classification triggers (typically 3 to 5 years), customer-contact-attempt cadence, and escheatment-filing schedules. The matrix carries the rows but the threshold values are state-specific; cite the state statute path in the firm-overlay file rather than restating per state in the matrix body.

### Comptroller's Handbook anchors

The OCC Comptroller's Handbook Bank Operations, Internal Control, and Deposit-Related Credit booklets carry the OCC's process expectations on deposit operations. These are supervisory guidance and go in the secondary anchor row; the federal regulations (consumer-EFT regime, truth-in-savings regime, funds-availability regime, CIP rule, beneficial-ownership rule, 12 CFR Part 330, Part 328 Subpart B) are the binding text and go in the obligation-source column. The matrix uses the booklets to explain the OCC's expectation on segregation-of-duties, reconciliation, and exception handling beyond the regulation text.

### FFIEC IT booklet — Retail Payment Systems

ATM, EFT, and ACH operational and IT-control expectations are interpretive guidance. Cite the underlying consumer-EFT regulation (12 CFR Part 1005) for the customer-facing rules; cite the FFIEC IT booklet for the operational and IT-control expectations on the bank's deposit channels.

## Common pitfalls (banking-specific)

- Citing the FFIEC BSA / AML manual as the obligation source for CIP. The regulation is 31 CFR §1020.220; the manual is interpretive guidance.
- Citing the OCC Comptroller's Handbook as the obligation source for deposit operations. The Handbook is supervisory guidance; the federal regulations are the binding text.
- Treating the 2024 Joint Statement on Bank-Fintech Arrangements as a regulation. It is supervisory guidance; phrase obligation-source as "supervisory guidance" and cite the underlying regulation for the binding text.
- Skipping the Heightened Standards tie-in for covered banks. Appendix D applies; the matrix tail must link the deposit-operations controls into the operational-risk and risk-governance framework.
- Skipping the §330 pass-through deposit-insurance recordkeeping row on FBO accounts. Without compliant recordkeeping, the FBO depositors lose pass-through coverage. The matrix must include the row when the scope includes a sponsor-bank program.
- Using a single dollar variance threshold across heterogeneous FBO programs. Variance thresholds are risk-based per program.
- Treating the deposit-insurance misrepresentation row as a one-place row. It sits in advertising review, in the FBO overlay, and in exception handling as a periodic re-attestation. Carry it in all three places.
