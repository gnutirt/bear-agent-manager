# Example: mid-sized payment-app fintech preparing the controls evidence pack for the sponsor bank's annual review

Public-source-derived. No named program operator and no named sponsor bank. The shape mirrors a common pattern at a mid-sized fintech offering a consumer payment app on a sponsor-bank deposit construct plus a closed-end personal-instalment lending product through the same sponsor bank, preparing its annual self-evidence pack ahead of the sponsor bank's principal-side review.

## Input

- **Program-operator role and sponsor-bank construct**: fintech program operator (consumer payment app plus lender-of-record-via-sponsor-bank product). Single sponsor bank, state-chartered non-member commercial bank, named by role only. Program agreement effective Q3 2022, amended twice (Q1 2024 to add a savings-style yield product; Q4 2024 to add a debit-card programme). Charter type drives FDIC plus state banking department prudential expectations through the program agreement.
- **Rails, products, customer base**: ACH (consumer payment app peer-to-peer plus repayment-pull on the lending product), card debit (the debit programme added Q4 2024 for spend at point-of-sale), Same Day ACH (instant-funding option on the payment app), check (legacy disbursement on the lending product, small subset). Products: deposit-style checking sub-balance, savings-style yield, instalment loans, debit-card programme. Geography: 18 US states (consumer footprint for the payment app and lending product).
- **Review trigger and audience**: `annual-cycle` for the sponsor bank's principal-side review (the fintech preparing for what the sponsor bank's TPRM team will ask for). The sponsor bank's TPRM team is the primary audience; the fintech's CCO and head of payments compliance are the second-line owners; the fintech's board risk committee receives a summary read-out. A parallel pack travels to the state-MTL examiner via NMLS in two states with active exams in cycle.
- **Source posture**: `public-plus-firm-policy-plus-system-of-record-evidence`. The firm has access to its ledger, dispute-management vendor extracts, FBO reconciliation feed from the sponsor bank, complaint-management system, processor portal for the debit programme, and the sponsor-bank reporting feeds.
- **Engagement scope supplied**: institution = mid-sized fintech program operator; primary regulators = sponsor bank's primary federal regulator (FDIC) plus state banking department flowing through the program agreement, FinCEN as the fintech's direct MSB regulator on the payment-app activity (configuration-specific; verify against the FinCEN administrative-ruling library), state-MTL regulators in the 18-state footprint via NMLS, CFPB indirectly through service-provider authority and through the sponsor bank, FTC for the debit programme advertising; persona = head of payments compliance at the fintech; sector overlay = payments-fintech (sector flagship); cross-cutting overlays = conduct (default-on for consumer-facing program), cyber (default-on; processor and KYC-vendor stack), privacy (default-on; consumer NPI flows for fraud monitoring beyond baseline).

## Output sketch

The skill produces the controls-evidence pack: a Word memo plus an Excel control inventory. Headlines:

### Program summary

Sponsor bank named by role with charter type (state-chartered non-member commercial bank), program-agreement effective date (Q3 2022) and amendment history (Q1 2024 yield product, Q4 2024 debit programme). Front-end processor named by role. BIN sponsor (which is the sponsor bank itself for the debit programme) named. Ledger provider, KYC / CIP vendor, fraud-decision vendor, sanctions-screening vendor, complaint-management vendor, dispute-management vendor each named by role. Geographic footprint: 18 US states. Customer-base size by segment (payment-app consumer, savings-yield consumer, lending borrower, debit-programme cardholder). Current-cycle volume and value by rail.

### Program-agreement excerpt — reporting cadence, transaction volume thresholds, escalation triggers

The pack carries the operative reporting-cadence clauses verbatim where firm policy permits (otherwise paraphrased with the clause reference and the version of the program agreement). The cadence the agreement specifies, summarised:

