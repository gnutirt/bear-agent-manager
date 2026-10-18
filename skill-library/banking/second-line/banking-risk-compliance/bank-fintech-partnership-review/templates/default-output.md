# Bank-fintech partnership review pack — output template

A draft until the named lead attests. Roles only, never named individuals. Cite every material claim against `references/source-anchors.md`, `references/sector-overlays/banking.md`, or a loaded cross-cutting overlay by path. Mark unsupported items `[evidence needed]`. Mark unconfirmed section references `[verify section]`.

## Cover and partnership scope

| Field | Value |
|---|---|
| Pack ID | |
| Pack date | |
| Engagement stage | pre-LOI / pre-contract / pre-launch / production / refresh / exam-driven / wind-down |
| Source posture | public-only / public-plus-firm-policy / public-plus-firm-policy-plus-evidence / connector-aware |
| Access population | |
| Confidence label | high / medium / low |

### Bank profile

| Field | Value |
|---|---|
| Bank type | national-bank / state-member-bank / state-non-member-bank / federal-savings-association / state-savings-association |
| Primary federal regulator | OCC / FRB / FDIC |
| State supervisor (where applicable) | |
| Asset size band | <10B / 10B-50B / 50B-100B / 100B-250B / >250B |
| Heightened Standards applicability (12 CFR Part 30 Appendix D) | yes / approaching / no |
| BHC public-registrant status | yes / no |

### Fintech profile

| Field | Value |
|---|---|
| Program type | BaaS-deposit / BaaS-card / embedded-lending / fraud-or-KYC-service / payments-processor / co-brand-card / other |
| Customer of record | bank / fintech / joint |
| Brand presentation | bank-front / fintech-front / co-branded |
| Middleware-platform dependency (if any) | |

### Cross-cutting overlays loaded

cyber / privacy / conduct / none

## Executive summary

- [Overall partnership-readiness posture]
- [Top supervisory exposure across the six sections]
- [Headline contract gap or customer-facing-controls gap]
- [Termination-readiness headline]
- [Recommended owner-action headline]

## Reviewer questions

- [Open questions for the chief risk officer, chief compliance officer, BSA officer, head of vendor management, head of deposit operations, or general counsel before the pack ships]

---

## 1. Service description and risk classification

**What the fintech does for the bank and its customers.** [Plain-language description of the service: BaaS deposit issuance, embedded-lending origination, fraud / KYC service, payments-processor, co-brand card, etc.]

**Where the fintech sits in the customer experience.** [Front-of-app / behind-the-scenes / jointly branded; named-system pointers if known.]

**Customer of record.** [Bank or fintech; map to deposit-insurance recordkeeping under 12 CFR Part 330 §330.5 [verify section] for sponsor-bank deposit programs; map to regulated-product responsibility for credit and payments products.]

**Money flow.** [FBO-account structure where applicable; ledgering location (bank, fintech, middleware platform); settlement cadence; reconciliation cadence and named-role owner for breaks.]

