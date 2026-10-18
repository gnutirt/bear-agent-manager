# Payment operations incident review

**Incident ID**: [firm-internal identifier; reused across `payments-risk-assessment`, `fintech-partner-controls`, and any cross-link to `risk-reporting/cyber-disclosure-readiness`]
**Program**: [legal entity; brand name if different]
**Program ID**: [stable ID; reused across the four sector-skill artifacts]
**Engagement ID**: [pointer to scope record, or "none — scope not formalised"]
**Detected (UTC)**: [ISO datetime]
**Contained (UTC)**: [ISO datetime, or "in progress"]
**Customer-impact reconciled (UTC)**: [ISO datetime, or "in progress"]
**Sponsor-bank notified (UTC)**: [ISO datetime, or "not yet — clock posture below"]
**Status**: [detected | contained | reconciling | reconciled | remediation-in-progress | closed | escalated]
**Audience**: [program-operator second line | sponsor-bank operating committee | sponsor-bank TPRM | internal audit | board risk committee | state-MTL examiner via NMLS | CFPB EXAMS]
**Owner (role)**: [head of payments compliance | BSA officer | head of operations | head of risk | other]
**Approver (role)**: [per firm policy for this trigger and audience]
**Source posture**: [public-only | public-plus-firm-policy | public-plus-firm-policy-plus-system-of-record | connector-aware]
**Confidence label**: [high | medium | low | unknown]

## Incident summary

[One paragraph. Rail or rails affected, product, customer-impact magnitude (population count and dollar value, even rough), incident-management status, sponsor-bank notification clock posture, named-rail notification clock posture, cyber-leg flag if any.]

## §1033 status note

