# Example: consumer-EFT error-resolution control refresh after an internal-audit finding

Scenario type: anonymised, public-source-derived; no named institution; the fact pattern reflects recurring CFPB Supervisory Highlights themes and prudential-regulator MRA patterns on dispute-timing breaches.

## Input

Institution: midsize national bank, $12B avg total consolidated assets, OCC-regulated, retail and business deposit. Sponsor-bank programs: none. Prepaid products: none. Heightened Standards: not applicable. Internal audit found a 7% breach rate on the §1005.11(c) provisional-credit timing window (10 business days from receipt of a complete error notice for unauthorised-EFT claims; some POS / foreign-initiated cases use the 5-business-day window per §1005.11(c)(2)). Root cause: dispute reclassification cases reset the SLA clock incorrectly when escalated from one team to another.

The deposit-operations director needs the second-line control-matrix refresh for the consumer-EFT and ATM operations process area, ahead of the audit-committee follow-up. Source posture: public-plus-firm-policy-plus-evidence (the engagement has access to the dispute-management system aging report and the firm's dispute SOP).

## Output emphasis

**Process area in scope**: consumer-EFT and ATM operations (§1005.11). Eight rows, one per §1005.11 control activity:

1. Error-notice intake — control objective: every consumer notice (verbal or written) is logged within one business day with the §1005.11(b) information set captured.
2. Classification at intake — control objective: the dispute is classified at intake against the §1005.11(c) timing tier (10-business-day general window, 5-business-day POS / foreign window, 20-business-day extension for new accounts).
3. Provisional-credit determination — control objective: where investigation is not concluded within the applicable window, provisional credit is applied to the consumer's account.
4. Investigation — control objective: investigation completes within 45 calendar days (90 calendar days for POS / foreign-initiated transactions and for new-account claims).
5. Notification of results — control objective: consumer receives written notification of investigation result within 3 business days of completion (or, where the bank determines no error, with re-debit notice).
6. Consumer-liability application — control objective: liability applied per §1005.6 tiers based on timeliness of consumer notice ($50, $500, unlimited).
7. Recordkeeping — control objective: §1005.13 records retained 24 months from date of error notice or date the action is required.
8. Periodic-trend monitoring — control objective: aggregate dispute-timing-breach rate, classification-distribution, and reclassification-frequency reported monthly to the deposit-operations director and quarterly to the compliance committee.

**Spotlight on the §1005.11(c) provisional-credit row.**

- Control objective: bank credits the consumer's account within 10 business days (or 5 / 20 as applicable) when a complete error notice is received and investigation is not concluded.
- Control activity: deposit-operations dispute team uses the dispute-management system, which auto-classifies the claim category at intake and triggers the SLA. Manual override exists for cases reclassified after intake.
- Owner role: deposit-operations dispute manager.
- Frequency: per case; monthly aggregate review.
- Test method: dispute-management-system case-aging report; quarterly sample of 30 reclassified cases reviewed by compliance.
- Evidence pointer: dispute-management-system case-aging report; sample list and reviewer-signoff log.
- Last test result: internal audit found 7% breach rate; root cause was reclassification cases reset the SLA clock incorrectly when escalated.
- Design effectiveness: operating, with design weakness on the reclassification path (auto-classification works at intake; SLA-clock continuity on reclassification is the gap).
- Operating effectiveness: medium — pending the system fix.
- Open issues: linked to issue-writeup ID [placeholder].
- Human-review required: yes — quarterly sample review by compliance.

**Cross-cutting findings (conduct overlay)**: UDAAP exposure from delayed provisional credit. CFPB has pursued §1005.11(c) breaches as both Reg E and UDAAP findings. Recommended a customer-make-good policy for breach cases (interest reimbursement and fee reversal where the breach caused customer harm).

**Coverage gaps**: prepaid-account controls (§1005.18) absent from the matrix — out of scope (the bank does not issue prepaid accounts); flagged as not applicable, not as a gap.

**Recommended owner actions**:

- Deposit-operations director to ship a system fix for SLA-clock continuity on reclassification within 60 days.
- Second-line monitoring control to add weekly aging-by-classification view (rather than monthly aggregate only).
- Compliance to review the customer-make-good policy and present to the compliance committee within 30 days.

**Confidence label**: high on the control-objective wording (driven by §1005.11 text), medium on operating effectiveness pending the system fix.

**Heightened Standards posture**: not applicable (asset size below $50B). Forward-looking section not required at this asset band.

**Public-source basis**: anchored to 12 CFR §1005.11(c)–(e), §1005.6, §1005.13. Anonymous; no named institutions. CFPB Supervisory Highlights cited by cycle for the conduct overlay; Circular 2022-06 on unanticipated overdraft fees referenced for adjacent UDAAP framing [verify current state of cycle and circular numbering on the analysis date].
