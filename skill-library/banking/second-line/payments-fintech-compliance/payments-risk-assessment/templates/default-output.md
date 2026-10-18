# Payments risk assessment

**Program**: [legal entity; brand name if different]
**Program role**: [fintech-program-operator | baas-platform | program-manager | wallet-operator | neobank | payments-processor | money-transmitter-only | bnpl-provider | payroll-on-demand-provider | cross-border-remittance-provider | virtual-currency-on-ramp | other]
**Program ID**: [stable ID; reused across fintech-partner-controls, payment-operations-incident-review, concentration-risk-review]
**Engagement ID**: [pointer to scope record, or "none — scope not formalised"]
**As of**: [date]
**Review trigger**: [annual-cycle | semi-annual-cycle | sponsor-bank-annual-review | state-mtl-exam-prep | cfpb-direct-supervision | internal-audit-kickoff | new-rail | new-segment | new-corridor | processor-change | sponsor-bank-change | bin-sponsor-change | post-incident-reset | larger-participant-rule-applicability]
**Audience**: [sponsor-bank operating committee | sponsor-bank TPRM | state-MTL examiner via NMLS | CFPB EXAMS | internal audit | board risk committee | ERC]
**Owner (role)**: [head of payments compliance | BSA officer | head of risk | other]
**Approver (role)**: [per firm policy for this trigger and audience]
**Confidence label**: [high | medium | low | unknown]

## §1033 status note