[Names the firm's role under §1033 (data provider, data recipient, both, none) and the implementation tier date as of the analysis date, where the incident touched authorisation flows, developer-interface tokens, or data-recipient feeds. The Personal Financial Data Rights Final Rule was finalised October 22, 2024 — verify current docket status, any litigation, congressional review, or compliance-date relief on the analysis date. Otherwise: "not applicable to this incident".]

## MSB / MTL status note

[Names the configuration-specific MSB posture against the FinCEN administrative-ruling library and the state-by-state MTL footprint via NMLS. Categorical MSB-vs-not assertions are wrong; this is fact-pattern-specific. Names the state-by-state operational-incident notification triggers in the geographic footprint that apply.]

## Chronology

| Timestamp (local) | Timestamp (UTC) | Actor (role; subcontractor named) | Action | System / rail | Evidence reference |
|---|---|---|---|---|---|
| | | | | | |

Distinguish observed from inferred from unknown. Unknowns drive the open-questions block.

## Customer impact

| Field | Value |
|---|---|
| Population count | |
| Dollar magnitude | |
| Geographic breakdown (US states; corridor countries if cross-border) | |
| Segment breakdown (consumer / SMB / payroll-on-demand / gig / BNPL / cross-border remittance / high-risk vertical) | |
| Identification method | full-population reconciliation against system-of-record / sample-based / complaint-driven / vendor-side report only |
| Reconciliation method | system-of-record / FBO subledger / sample / complaint-driven |
| Reconciliation cadence | real-time / post-incident / end-of-day |
| Break-resolution log | what reconciled, what did not, disposition |
| FBO subledger posture during the incident | held the truth / lagged the truth / broke against the truth |

A population stated without an identification method is an assertion, not a finding.

## Affected transaction population

| Rail | Volume | Value | Status (completed / reversed / re-initiated / in-flight / written-off) | Source-system reference |
|---|---|---|---|---|
| ACH | | | | |
| Same Day ACH | | | | |
| Wire (Fedwire / CHIPS) | | | | |
| Card debit | | | | |
| Card credit | | | | |
| FedNow | | | | |
| RTP | | | | |
| P2P | | | | |
| Check | | | | |
| Cross-border correspondent | | | | |
| Virtual-currency on-ramp | | | | |

Rail rows not in scope can be omitted or marked "n/a".

## Regulatory notification triggers

### Reg E (consumer-EFT error-resolution and liability)

| Trigger | Clock-start basis | Posture | Action | Owner role |
|---|---|---|---|---|
| §1005.11 investigation window (10 business days, with extension to 45 / 90 calendar days) | consumer's notice | open-claim queue posture; provisional-credit posture | | |
| §1005.6 unauthorised-transfer-liability tier | transfer date / consumer's notice | tier-by-tier exposure | | |
| §1005.18 prepaid-account error-resolution overlay | per §1005.11 | applies / does-not-apply | | |
| §1005.31 subpart B remittance-transfer error-resolution | per subpart structure (verify) | applies / does-not-apply | | |

The consumer-EFT clock runs from the consumer's notice, not from incident detection or confirmed customer impact. Mis-stating that is an automatic finding.

### NACHA (named-rail rule)

| Trigger | Posture | Action | Owner role |
|---|---|---|---|
| Return-reason code coverage and timeframe (paywalled — verify current edition) | | | |
| Reversal mechanic (Originator-initiated; five-banking-day window — verify) | | | |
| ODFI return-rate threshold posture (administrative / overall / unauthorised — verify thresholds) | | | |
| Same Day ACH cutover and per-transaction limit (verify current limit) | | | |
| WEB Debit account-validation rule (effective March 19, 2021) | | | |
| NACHA Risk Management Framework reporting (verify current framework) | | | |

Disclaimer: current edition; specific sections to be confirmed against the firm's licensed copy.

### Card-network rules (paywalled — conceptual)

| Trigger | Posture | Action | Owner role |
|---|---|---|---|
| Chargeback-window posture per dispute-reason code | | | |
| Visa Fraud Monitoring Program / Mastercard Excessive Fraud Merchant Compliance Program escalation (verify current program names and thresholds) | | | |
| Visa Dispute Monitoring Program / Mastercard Excessive Chargeback Merchant Compliance Program escalation (verify) | | | |
| BIN-sponsor reporting chain (program operator → BIN sponsor → network) | | | |

Disclaimer: current edition; specific sections to be confirmed against the firm's licensed copy.

### Faster-payments (FedNow / RTP)

| Trigger | Posture | Action | Owner role |
|---|---|---|---|
| Settlement-finality irrevocability (no chargeback) | | | |
| Request-for-return-of-funds posture (initiated / acknowledged / returned / denied) | | | |
| ISO 20022 message-field handling (which field carried the bad value) | | | |
| Operating-hours coverage (24/7/365 staffing posture during the incident window) | | | |
| Operational-incident reporting under FedNow Service Operating Procedures / RTP Operating Rules (verify version and section) | | | |

Reusing the card-rail recovery template for these rails is the most-frequent rebuild cause.

### Sponsor-bank notification (program agreement)

| Field | Value |
|---|---|
| Clause reference | |
| Clock-start basis | detection / control-event / confirmed customer impact |
| Contractual deadline | |
| Notification sent (channel, addressee role, timestamp) | |
| Supporting evidence package sent | |
| Status | submitted / acknowledged / supplemented / overdue |
| Still owed | post-incident review report / remediation tracker / next operating-committee read-out / FBO subledger reconciliation closure |

The contractual clock is typically the tightest. Mis-stating the clock-start basis is a frequent finding.

### State-track notification (MTL via NMLS)

| State | Trigger met (yes / no) | Notification channel | Deadline | Status | Owner role |
|---|---|---|---|---|---|
| | | NMLS / state-direct | | | |

State thresholds, content requirements, and timing windows vary; verify per state in the geographic footprint.

### Cyber-leg notification triggers (where applicable)

| Trigger | Basis | Due | Status | Filer |
|---|---|---|---|---|
| NYDFS 23 NYCRR Part 500 §500.17(a) (72 hours from determination) | Covered Entity status | | | program operator / sponsor bank |
| Federal banking agencies' Computer-Security Incident Notification Rule (36 hours from determination) | sponsor-bank notification incident | | | sponsor bank |
| SEC Form 8-K Item 1.05 (4 business days from materiality determination) | public-registrant status | | | securities counsel |
| State breach-notification statutes | state-by-state trigger | | | program operator |
| GLBA Safeguards Rule notification (FTC-supervised) | affected-customer threshold (verify) | | | program operator |

Cross-link to `risk-reporting/cyber-disclosure-readiness` for the disclosure-track artifact. The cross-cutting cyber overlay (`references/cross-cutting/cyber.md`) carries the parallel-clock detail.

### Personal-data notification triggers (where applicable)

Cross-link to `references/cross-cutting/privacy.md` for state breach-notification rows, CCPA / CPRA exposure flag, and §1033 implications.

## Root cause

| Category | Description | Source citation | Subcontractor attribution (where visible) | Control-design vs control-execution |
|---|---|---|---|---|
| Trigger | | | | |
| Contributing factor | | | | |
| Contributing factor | | | | |

Vendor-side root cause is recorded only where the firm has visibility (vendor incident report, vendor-side log access, vendor post-incident review). The artifact does not assign blame to a vendor without a basis.

## Remediation actions

| Action | Tier (immediate / short-term / structural) | Owner role | Target date | Status | Control reference (in `fintech-partner-controls` or `payments-risk-assessment`) | Control-design vs control-execution |
|---|---|---|---|---|---|---|
| | | | | proposed / in-progress / complete | | |

Vendor-side actions are recorded as commitments to be confirmed.

## Sponsor-bank reporting

| Report | Channel | Date sent (UTC) | Against which clause | Status |
|---|---|---|---|---|
| | | | | submitted / acknowledged / supplemented / overdue |

| Still owed | Owner role | Target date |
|---|---|---|
| | | |

## Network or scheme reporting

| Network / scheme | Report | Date sent (UTC) | Status |
|---|---|---|---|
| NACHA Risk Management Framework | | | |
| Card network (via BIN sponsor) | | | |
| FedNow Service Operating Procedures | | | |
| The Clearing House RTP Operating Rules | | | |

Most incidents do not trigger every line. Record what does and what does not, with the basis.

## Regulator-facing posture

| Artifact | Regulator | Status | Human-review gate (named role) | Target date |
|---|---|---|---|---|
| | sponsor-bank-mediated examiner inquiry / state-MTL via NMLS / CFPB EXAMS direct (where larger-participant rule designates the firm) | drafting / counsel review / sponsor-bank review / submitted | | |

The named approver decides. The skill stops at draft.

## Customer-facing posture

| Communication | Channel | Population | Date | Status |
|---|---|---|---|---|
| | in-app / email / statement insert / regulatory-required disclosure form | | | drafted / counsel review / sent |

| Field | Value |
|---|---|
| Open consumer-EFT claims | |
| Provisional-credit posture | |
| Fee-reversal log | |
| Closed-account or hold-release commitments | |

Vague language ("we are addressing the issue") is a finding. Customer-facing posture is what a state-AG inquiry or a CFPB Supervisory Highlights desk-review reads.

## Lessons learned and forward controls

| Control reference (in `fintech-partner-controls` or `payments-risk-assessment`) | Recommended change | Control-design vs control-execution | Owner role | Target date |
|---|---|---|---|---|
| | | | | |

The lesson is the artifact's reason to exist.

## Open items and named follow-ups

| Description | Owner role | Target date |
|---|---|---|
| | | |

## Gaps

| Description | Source citation | Severity | Owner role | Target close date |
|---|---|---|---|---|
| | | low / moderate / high / critical | | |

## Recommended disposition

[closed | monitoring | open-remediation | escalate]

The artifact is a draft. The named approver decides.

## Source citations

| Claim | Source | Section | Retrieval date | URL or file ref | Notes |
|---|---|---|---|---|---|
| | | | | | paywalled disclaimer / [verify section] / current state confirmed |

Cite `references/source-anchors.md` for canonical citations. Use `[verify section]` if the section reference is unknown; do not invent. Apply the paywalled disclaimer for NACHA and card-network citations.

---

*Pack depth scales to the trigger and the audience.* A sponsor-bank operating-committee read-out runs longer than a quarterly internal-audit retrospective. A near-miss pack carries the same named sections with the customer-impact population at zero and the lessons-learned block as the centre of gravity. A multi-rail incident keeps the rail-by-rail breakdown visible at every relevant block; a single-rail incident collapses the unused rail rows to status lines.

The deliverable is a Word memo. Render this template as a `.docx` via the `docx` skill in the `document-skills` plugin; the markdown above is the content spec, and the Word file is what the program-operator second line, the sponsor-bank operating committee, and the regulator-facing reviewer receive.
