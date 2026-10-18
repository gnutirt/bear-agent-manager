# Example: FBO-account ledgering control overlay for a sponsor-bank deposit program

Scenario type: anonymised, public-source-derived; no named institution; the fact pattern reflects recurring themes in the 2024 Joint Statement on Banks' Arrangements with Third Parties to Deliver Bank Deposit Products and Services and in published consent orders against sponsor banks for FBO-reconciliation failures.

## Input

Institution: community bank, $5B avg total consolidated assets, FDIC-regulated state-non-member bank. Operates a sponsor-bank deposit program with three fintech partners: Partner A (consumer neobank, $300M end-user deposits), Partner B (SMB-payments fintech, $80M end-user deposits), Partner C (early-stage consumer wallet, $20M end-user deposits). The bank holds deposits in three FBO accounts, one per partner.

Trigger: the board's audit committee requested a second-line control-matrix overlay for the FBO-account ledgering process after a peer-bank consent order on FBO-reconciliation failures was published. Source posture: 2024 Joint Statement on Bank-Fintech Arrangements plus the bank's internal FBO-ledger SOP and the three program agreements.

## Output emphasis

**Process area in scope**: reconciliation and ledgering, with FBO overlay sub-section. Plus advertising-review process area (deposit-insurance representation row) and exception-handling process area (periodic re-attestation row).

### FBO overlay sub-section

| Field | Partner A | Partner B | Partner C |
|---|---|---|---|
| End-user deposits | $300M | $80M | $20M |
| Daily reconciliation control | yes | yes | yes |
| Variance threshold | $1k (firm-wide default — flagged) | $1k (firm-wide default — flagged) | $1k (firm-wide default — flagged) |
| Pass-through deposit-insurance recordkeeping (12 CFR Part 330 §330.5) | documented | documented | partial — no daily snapshot of end-user balances at the bank's level retained |
| End-user ledger governance | weekly attestation by fintech CFO | weekly attestation by fintech operations lead | weekly attestation by fintech CTO |
| Wind-down sequence tabletop | never tested | never tested | never tested |
| Customer-facing deposit-insurance representation review (12 CFR Part 328 Subpart B) | documented | partial — last review 14 months ago | gap — no review on file |

**Spotlight rows.**

**Pass-through deposit-insurance recordkeeping (Partner C)**: 12 CFR Part 330 §330.5 [verify section] establishes the recordkeeping conditions for pass-through coverage on fiduciary and custodial accounts. The bank's custodial-account agreement and the fintech partner's end-user ledger together must satisfy the recordkeeping requirements. For Partner C, the bank receives an end-of-day file from the fintech but does not retain daily snapshots for the required period. Gap flagged. Without the daily snapshots, Partner C's end-user depositors lose pass-through coverage. Severity: critical. Recommended action: deposit-operations director to retain daily end-user balance snapshots for Partner C within 30 days.

**Daily reconciliation variance threshold**: bank reconciles total FBO balance at the bank's level to total of fintech-reported end-user ledger daily; firm-wide variance threshold is $1k. Reviewer question on whether the variance threshold is risk-based per program. For Partner A ($300M deposits), the $1k threshold may be too tight (noise from rounding, settlement-cutover edge cases) and trigger reconciliation alerts that desensitise the team. For Partner C ($20M deposits), the $1k threshold is plausibly calibrated but would benefit from an aging analysis. Recommended action: risk officer to refresh variance thresholds on a risk-based basis per program within 60 days.

**End-user ledger governance**: each fintech provides weekly attestations on ledger accuracy. Reviewer question on whether attestations are signed by an officer with adequate authority and independence at the fintech. Partner A's CFO satisfies; Partner B's operations lead has unclear authority at the fintech to bind on ledger accuracy beyond operational scope. Recommended action: head of vendor management to confirm Partner B's attestation signatory has adequate authority within 45 days.