- **Reg E §1005.11 timing-data report** — weekly, within five business days of period end, to the sponsor-bank consumer-compliance officer. Threshold: any §1005.11 timing breach; any provisional-credit-not-entered exception. KRI feed: investigation-window aging by stage.
- **FBO subledger reconciliation report** — daily floor with intraday-sweep evidence on debit-programme funding flows, within four hours of EOD, to the sponsor-bank operations team. Threshold: any unreconciled break > $5,000 individual or > $25,000 aggregate (firm threshold; the agreement names the floor).
- **NACHA return-rate monitoring report** — monthly, within ten business days of month-end, to the sponsor-bank operations team and to the sponsor-bank BSA officer for the unauthorised-return subset. Threshold: 75% of NACHA's published unauthorised-return-rate threshold (current edition; specific sections to be confirmed against the firm's licensed copy of NACHA Operating Rules).
- **Complaint-volume report** — monthly, within ten business days, to the sponsor-bank operating committee. Triangulation against CFPB Consumer Complaint Database (firm's own pull; the database is a public-source benchmark).
- **SAR-aging and SAR-volume report** — monthly, to the sponsor-bank BSA officer. SAR-filing chain documented separately (the fintech files directly under 31 CFR §1022.320 as an MSB on the payment-app activity; the sponsor bank files on the deposit and lending activity; both files where the activity straddles).
- **Control-event notification** — within 24 hours of detection, to the sponsor-bank TPRM team and the sponsor-bank operating committee. Tighter than the sponsor-bank's own 36-hour prudential clock under the Computer-Security Incident Notification Rule (effective May 1, 2022); the contractual clock is the binding clock for the fintech.
- **Quarterly KRI pack** — to the sponsor-bank operating committee, on the operating-committee calendar.
- **Annual self-attestation pack** — this artifact, into the sponsor bank's principal-side review.

Transaction-volume thresholds for sponsor-bank approval named in the agreement: any new rail; any new product; any new vendor in a load-bearing role (KYC, fraud, sanctions, ledger, dispute-management); any geographic expansion; any change in volume or value > 25% month-on-month against the prior trailing-six-month baseline. Escalation triggers: any §1005.11 timing breach > 3 in a calendar month; any unauthorised-return-rate reading > 75% of the NACHA threshold; any unreconciled FBO break > $25,000 aggregate beyond next-day resolution; any examiner inquiry; any media inquiry; any SAR-filing volume change > 50% on prior cycle.

### Regulatory perimeter and licensing posture

- **FinCEN MSB registration status (for the fintech entity)**. The fintech is registered as an MSB under **31 CFR §1022.380** (initial registration filed within 180 days of becoming an MSB; current renewal on file; renewal cadence two years). Registration covers the payment-app peer-to-peer activity; the configuration is fact-specific against the FinCEN administrative-ruling library and the registration is on file accordingly. The savings-yield and lending activity sits with the sponsor bank as a regulated FI and does not separately require MSB registration. Written AML programme on file under §1022.210; CIP under §1022.220 in place; SAR-filing chain documented (see below).
- **State MTL footprint via NMLS — 18 states; per-state status, gaps to flag**. One row per state. Per-state columns: licence type held, NMLS unique identifier present, last exam date, expiration, MTMA adoption status (adopted-in-full / adopted-partial / not-adopted / pending-legislation) per CSBS, version-of-MTMA adopted, effective date, and any state-specific overlays. The footprint:
  - Twelve states with active MTL on file, MTMA adopted (mix of full and partial). NMLS status current.
  - Two states with active MTL on file, MTMA not adopted. The firm operates against the pre-MTMA state statute; renewal posture verified.
  - Two states with active MTL on file, MTMA pending-legislation. The firm tracks the legislative cycle and has a transition plan in draft.
  - Two states currently in licence-pending status (applications filed; activity gated until issuance). **Flagged as gap**: customer activity in these two states is currently routed through licensed-state account architecture; the fintech's per-customer geography determination relies on the KYC-vendor address signal and on a quarterly reconciliation pass. Severity: moderate. Owner: head of payments compliance. Target close: prior to the next sponsor-bank quarterly operating committee.
  - Multistate Licensing Agreement Program (MMLA) participation evidenced where available.
  - State-specific overlays: CA DFPI under CA Money Transmission Act and CCFPL applies to the CA row; NY DFS BitLicense is not applicable (no virtual currency activity in the cohort); state-specific EWA frameworks not applicable (no earned-wage-access product).
- **CFPB direct-supervision posture**. The CFPB larger-participant rule for general-use digital consumer payment applications was finalised November 21, 2024 and **nullified by Public Law 119-11 (CRA resolution of disapproval) effective May 9, 2025**. The artifact does not carry a CFPB direct-supervision posture row anchored to that rule. CFPB reach to the firm runs through (i) the sponsor bank as the regulated FI on the deposit and lending activity, with the fintech as service provider, and (ii) general CFPB enforcement authority. Customer-protection control evidence is built accordingly.

### AML programme alignment with the sponsor bank's BSA programme

The SAR-filing chain row records, as fact: the fintech files SARs directly under 31 CFR §1022.320 on the payment-app activity in its MSB role; the sponsor bank files SARs on the deposit, savings-yield, and lending activity in its role as the regulated FI; on activity that straddles (a payment-app transaction that funds an instalment-loan repayment, for example), both files in their respective roles. The fintech has a written information-sharing arrangement on the program agreement that names the inputs the fintech provides into the sponsor bank's SAR-decision-and-filing pass and the inputs the sponsor bank provides back. The fintech-side SAR-decision QA pass runs against the FFIEC BSA/AML Examination Manual (current edition) on the MSB-direct subset; the sponsor-bank-side QA pass runs against the manual on the sponsor-bank subset; the §1867(c) examiner-access posture (the sponsor bank's primary federal regulator can examine the activity at the program operator as if performed by the bank) is named explicitly. This is fact, not legal conclusion; counsel owns the legal characterisation.