[Names the firm's role under §1033 (data provider, data recipient, both, none) and the implementation tier date as of the analysis date. The Personal Financial Data Rights Final Rule was finalised October 22, 2024 — verify current docket status, any litigation, congressional review, or compliance-date relief on the analysis date.]

## MSB / MTL status note

[Names the configuration-specific MSB posture against the FinCEN administrative-ruling library and the state-by-state MTL footprint via NMLS. MTMA adoption status varies state-by-state; verify on the analysis date. Categorical MSB-vs-not assertions are wrong; this is fact-pattern-specific.]

## Program summary

- **Sponsor bank(s)**: [named by role, not brand].
- **Processors**: [front-end / back-end / gateway].
- **BIN sponsor(s)**: [per network].
- **Ledger provider**: [name].
- **KYC / CIP vendor**: [name].
- **Fraud-decision vendor**: [name].
- **Sanctions-screening vendor**: [name].
- **Geographic footprint**: [US states in scope; corridor countries if cross-border].
- **Customer base size by segment**: [headline counts].
- **Current-cycle volume by rail**: [transaction count and value per rail].

## Risk universe — by rail

| Rail | Inherent risk | Top failure modes (rail-specific) | Key controls | Residual risk | Top KRIs | Owner role |
|---|---|---|---|---|---|---|
| ACH | | | | | | |
| Same Day ACH | | | | | | |
| Wire (Fedwire / CHIPS) | | | | | | |
| Card debit | | | | | | |
| Card credit | | | | | | |
| FedNow | | | | | | |
| RTP | | | | | | |
| P2P | | | | | | |
| Check | | | | | | |
| Cross-border correspondent | | | | | | |
| Virtual-currency on-ramp | | | | | | |

Cite each rail-specific failure mode by file path into `references/source-anchors.md` and the `payments-fintech` overlay rather than restating rule text. NACHA and card-network citations carry the disclaimer "current edition; specific sections to be confirmed against the firm's licensed copy."

## Risk universe — by customer segment

| Segment | Inherent risk | Top failure modes | Key controls | Residual risk | Top KRIs | Owner role |
|---|---|---|---|---|---|---|
| Consumer | | | | | | |
| SMB | | | | | | |
| Payroll-on-demand | | | | | | |
| Gig disbursement | | | | | | |
| BNPL borrower | | | | | | |
| BNPL merchant | | | | | | |
| Cross-border remittance sender | | | | | | |
| Cross-border remittance receiver | | | | | | |
| High-risk vertical | | | | | | |

Segment-level UDAAP themes pull from `references/cross-cutting/conduct.md`. Account-closure / hold, Reg E §1005.11 timing, fee disclosure, FDIC-insurance representation, BNPL, dark patterns are the recurring CFPB Supervisory Highlights themes — verify which are current on the analysis date.

## Risk universe — by geography

### US states in scope

| State | Licensing posture | Top failure modes | Key controls | Residual risk | Top KRIs | Owner role |
|---|---|---|---|---|---|---|
| | MTL via NMLS [status]; MTMA adoption [status]; MSB registration [yes/no/n-a]; specialised licences [list] | | | | | |

### Corridors (cross-border)

| Corridor country | Licensing posture | Top failure modes | Key controls | Residual risk | Top KRIs | Owner role |
|---|---|---|---|---|---|---|
| | Sending-side US obligations + receiving-side host-country obligations + corridor-specific vendor stack | | | | | |

Default-to-USA is wrong. The operative obligations are state-by-state and corridor-by-corridor.

## Concentration views

### Sponsor-bank concentration

| Sponsor bank role | Top-N share by deposits | by volume | by value | by customer count | Scenario impact under single-sponsor exit | Appetite posture | Redundancy status |
|---|---|---|---|---|---|---|---|
| | | | | | | within-appetite / watch / breach / evidence-needed | dual-sponsor / standby-sponsor / single |

### Processor concentration

| Processor role | Rail | Top-N share by volume | by value | Scenario impact under single-processor outage | Appetite posture | Redundancy status |
|---|---|---|---|---|---|---|
| | | | | | | dual-processor per rail / single |

### BIN-sponsor concentration

| BIN sponsor role | Network | Top-N share of card volume | of outstanding cards | Scenario impact under BIN-sponsor exit or program escalation | Appetite posture | Redundancy status |
|---|---|---|---|---|---|---|
| | Visa / Mastercard | | | | | dual-BIN / debit-vs-credit separation / single |

Three sub-tables, not one line. Cross-link to `third-party-operational-resilience/concentration-risk-review` for the portfolio-level analysis.

## Cross-cutting risks

| Topic | Risk owner role | Top three KRIs | Deep-dive skill reference | Summary |
|---|---|---|---|---|
| Fraud | | | | |
| AML / sanctions | | | `financial-crime-governance/aml-model-monitoring`; `financial-crime-governance/sanctions-screening-qa` | |
| Operational resilience | | | `third-party-operational-resilience/concentration-risk-review` | |
| Customer-harm / UDAAP | | | `consumer-compliance-fair-lending/udaap-risk-review` | |
| Reporting / data quality | | | | |
| Cyber | | | `risk-reporting/cyber-disclosure-readiness`; `payment-operations-incident-review` | |

Do not restate the deep-dive analysis here. This is the matrix view; the deep-dive owns the detail.

## Risk-appetite posture

| Cell reference | Status | Trigger conditions for escalation |
|---|---|---|
| rail:[…] segment:[…] geography:[…] | green / yellow / red / evidence-needed | |

Where firm appetite is not on file, mark `[evidence needed]`. Do not fabricate thresholds.

## KRI dictionary

| KRI ID | Definition | Source system | Threshold | Owner role | Cadence | Reporting audience |
|---|---|---|---|---|---|---|
| | | | numeric or `[evidence needed]` | | daily / weekly / monthly / quarterly / event | board / ERC / sponsor-bank operating committee / state-MTL annual report / CFPB EXAMS |

## Recommended remediation portfolio

| Risk reference | Action | Owner role | Target date | Evidence link | Status |
|---|---|---|---|---|---|
| | | | | | proposed / in-progress / complete |

## Open items and named follow-ups

| Description | Owner role | Target date |
|---|---|---|
| | | |

## Gaps

| Description | Source citation | Severity | Owner role | Target close date |
|---|---|---|---|---|
| | | low / moderate / high / critical | | |

## Recommended disposition

[baseline-accepted | accept-with-conditions | remediate-then-re-baseline | escalate]

The artifact is a draft. The named approver decides.

## Source citations

| Claim | Source | Section | Retrieval date | URL or file ref | Notes |
|---|---|---|---|---|---|
| | | | | | paywalled disclaimer / [verify section] / current state confirmed |

Cite `references/source-anchors.md` for canonical citations. Use `[verify section]` if the section reference is unknown; do not invent.

---

*Assessment depth scales to the trigger and the audience.* A sponsor-bank annual review reads longer than a quarterly delta-risk review. A board-risk-committee read-out collapses the matrices to heat-map summaries with the supporting rows in an appendix. A state-MTL exam preparation file leads with the state geography row. A new-corridor delta review focuses on the affected corridor and the affected rail rows; unchanged rows summarise to a status line.