**Customer-facing deposit-insurance representation (Partner C)**: gap — no marketing-claim review on file against 12 CFR Part 328 Subpart B. The fintech surfaces refer to "FDIC insurance" without the pass-through caveats. Severity: critical. Recommended action: marketing-and-compliance team to complete the review within 30 days; periodic re-attestation cadence to be set at quarterly (sits in exception-handling process area).

**Wind-down sequence tabletop**: no documented tabletop for FBO wind-down across any of the three programs. The bank has not tabletop-tested an FBO deconversion. Cross-reference to `bank-fintech-partnership-review` recommendation. Recommended action: head of vendor management to schedule an FBO wind-down tabletop for at least one program within 90 days.

### Cross-cutting findings

**Cyber overlay** (loaded): each fintech partner falls under the bank's third-party-cyber program. SOC 2 Type II reports received and reviewed within last 12 months for each partner; Partner B's SOC 2 carries an exception on logical-access reviews; issue-writeup linked. Sponsor-bank cyber-notification chain (12 CFR Part 304 Subpart E for FDIC) requires the bank to determine within 36 hours of a notification incident; the contractual notification clock on each fintech is 24 hours. Operational capability to meet the 24-hour clock confirmed for Partner A; not yet confirmed for Partners B and C.

**Privacy overlay** (loaded): GLBA Reg P notice integration with each fintech. Reviewer question on whether the privacy notice issued to consumers correctly identifies the bank as the financial institution. Partner A's privacy notice confirmed; Partners B and C pending review.

**Conduct overlay** (loaded): account-closure and account-hold theme: the bank has received CFPB Consumer Complaint Database hits attributable to Partner A on hold-release-without-notice. Internal complaint data shows higher hold-release latency on Partner A than on Partners B and C. Recommended action: deposit-operations director to refresh the hold-release SLA for Partner A and to review the customer-recourse channel, within 60 days.

### Coverage gaps

- No documented exit-sequence control for FBO wind-down across any program.
- Partner C: pass-through deposit-insurance recordkeeping gap (critical).
- Partner C: customer-facing deposit-insurance representation gap (critical).
- Partner B: end-user ledger attestation signatory authority unclear.
- All three programs: variance thresholds not risk-based per program.
- Partners B and C: privacy-notice review pending.
- Partners B and C: cyber-notification clock operational capability not confirmed.

### Recommended owner actions

| Action | Owner role | Target date | Severity |
|---|---|---|---|
| Retain daily end-user balance snapshots for Partner C | deposit-operations director | 30 days | critical |
| Complete marketing-claim review for Partner C deposit-insurance representation | head of marketing and compliance | 30 days | critical |
| Confirm Partner B attestation signatory authority | head of vendor management | 45 days | high |
| Refresh variance thresholds on risk-based basis per program | chief risk officer | 60 days | high |
| Refresh hold-release SLA for Partner A | deposit-operations director | 60 days | moderate |
| Schedule FBO wind-down tabletop for at least one program | head of vendor management | 90 days | moderate |
| Confirm cyber-notification operational capability for Partners B and C | CISO | 60 days | high |
| Review privacy notice for Partners B and C | head of compliance | 60 days | moderate |
| Set quarterly re-attestation cadence on customer-facing deposit-insurance representation | head of compliance | 30 days | high |

### Confidence and posture

- Confidence: high on §330 recordkeeping; medium on variance-threshold calibration; medium on end-user ledger governance pending Partner B and Partner C clarifications.
- Heightened Standards: not applicable (asset size below $50B).
- Public-source basis: anchored to 12 CFR Part 330 [verify section], 12 CFR Part 328 Subpart B (FDIC misrepresentation rule), 2024 Joint Statement on Banks' Arrangements with Third Parties to Deliver Bank Deposit Products and Services [verify exact title and date], FFIEC BSA / AML Examination Manual CIP and CDD sections, GLBA Safeguards Rule §314.4(f), GLBA Reg P. Anonymous; consent-order reference by docket only.