**Middleware-platform dependency.** [Where the fintech relies on a middleware platform, the platform is a fourth-party; the bank's program covers it.]

**Criticality classification.** critical-activity / significant / lower-risk. Drivers: customer-facing position; money-flow position; CIP / KYC reliance; share of bank deposits, fee income, or strategic positioning.

**BSA / AML risk classification.** [Pillars implicated: CIP under 31 CFR §1020.220, CDD, beneficial-ownership under 31 CFR §1010.230 [verify], suspicious-activity monitoring, OFAC.]

**Heightened Standards applicability.** [For covered partner banks under 12 CFR Part 30 Appendix D, the third-party-risk integration into the risk-governance framework reads alongside this pack.]

## 2. Risk-based diligence summary

| Diligence category (per June 2023 Interagency Guidance) | Status | Evidence pointer | Gap description | Confidence |
|---|---|---|---|---|
| Strategy and goals | complete / partial / missing / not-applicable | | | |
| Legal and regulatory compliance | | | | |
| Financial condition (recent audited financials, dated) | | | | |
| Business experience | | | | |
| Qualifications and backgrounds of principals | | | | |
| Risk management | | | | |
| Information security | | | | |
| Management of information systems | | | | |
| Resilience (business continuity, incident response) | | | | |
| Incident reporting and management (sized to the bank's 36-hour clock under 12 CFR Part 53 / Part 225 / Part 304) | | | | |
| Physical security | | | | |
| Reliance on subcontractors (named subcontractors / middleware platform) | | | | |
| Insurance (cyber, E&O, fidelity, named-insured posture) | | | | |
| Conflicts of interest | | | | |

### Reg O insider screen

| Question | Result | Evidence pointer |
|---|---|---|
| Any fintech principal an insider (executive officer, director, principal shareholder, related interest) of the partner bank or its affiliates under 12 CFR §215.2? | yes / no / unknown | |
| If yes, any extension of credit, credit-equivalent transaction, or covered transaction implicated under §215.4 / §215.5? | | |
| Aggregate-limit headroom and prior-approval status under §215.4 / §215.5 | | |

### Reg W affiliate test

| Question | Result | Evidence pointer |
|---|---|---|
| Is the fintech an affiliate under 12 CFR §223.2 (25% control test, management-interlock, common control through a holding-company)? | yes / no / unknown | |
| If yes, covered transactions under §223.11 / §223.12 in scope and against the 10% / 20% quantitative limits | | |
| Collateral position under §223.13 | | |
| §223.41 attribution rules screen on non-affiliate transactions whose proceeds flow to the affiliate | | |

### Bank Service Company Act notification

| Question | Result | Evidence pointer |
|---|---|---|
| Notification to primary federal regulator under 12 USC §1867(c) on file | yes / no / not-yet-required | |

## 3. Contract gaps

| Clause topic | Current contract position | Gap description | Severity | Recommended action |
|---|---|---|---|---|
| §1867(c) examination flow-down (regulator access, audit rights, examiner cooperation, subcontractor cooperation) | | | high / medium / low | |
| SLAs and operational metrics | | | | |
| Information security clauses (incident notification timelines sized to 12 CFR Part 53 / Part 225 / Part 304 36-hour rule; NYDFS §500.17(a) compatibility where applicable; data-return on termination) | | | | |
| Subcontractor governance (notice, consent, flow-down of bank requirements, fourth-party cyber controls) | | | | |
| Customer-data ownership and use restrictions | | | | |
| Insurance (named-insured posture, cyber sub-limits, additional-insured posture, claims cooperation) | | | | |
| Indemnification | | | | |
| Limits on fintech use of bank brand and disclosures | | | | |
| Right-to-audit and right-to-test | | | | |
| Exit and wind-down clauses (data return format and timeline, customer-account portability, transition assistance, communication rights) | | | | |

## 4. Customer-facing controls

### Reg E division of responsibility

| Question | Position | Evidence pointer |
|---|---|---|
| Which entity is the financial institution under 12 CFR §1005.2(i)? | bank / fintech / unclear | |
| Initial disclosures responsibility under §1005.7 | | |
| Error-resolution intake responsibility under §1005.11 (10 business days for investigation, 5 business days for provisional credit, 45 calendar days for completion in standard cases, 90 days for new-account / POS / foreign cases) | | |
| Bank's fallback when the fintech misses an intake event | | |
| Provisional credit responsibility | | |
| Recordkeeping and §1005.13 administrative-enforcement posture | | |

### Reg DD division of responsibility

| Question | Position | Evidence pointer |
|---|---|---|
| Which entity provides §1030.4 account disclosures? | | |
| Advertising-rule responsibility under §1030.8 (APY accuracy, the seven triggering terms, no-misleading-advertising standard) | | |
| Marketing-review approval gate (named role and SOP) | | |
| Bank's attestation cadence on fintech-shipped marketing copy in the bank's name | | |

### UDAAP screen

| Item | Status | Evidence pointer |
|---|---|---|
| Customer-facing copy reviewed for unfair, deceptive, abusive practice risk | | |
| Fee structure and disclosure fairness | | |
| Customer journey for adverse-action and dispute scenarios | | |

### Complaint routing

| Question | Position | Evidence pointer |
|---|---|---|
| Front-line complaint receiver (bank / fintech / joint) | | |
| Forward-to-bank cadence and SOP | | |
| CFPB Consumer Complaint Database handling | | |
| OCC / FDIC consumer-complaint portal handling | | |

## 5. Reg O / Reg W / Reg E / Reg DD applicability summary

| Regulation | Applicable | Position | Gap description |
|---|---|---|---|
| Reg O (12 CFR Part 215) | yes / no | [insider-screen result, covered transactions, prior-approval status, aggregate-limit headroom] | |
| Reg W (12 CFR Part 223) | yes / no | [affiliate determination, covered-transaction inventory, collateral and quantitative-limit position, attribution rules] | |
| Reg E (12 CFR Part 1005) | yes / no | [financial-institution determination under §1005.2(i), error-resolution responsibility, disclosure responsibility, bank fallback for §1005.11 timing] | |
| Reg DD (12 CFR Part 1030) | yes / no | [depository-institution determination, §1030.4 disclosure responsibility, §1030.8 advertising-rule risk on fintech-shipped copy] | |

## 6. Termination and wind-down readiness

### Triggers documented in contract

| Trigger | In contract | Evidence pointer |
|---|---|---|
| Financial deterioration | yes / no | |
| BSA / AML deterioration | | |
| Cyber deterioration (loss of SOC 2, loss of cyber insurance, change of control, regulator-notification incident at the fintech) | | |
| Regulator concern | | |
| Contract breach | | |
| Strategic exit | | |

### Wind-down sequence

| Element | Position | Evidence pointer |
|---|---|---|
| Customer notification responsibility and timeline | | |
| Customer-account portability (deposit-program deconversion to alternative bank, data return, ledger reconciliation) | | |
| FBO-account wind-down sequence | | |
| Resolution of pending Reg E disputes, Reg DD obligations, and outstanding disclosures | | |
| Cyber-side wind-down (audit-trail extraction and retention; encryption-key handover or destruction; customer-NPI return or destruction with attestation) | | |
| Most recent simulated wind-down or tabletop (date) | | |

---

## Recommended owner actions

| Action | Owner role | Target date or trigger | Source linkage |
|---|---|---|---|
| | head of vendor management / chief compliance officer / chief risk officer / BSA officer / head of deposit operations / general counsel / head of consumer compliance / CISO | | |

## Coverage gaps

| Diligence category or section | Gap | Reason for low confidence |
|---|---|---|

## Source trace

- [Every material claim cites a source from `references/source-anchors.md`, `references/sector-overlays/banking.md`, or a loaded cross-cutting overlay by path.]
- [Unsupported items: `[evidence needed]`.]
- [Unconfirmed section references: `[verify section]`.]
- [CSI references: bound to access population per 12 CFR Part 4 Subpart C / Part 261 / Part 309.]

## Sign-off

| Role | Attested | Date |
|---|---|---|
| Head of vendor management | | |
| Chief compliance officer | | |
| Chief risk officer | | |
| BSA officer (if BSA / AML scope) | | |
| Head of deposit operations (if deposit-program scope) | | |
| Head of information security (if cyber overlay loaded) | | |
| General counsel | | |