The OFAC sanctions-screening cadence (real-time on transaction initiation; daily batch on customer base against current SDN list refresh; quarterly false-positive resolution review) is documented per 31 CFR Part 501. The Travel Rule under 31 CFR §1010.410(f) at the current threshold for non-bank financial institutions (verify on the analysis date; the FinCEN proposed rule to lower the threshold has been in the docket) is in force on the payment-app rails where applicable.

### FBO / customer-funds account mechanics — per product flow

One row per product flow under the FBO architecture. Per-flow:
- **Payment-app deposit-style checking sub-balance**: subledger reconciliation cadence daily floor at EOD plus intraday at midday; break-resolution SLA 4 hours within reconciliation cycle; aging report shows 0 unreconciled breaks > 24 hours in the trailing 12 months. Customer-facing FDIC representation reviewed against 12 CFR Part 328 Subpart B on web, mobile app, marketing email, in-app push, and statement surfaces (the misrepresentation rule is the binding text). Pass-through deposit insurance recordkeeping per Part 330 §330.5: customer-by-customer beneficial-interest detail in the firm's ledger, retention with the sponsor bank's master-account records, naming convention documented. Escheatment posture: per state, with the unclaimed-property processor named.
- **Savings-style yield product**: separate FBO sub-account at the sponsor bank; subledger cadence daily floor; break-resolution SLA 4 hours; pass-through recordkeeping per Part 330 §330.5; APY disclosure on the product surfaces reviewed against Reg DD §1030.4 / §1030.5 / §1030.7 / §1030.8.
- **Debit-card programme funding sub-balance**: subledger reconciliation intraday on funding flows (every 30 minutes during operating hours) plus daily floor at EOD; break-resolution SLA 2 hours within reconciliation cycle (tighter than the deposit-style flow because funding-leg breaks cascade into authorisation decisions); processor portal cross-reconciled to the sponsor-bank FBO feed.
- **Lending product disbursement and repayment-pull holding**: short-window holding for disbursement-day proceeds and for repayment-pull receipts; subledger cadence daily floor; break-resolution SLA 4 hours.

