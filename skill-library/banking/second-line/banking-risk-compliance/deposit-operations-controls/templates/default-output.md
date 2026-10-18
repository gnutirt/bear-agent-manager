# Deposit operations controls — output template

A draft until the deposit-operations director, the compliance officer, or the audit-committee chair attests. Roles only, never named individuals. Cite every material claim against `references/source-anchors.md` (or a loaded overlay) by file path. Mark unsupported items `[evidence needed]`. Mark unconfirmed section references `[verify section]`. Render the artifact as a Word memo via the `docx` skill in the `document-skills` plugin.

## Cover

| Field | Value |
|---|---|
| Matrix ID | |
| Matrix date | |
| Engagement ID | pointer to scope record, or "none — scope not formalised" |
| Source posture | public-only / public-plus-firm-policy / public-plus-firm-policy-plus-evidence / connector-aware |
| Confidence label | high / medium / low |

### Institution profile

| Field | Value |
|---|---|
| Institution type | national-bank / state-member-bank / state-non-member-bank / federal-savings-association / state-savings-association |
| Primary federal regulator | OCC / FRB / FDIC |
| State DFI (where applicable) | |
| Asset size band | <10B / 10B-50B / 50B-100B / 100B-250B / >250B |
| Heightened Standards applicability (12 CFR Part 30 Appendix D) | yes / approaching / no |
| Geographic footprint | |

### Deposit-operations scope

| Field | Value |
|---|---|
| Scope segments | retail-deposit / business-deposit / wealth-deposit / sponsor-bank-program (one or more) |
| Systems in scope | core-deposit-system / dispute-management-system / online-banking / ATM-network / ACH-origination / FBO-ledger / other |
| Process-change trigger | policy-refresh / system-migration / examiner-finding / audit-finding / partnership-change / routine-refresh |
| Sponsor-bank programs in scope | list, or "none" |
| Prepaid products in scope | yes / no |
| Cross-cutting overlays loaded | conduct / cyber / privacy / none |

## Reviewer questions

- [Question raised by scope ambiguity, source posture limit, or open audit / examiner finding]

## Matrix

For each row in each process area below, the standard control-matrix columns are:

| Control ID | Obligation source (file path into `references/source-anchors.md`) | Control objective | Control activity | Owner role | Frequency | Test method | Evidence pointer | Last test result | Design effectiveness | Operating effectiveness | Open issues | Human-review required |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

The matrix denominator is the ten process areas. Each process area below carries one or more rows; do not collapse into a flat register.

### 1. Account opening and CIP

Rows for: identity verification (documentary), identity verification (non-documentary), government-list comparison, customer notice, recordkeeping (5-year retention from account closure under 31 CFR §1020.220(a)(3)).

### 2. Beneficial-ownership collection

Rows for: trigger identification (legal-entity customers), certification collection, refresh on triggering events, recordkeeping. Note: cite 31 CFR §1010.230 (the bank rule). The FinCEN beneficial-ownership reporting rule under the Corporate Transparency Act is distinct; carry a status note where the engagement touches CTA-reporting-company beneficial-ownership data flow.

### 3. Account-opening disclosures (truth in savings)

Rows for: §1030.4 disclosure content, disclosure timing (before account opening), disclosure medium (electronic / paper), §1030.5 subsequent disclosures (fee-change notice timing), recordkeeping (24-month retention under §1030.9).

### 4. Advertising review (truth in savings)

Rows for: §1030.8 ad-content review, APY-accuracy review, triggering-term review, sponsor-bank-program advertising approval-gate (where applicable), marketing-claim review against the FDIC misrepresentation rule (12 CFR Part 328 Subpart B).

### 5. Consumer-EFT and ATM operations

Rows for: §1005.7 initial disclosures, §1005.9 receipts and periodic statements, §1005.10 preauthorised-transfer authorisations, §1005.11 error-resolution intake, §1005.11(c) provisional-credit timing, §1005.11(c)–(d) investigation completion, §1005.11(d)–(e) notification of results, §1005.6 consumer-liability application, §1005.13 recordkeeping, §1005.18 prepaid-account sub-regime (where applicable).

The dispute-timing rows (10 / 45 / 90 business-day windows under §1005.11) and the consumer-liability rows ($50 / $500 / unlimited tiers under §1005.6) are separate rows even when they surface in the same dispute case.

### 6. Funds availability

Rows for: hold-policy disclosure, hold application against the §229.12 schedule, §229.13 exception-hold application (new-account, large-deposit, redeposited-check, repeated-overdraft, reasonable-cause-to-doubt-collectibility, emergency-conditions), §229.13(g) exception-hold notification, disclosure-update on hold-policy changes, §229.21 recordkeeping.

### 7. NSF, overdraft, and fee disclosure

