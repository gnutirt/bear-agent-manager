# Example: FedNow instant-payout outage at a payroll-on-demand fintech

## Input description

A program operator running a payroll-on-demand product on a newly-onboarded sponsor-bank stack runs its FedNow instant-payout path through the new sponsor's connection. During a peak payroll window, the FedNow path fails. The firm falls back to Same Day ACH but is past the cutoff for the next window; roughly 3,000 customers receive funds 24 hours late. Roughly 200 of those customers were debited at the funding step but not credited because the FedNow request-for-return-of-funds was initiated late and the recovery is incomplete. The program agreement names ACH as the in-scope rail; FedNow is named only by amendment that was still in legal review on the date of the incident.

The engagement was scoped at public-plus-firm-policy posture (no live system-of-record access at the time of the post-incident review). The audience is the sponsor-bank operating committee, with a parallel artifact for the state-MTL examiner via NMLS in the three states where the firm is licensed and where the operational-incident notification trigger is met.

## Output sketch

The pack opens with an **incident summary** naming the rails (FedNow primary, Same Day ACH fall-back), the affected population (~3,000 late-credit; ~200 debited-not-credited), the contained-but-unreconciled status, the sponsor-bank notification clock posture (notification sent within the contractual clock), the named-rail notification clock posture (FedNow operational-incident report owed), and the contractual-vs-amended scope flag (the program agreement's rail set did not name FedNow at the time of the incident).

The **chronology** runs from the first FedNow path failure signal through the firm's escalation, the fall-back decision, the Same Day ACH cutoff miss, the FedNow request-for-return-of-funds initiation, the customer-impact reconciliation, and the ongoing remediation. The sponsor-bank operations team is named at the steps where it sits in the chain.

The **customer impact** block records the population in two segments (the ~3,000 late-credit population and the ~200 debited-not-credited population), the geographic breakdown (concentrated in the three NMLS-licensed states plus a long tail), and the segment breakdown (payroll-on-demand consumer only). The reconciliation method is named for each segment; the FBO subledger posture is recorded as "lagged the truth" during the incident window.

The **affected transaction population** has rows for FedNow (volume, value, status: in-flight pending request-for-return-of-funds resolution for the 200 debited-not-credited population) and Same Day ACH (volume, value, status: completed, with a delay-vs-cutoff note).

The **regulatory notification triggers** block fires on:

- The faster-payments sub-section: FedNow request-for-return-of-funds posture (initiated late; receiving-institution responses partially returned), ISO 20022 message-field handling (no bad-value field; the failure was at the path level), 24/7/365 operating-hours posture (firm staffing posture during the incident window recorded), operational-incident reporting under FedNow Service Operating Procedures (verify version and section).
- The NACHA sub-section: Same Day ACH cutover documentation (the firm used the next available window; the cutoff time and per-transaction limit are cited with the disclaimer applied).
- The Reg E sub-section: §1005.6 unauthorised-transfer-liability question on the 200 debited-not-credited population (the consumer was debited but the funds were not delivered; the legal characterisation is recorded as a counsel-routed open question), §1005.11 investigation-window posture for any consumer dispute claims arising from the incident.
- The sponsor-bank sub-section: program-agreement clause reference, clock-start basis (control event), notification sent within the contractual clock, supplementary notification on the customer-impact reconciliation, and the program-agreement amendment status flagged as a separate gap (FedNow was operating under an unsigned amendment).
- The state-track sub-section: three states with the operational-incident notification trigger met, NMLS notification posture per state, content requirements verified per state.
- No card-network, cyber-leg, or personal-data-leg sub-sections fire.

The **root cause** block names the trigger (FedNow path through the newly-onboarded sponsor failed during the peak payroll window), contributing factors (the firm's fall-back runbook did not account for Same Day ACH cutoff timing in a peak window; the FedNow request-for-return-of-funds initiation procedure was not staffed for the volume; the program-agreement amendment for FedNow was not signed before the rail was put into production), the subcontractor attribution (sponsor-bank operations was the immediate counterparty; FedNow itself is the named-rail authority and the firm has limited visibility into the path-level failure), and the control-design vs control-execution split (the fall-back runbook is a control-design gap; the request-for-return-of-funds staffing is a control-execution issue; the un-papered FedNow amendment is a governance gap that sits with legal).

The **remediation actions** block carries: immediate (request-for-return-of-funds escalation for the 200 debited-not-credited population; customer-facing communication drafted; provisional credit posture for the 200 affected consumers entered pending reconciliation closure), short-term (fall-back runbook rebuilt against Same Day ACH cutoff timing; FedNow request-for-return-of-funds staffing posture rebuilt; program-agreement amendment expedited through legal review and signed), structural (the firm's controls inventory in `fintech-partner-controls` updated against the named control families; the firm's `payments-risk-assessment` FedNow row's residual-risk reading and KRI dictionary updated).

The **sponsor-bank reporting** block records the in-clock notification, the supplementary notification, the FBO subledger reconciliation closure report owed, and the post-incident review report owed.

The **network or scheme reporting** block fires on FedNow Service Operating Procedures operational-incident reporting (verify version and section).

The **regulator-facing posture** block records the state-MTL notifications via NMLS for each of the three triggered states, with named human-review gates (head of payments compliance for content review; counsel for state-specific content requirements; sponsor-bank chief compliance officer counterpart for coordination).

The **customer-facing posture** block records the customer-notification language drafted for the late-credit population (3,000 consumers, in-app and email), the language drafted for the debited-not-credited population (200 consumers, individual outreach with provisional-credit posture and reconciliation-closure commitment), and the open consumer-EFT claim queue posture.

The **lessons learned and forward controls** block ties three control updates back to `fintech-partner-controls` (the fall-back runbook, the FedNow request-for-return-of-funds staffing, the program-agreement-amendment governance) and two risk-cell updates to `payments-risk-assessment` (the FedNow row's residual-risk reading and the cross-cutting operational-resilience row).

The **recommended disposition** is `open-remediation` with `escalate` flagged for the 200 debited-not-credited population pending reconciliation closure.

## Why this scenario matters

The scenario tests the faster-payments-vs-card-rail recovery-mechanic discipline (the 200 debited-not-credited population requires request-for-return-of-funds, not chargeback; the artifact must not reuse the card-rail recovery template), the named-rail clock structure (FedNow Service Operating Procedures operational-incident reporting runs alongside the sponsor-bank contractual clock and the state-MTL notifications), the configuration-vs-engineering split (the un-papered FedNow program-agreement amendment is a governance gap that sits independently from the engineering failure of the FedNow path), and the multi-rail rail-by-rail attribution (the affected transaction population has FedNow and Same Day ACH rows, each with status detail).

The scenario also exercises the state-track row of the regulatory notification triggers block (three states with thresholds met; NMLS notifications recorded per state), which is a row that is frequently treated as default-to-USA and missed.

The scenario uses only public-source-derived material. FedNow Service Operating Procedures and CFPB themes on payroll-on-demand fee-and-tip presentation establish the conceptual fact pattern; no named institution is used in the artifact narrative.