The Joint Statement on Banks' Arrangements with Third Parties to Deliver Bank Deposit Products and Services (FDIC / OCC / FRB, July 25, 2024) is cited as the supervisory guidance; 12 CFR Part 330 (deposit-insurance recordkeeping including pass-through under §330.5) and 12 CFR Part 328 Subpart B (misrepresentation rule) are the binding text.

### §1033 status note

The fintech is a data provider under the CFPB Personal Financial Data Rights Final Rule (October 22, 2024) for the consumer-account-style payment-app deposit data and for the savings-yield product data; verify the firm's tier on the analysis date. **§1033 compliance dates were stayed October 29, 2025 (Forcht Bank, N.A. v. CFPB); the CFPB initiated a reconsideration with an ANPR on August 22, 2025.** The artifact carries the posture not the calendar: monitoring the ANPR docket; loading-bearing build investment paused pending the ANPR follow-on; inventory and consent-architecture readiness work that survives any plausible rewrite continuing on track. **FDX (Financial Data Exchange) was recognised by the CFPB as a §1033 standard-setter on January 8, 2025**; the firm's data-sharing posture is built against FDX standards. The deep-dive lives in `open-banking-data-controls`; this skill names the posture and cross-links.

### BNPL nullification context

Not directly applicable in the cohort (no Pay-in-Four BNPL product). The CFPB BNPL / Pay-in-Four Interpretive Rule (May 2024) was nullified by Pub. L. 119-11 (May 9, 2025); historical only. The lending product in scope is closed-end personal-instalment credit under Reg Z Subpart C with disclosed APR and the firm's TILA-disclosure stack reviewed; the BNPL Interpretive Rule does not bear on this product.

### Reg E controls

§1005.6 unauthorised-transfer-liability allocation between the fintech and the sponsor bank documented per the program-agreement clause text and per the actual claims-handling chain (fintech receives the claim, fintech triages and notifies the consumer, fintech issues provisional credit, fintech re-papers to the sponsor bank's books on resolution). §1005.7 initial disclosures including the consumer-liability disclosure, error-resolution-procedures notice, and contact information reviewed on the firm's surfaces. §1005.11 procedures for resolving errors with the 10 / 45 / 90-day clocks evidenced through dispute-management vendor extracts and aging reports; the §1005.11 timing-breach rate is the load-bearing KRI to the sponsor bank, currently below the firm's red threshold for two consecutive cycles. §1005.18 Subpart A applicability not applicable (no prepaid-account product). §1005.31 remittance-transfer-rule subpart B not applicable (no cross-border consumer remittance activity in the cohort).

### NACHA controls

The fintech operates as a Third-Party Sender under the sponsor bank's ODFI status; Third-Party Sender registration current; Originator agreements on file. Return-rate monitoring at the Originator level against current administrative, overall, and unauthorised-return-rate thresholds (paywalled — current edition; specific sections to be confirmed against the firm's licensed copy of NACHA Operating Rules). WEB Debit account-validation rule effective March 19, 2021 in force; the firm uses commercially reasonable account-validation through the KYC vendor. Same Day ACH per-transaction dollar-limit and window-cutover controls in place. NOC handling documented. Settlement reconciliation evidence runs against the sponsor-bank FBO feed.

### Card-network controls (debit programme, added Q4 2024)