Rows for: truth-in-savings disclosure on fees (§1030.4, §1030.6), periodic-statement fee aggregation, fee-change notice timing (§1030.5), UDAAP screen on representment fees, UDAAP screen on surprise overdraft fees, UDAAP screen on authorised-positive-settled-negative pattern. Cross-link to `cross-cutting/conduct.md` for the theme list.

### 8. Garnishments, levies, and account holds

Rows for: 31 CFR Part 212 federal-benefit-payment lookback, protected-amount calculation, notice to account holder, state garnishment processing, IRS levy processing (26 USC §6332), state-tax-levy processing.

### 9. Escheatment and dormant accounts

Rows for: dormancy classification (state-by-state thresholds), customer-contact attempt cadence, state escheatment filing, reactivation governance (joint-action requirements on large reactivations, vulnerable-customer protection).

### 10. Reconciliation, ledgering, and the FBO overlay

Rows for: daily ledger-to-GL reconciliation, variance investigation and aging.

**FBO overlay sub-section (sponsor-bank-program scope only):**

| Field | Value |
|---|---|
| Daily reconciliation control ID | |
| Variance threshold (per program) | risk-based per program |
| Pass-through deposit-insurance recordkeeping status (12 CFR Part 330 §330.5) | documented / partial / not-applicable / gap |
| End-user ledger governance | signed attestations from fintech; officer authority and independence documented |
| Wind-down sequence tabletop status | tested / overdue / never-tested |
| Customer-facing deposit-insurance representation review (12 CFR Part 328 Subpart B) | documented / partial / gap |

Cross-link to `bank-fintech-partnership-review` for the partnership-level view.

### 11. Exception handling and overrides

Rows for: exception definition by category, override-authority matrix, aggregate-exception reporting cadence, UDAAP screen on overrides that affect customers, periodic re-attestation on customer-facing deposit-insurance representation.

### 12. Access controls and segregation of duties

Rows for: privileged-access governance for deposit systems, joint-action requirements (large dormant-account reactivation, fraud-loss writeoff, large funds-availability override), periodic access recertification.

### 13. Evidence retention

Rows for: retention-schedule alignment with 31 CFR §1020.220(a)(3) (CIP, 5 years from account closure), 12 CFR §1005.13 (consumer-EFT, 24 months), 12 CFR §1030.9 (truth-in-savings, 24 months), 12 CFR §229.21 (funds-availability, varies by record type), system-of-record evidence pointers, litigation-hold and exam-evidence preservation overlay.

## Coverage gaps

| Obligation | Source citation | Mapped control? | Severity | Owner role | Target close date |
|---|---|---|---|---|---|
| | | yes / no | low / moderate / high / critical | | |

## Control redundancies

| Description | Affected control IDs | Owner role | Recommended consolidation |
|---|---|---|---|

## Heightened Standards posture (covered banks only)

For covered banks under 12 CFR Part 30 Appendix D (generally $50B+ avg total consolidated assets):

- **Operational-risk taxonomy tie-in**: which deposit-operations process areas feed which named operational-risk drivers.
- **Aggregate-exception reporting tie-in**: cadence to the chief risk officer and to the board independent-risk-committee.
- **Three-lines-of-defense maturity**: line-1 (deposit operations), line-2 (compliance, risk), line-3 (internal audit) coverage of the matrix.

For banks approaching the $50B threshold (typically $40B+), carry a forward-looking row even where Appendix D is not yet binding.

## Cross-references

- Obligations to refresh in `risk-compliance-core/obligation-mapping`: [list].
- Issues to refresh in `risk-compliance-core/issue-writeup`: [list].
- FBO overlay rows to surface in `bank-fintech-partnership-review`: [list].
- Coverage-gaps rows to surface in `risk-reporting/risk-committee-pack`: [list].
- Test-method rows to feed `compliance-testing/test-plan-builder`: [list].

## Recommended owner actions

| Action | Owner role | Target date | Evidence link | Status |
|---|---|---|---|---|
| | | | | proposed / in-progress / complete |

## Source trace

| Claim | Source | Section | Retrieval date | URL or file ref | Notes |
|---|---|---|---|---|---|
| | | | | | `[verify section]` / current state confirmed |

Cite `references/source-anchors.md` for canonical citations. Use `[verify section]` if the section reference is unknown; do not invent.

## Sign-off block

| Role | Name placeholder | Date | Attestation |
|---|---|---|---|
| Deposit-operations director | | | |
| Compliance officer | | | |
| Audit-committee chair (where applicable) | | | |

---

*Matrix depth scales to the trigger and the audience.* A routine refresh reads shorter than a refresh after a material examiner finding. A board pre-read collapses the matrix to coverage-gaps, the FBO overlay status, and the recommended owner actions, with the supporting rows in an appendix. An examiner-response file leads with the affected process area and the closure cross-walk.