Chargeback intake and timing windows (paywalled — current edition; specific sections to be confirmed against the firm's licensed copy of Visa Core Rules / Visa Product and Service Rules / Mastercard Rules per the network the BIN sponsor uses). Fraud-rate program escalation under the network monitoring program currently below trigger thresholds. BIN-sponsor coordination is in-house in this construct (the sponsor bank is the BIN sponsor). Reg II §235.7 routing posture: two unaffiliated networks per debit card configured. EMV liability-shift posture documented.

### Sponsor-bank reporting cadence (cross-link to the program-agreement excerpt above)

The named reports are listed in the program-agreement excerpt section. The artifact cross-references each report row to its evidence-of-last-delivery (delivery timestamp, channel, addressee role, file reference). The §1005.11 timing-data report and the FBO subledger reconciliation report are in green status for the trailing three cycles; the NACHA return-rate report and the complaint-volume report are in green status for the trailing three cycles; the SAR-aging report had a one-time slip in cycle T-7 (a four-business-day delay vs the ten-business-day clock) which is recorded as a closed finding with documented remediation.

### Subcontractor and fourth-party register

Each material vendor — front-end processor, KYC / CIP vendor, fraud-decision vendor, sanctions-screening vendor, ledger provider, dispute-management vendor, complaint-management vendor — listed with function, criticality, evidence-of-oversight artifact (most-recent SOC 2 with audit period and last-tested control gaps), contract clause coverage. The Interagency Guidance on Third-Party Relationships (June 6, 2023) treats these as fourth parties to the sponsor bank's relationship with the fintech; the bank's TPRM expects the register.

### 12-month incident-history summary

Three incidents in the trailing 12 months. One processor-side mis-applied ACH return batch (Q3 of the trailing year; cross-link to `payment-operations-incident-review` for the per-incident workflow); one BIN-onboarding routing-table misconfiguration on the debit programme launch (Q4 of the trailing year; contained, no customer impact); one customer-disclosure-surface inconsistency on the savings-yield APY disclosure that triggered a Reg DD §1030.4 finding by the firm's internal audit (Q1 of the current year; remediated within cycle). Each row carries detection date, root cause, customer impact, sponsor-bank notification time against the contractual 24-hour clock, regulatory-notification posture, remediation status, and read-across to the affected control families.

### Self-evidence index

A single index, control reference by control reference, naming the artifact, the artifact owner, the location (system of record, vendor portal, document repository), the last-refreshed date, and a freshness flag (current / aging / stale / not-on-file). The sponsor-bank TPRM team consumes this index; it is the bridge between the inventory and the evidence.

### Gaps and recommended remediation

Three gaps surfaced. (1) Two state-MTL applications in pending status; customer routing through licensed-state architecture as the bridge; severity moderate; owner head of payments compliance; target close prior to the next sponsor-bank quarterly operating committee. (2) FBO recordkeeping naming convention on the debit-programme funding sub-balance is documented but is not yet aligned with the convention used on the other three product flows; severity low; owner controller; target close current quarter. (3) The §1033 ANPR posture monitoring is on track but the firm's documented data-recipient permissioning architecture (for any future role as a data recipient) is in draft; severity informational; owner head of payments compliance; target close prior to ANPR follow-on rule release.

### Recommended disposition

`ready-with-conditions`. Conditions: (i) state-MTL pending applications closed or, where issuance slips beyond the next quarterly operating committee, customer-routing evidence refreshed and reported to the sponsor-bank TPRM team out-of-cycle; (ii) FBO recordkeeping naming convention aligned across all four product flows in the current quarter; (iii) program-agreement reporting-cadence evidence-of-last-delivery row maintained on each cycle's pack with no further slip on the SAR-aging report. The head of payments compliance, the CCO, and the BSA officer at the fintech own sign-off; the sponsor bank's TPRM team consumes the workbook against its own intake template; the memo travels with the workbook as the second-line cover and the disposition recommendation.

## Why this scenario matters

- **Boundary check on FinCEN MSB cite discipline**: the registration cite reads §1022.380 throughout, never §1010.380. The MSB-vs-not configuration is fact-specific against the FinCEN administrative-ruling library; the registration cite is fixed.
- **Boundary check on the BNPL nullification context**: the artifact records that the BNPL Interpretive Rule was nullified by Pub. L. 119-11 even though the cohort does not carry a Pay-in-Four product, because a multi-product fintech might revisit the question and the cite has to be correct.
- **Boundary check on §1033 stay**: the artifact carries posture not calendar, names the Forcht Bank stay (October 29, 2025) and the CFPB ANPR (August 22, 2025), and recommends a phased build posture rather than over- or under-investing.
- **Boundary check on MTMA state adoption**: the licensing posture row carries one row per state with version-of-MTMA-adopted, not a blanket framework reading; two-state pending applications surface as a flagged gap rather than being hidden.
- **Boundary check on FBO pass-through documentation per product flow**: the FBO row decomposes into four product flows with per-flow pass-through recordkeeping evidence rather than a blanket "complete" reading.
- **Boundary check on the SAR-filing chain and the §1867(c) posture**: the SAR row names which entity files in which channel for which activity, and names the §1867(c) examiner-access posture explicitly. The fintech-side QA and the sponsor-bank-side QA are documented as separate passes with the boundary named.
- **Boundary check on the program-agreement reporting cadence**: the artifact carries the granular cadence the agreement specifies (weekly Reg E timing-data report, daily FBO floor, monthly NACHA, monthly complaint-volume, monthly SAR-aging, 24-hour control-event clock, quarterly KRI pack), each with clause reference, clock-start basis, contractual deadline, owner, recipient, and evidence of last delivery.

## Anchors

- Reg E (12 CFR Part 1005) §1005.6, §1005.7, §1005.11.
- Reg DD (12 CFR Part 1030) §1030.4, §1030.5, §1030.7, §1030.8.
- Reg II (12 CFR Part 235) §235.7.
- Reg Z (12 CFR Part 1026) Subpart C closed-end credit.
- NACHA Operating Rules (current edition; paywalled; conceptual citation against firm's licensed copy) — Third-Party Sender posture, return-rate thresholds, WEB Debit account-validation rule effective March 19, 2021, Same Day ACH.
- Visa Core Rules / Visa Product and Service Rules / Mastercard Rules (current edition; paywalled; conceptual citation) — chargeback windows, network monitoring programs, Reg II routing.
- 31 CFR Part 1022 — §1022.210 written AML programme, §1022.220 CIP, §1022.320 SAR filing, **§1022.380 MSB registration**.
- 31 CFR §1010.410(f) Travel Rule (verify current threshold).
- 31 CFR Part 501 OFAC Reporting, Procedures and Penalties Regulations.
- FFIEC BSA/AML Examination Manual (current edition).
- 12 USC §1867(c) examiner-access for services performed by third parties.
- 12 CFR Part 330 — pass-through deposit insurance recordkeeping including §330.5.
- 12 CFR Part 328 Subpart B — FDIC misrepresentation rule.
- Joint Statement on Banks' Arrangements with Third Parties to Deliver Bank Deposit Products and Services (FDIC / OCC / FRB, July 25, 2024).
- Interagency Guidance on Third-Party Relationships: Risk Management (OCC Bulletin 2023-17 / FRB SR 23-4 / FDIC FIL-29-2023, June 6, 2023).
- Computer-Security Incident Notification Rule (12 CFR Part 53 / Part 225 Subpart N / Part 304 Subpart E, effective May 1, 2022) — sponsor bank's 36-hour clock; the fintech's 24-hour contractual clock is timed against it.
- CFPB Personal Financial Data Rights Final Rule under §1033 (October 22, 2024) — **§1033 compliance dates stayed October 29, 2025 (Forcht Bank, N.A. v. CFPB); CFPB-initiated reconsideration with ANPR (August 22, 2025); FDX recognised as a §1033 standard-setter (January 8, 2025).**
- CFPB larger-participant rule for general-use digital consumer payment applications (finalised November 21, 2024) — **nullified by Public Law 119-11 effective May 9, 2025**.
- CFPB BNPL / Pay-in-Four Interpretive Rule (May 2024) — **nullified by Pub. L. 119-11 (May 9, 2025); historical only.**
- Money Transmitter Modernization Act (CSBS model law) — verify state-by-state adoption status and version on the analysis date through NMLS.
- NMLS — the licensing system of record for state MTLs.

See `references/source-anchors.md` for full citations and `references/sector-overlays/payments-fintech.md` for the rail-specific failure-mode menu.
