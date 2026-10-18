# Example: BNPL program operator preparing its annual risk assessment after a CFPB action wave

Public-source-derived. No named program operator. The shape mirrors a common pattern at a mid-stage BNPL program operator running on debit-card and ACH rails through two sponsor processors with a thirty-state US footprint, preparing its annual second-line risk assessment in the wake of the CFPB BNPL / Pay-in-Four Interpretive Rule (May 2024 — **nullified by Pub. L. 119-11 (May 9, 2025); historical only**), the larger-participant rule for digital consumer payment applications, and the BNPL-themed Supervisory Highlights cycles.

## Input

- **Program operator role**: `bnpl-provider`. Pay-in-Four product structure on debit-card and ACH rails. Closed-end credit posture asserted by the firm; the CFPB Interpretive Rule on whether Pay-in-Four constitutes a credit-card-like product subject to Reg Z dispute-resolution provisions was **nullified by Pub. L. 119-11 (May 9, 2025); historical only.** Reg Z applicability now turns on the product structure under the regulatory text rather than the nullified interpretive rule.
- **Rails in scope**: card debit (settlement and dispute mechanics), ACH (repayment-pull mechanics), card credit (where the merchant settles via card credit; rare in the cohort), check (legacy rails for a small subset of the borrower book).
- **Segments in scope**: BNPL borrower (consumer); BNPL merchant (SMB).
- **Geographic footprint**: 30 US states. State-AG enforcement on BNPL fee disclosure has been active in CA, NY, and others; verify current state-AG actions on the analysis date.
- **Sponsor banks and processors**: two sponsor processors handling debit-card settlement and ACH origination; a single ledger provider; a fraud-decision vendor; a sanctions-screening vendor; a single dispute-management vendor.
- **Review trigger**: `annual-cycle` plus `larger-participant-rule-applicability` (the firm is at the threshold and is checking applicability under the December 2024 CFPB final rule).
- **Audience**: head of payments compliance and CCO; second-line is producing the artifact for the ERC and for the sponsor-bank operating committee at each of the two processors.
- **Source posture**: `public-plus-firm-policy-plus-system-of-record-evidence`. The firm has access to its ledger, dispute-management vendor extracts, and the sponsor-processor reporting feeds.
- **Engagement scope supplied**: institution = BNPL non-bank program operator; primary regulators = CFPB (direct under §1024 if larger-participant designation lands; otherwise indirect), state-AG offices in the 30-state footprint, FTC; persona = head of payments compliance; sector overlay = payments-fintech (sector flagship); cross-cutting overlays = conduct (default-on for consumer-facing program), cyber (default-on; processor and fraud-vendor stack), privacy (default-on; consumer NPI flows for fraud monitoring).

## Output sketch

The skill produces a payments risk assessment. Headlines:

- **Program summary** — BNPL program operator on debit-card and ACH rails; two sponsor processors; ledger and vendor stack named by role; 30-state footprint; current-cycle borrower book and merchant book sized by segment.

- **§1033 status note** — firm is a data provider for consumer-account-style BNPL ledger data under the Personal Financial Data Rights Final Rule; verify the firm's tier and implementation date on the analysis date; the docket has been active.

- **MSB / MTL status note** — fact-pattern-specific. The firm asserts non-MSB posture under the Pay-in-Four credit configuration; verify against the FinCEN administrative-ruling library; the state-by-state MTL footprint is verified through NMLS for any state that treats BNPL as money transmission (state treatment varies; verify per state).

- **Risk universe by rail**:
  - *Card debit* — top failure modes: chargeback-rate program escalation under the network monitoring program (Visa Dispute Monitoring Program / Mastercard Excessive Chargeback Merchant Compliance Program — paywalled, conceptual; verify program names and thresholds against the firm's licensed copy); Reg E §1005.6 unauthorised-transfer liability breach in the borrower-to-merchant repayment leg; Reg E §1005.11 dispute-timing failures (10 / 45 / 90-day windows). Residual risk: high. Top KRIs: chargeback-rate per merchant cohort; Reg E dispute-aging by stage.
  - *ACH (repayment-pull)* — top failure modes: unauthorised-return-rate breach against current NACHA threshold (R10, R11, R29, R51 codes; verify threshold and code list against the firm's licensed copy); WEB Debit account-validation rule failure (the rule effective March 19, 2021); administrative-return-rate breach. Residual risk: high. Top KRIs: unauthorised-return rate; account-validation coverage rate.
  - *Other rails* — summarised; not material to the borrower book.

- **Risk universe by segment**:
  - *BNPL borrower (consumer)* — top failure modes: fee disclosure (fee-vs-actual reconciliation against the firm's TILA-style or non-TILA disclosures; junk-fee themes per CFPB Circular series, verify current circular numbers); dispute-rights presentation (whether dispute language tracks the firm's actual dispute mechanics); Reg E §1005.11 timing failures presented as both Reg E findings and UDAAP findings; account-closure / hold UDAAP exposure where the borrower defaults trigger account hold beyond the contractual cure period. Residual risk: high. Top KRIs: dispute-timing-breach rate; complaint-volume vs CFPB Consumer Complaint Database benchmark; fee-disclosure reconciliation breach rate.
  - *BNPL merchant (SMB)* — top failure modes: chargeback-receipt timing on the merchant side; fee-disclosure on the merchant-side fee structure; merchant-categorisation accuracy (high-risk-vertical tagging). Residual risk: moderate. Top KRIs: merchant-side chargeback-rate; merchant-categorisation review cadence.

- **Risk universe by geography** — 30 state rows. CA row carries the CA DFPI under CCFPL applicability and active CA-AG enforcement on BNPL fee disclosure; NY row carries any NYDFS posture; each state row carries its own MTL / NMLS posture and MTMA adoption status. Default-to-USA is wrong; the operative obligations are state-by-state.

- **Concentration views**:
  - *Sponsor-bank* — n/a-as-banking-deposit; the BNPL construct does not run a sponsor-bank deposit relationship; the equivalent dependency is the sponsor-processor relationship. The assessment names the two sponsor processors explicitly.
  - *Processor* — top-N share by volume and value per rail; scenario impact under single-processor outage; current state is dual-processor for debit-card settlement, single-processor for ACH origination (a stretch on appetite given the unauthorised-return-rate risk).
  - *BIN-sponsor* — n/a (no card issuance in the cohort); BIN-sponsor row noted as not applicable.

- **Cross-cutting risks**:
  - *Customer-harm / UDAAP* — flagged red. Risk owner: CCO. Top KRIs: dispute-timing-breach rate; complaint-volume vs benchmark; fee-disclosure reconciliation breach rate. Deep-dive: `consumer-compliance-fair-lending/udaap-risk-review` with the payments-fintech overlay.
  - *Reporting / data quality* — yellow. Reg E §1005.11 dispute-timing data is the load-bearing report and the cadence has slipped vs the contractual SLA with the dispute-management vendor.
  - *Cyber* — yellow. Sponsor-processor SOC 2 Type II current at one processor; partial at the other (a Q2 audit period gap pending the next report).
  - *Fraud, AML / sanctions, operational resilience* — green-to-yellow per current cycle.

- **Risk-appetite posture** — red on the consumer-segment dispute-timing-breach KRI; yellow on the ACH unauthorised-return-rate KRI; yellow on the sponsor-processor concentration on ACH origination. Trigger conditions for red-to-amber escalation named.

- **KRI dictionary** — names each KRI with definition, source system, threshold (where set; `[evidence needed]` for the dispute-timing threshold which the firm has not formally set above the 10-day Reg E window), owner role, and cadence.

- **Recommended remediation portfolio** — Reg E §1005.11 dispute-timing reconciliation work plan; fee-disclosure refresh against current CFPB Circular guidance and the FDIC misrepresentation rule (where any FDIC framing appears); ACH unauthorised-return-rate sub-threshold programme; CFPB larger-participant-rule applicability check; second-processor evaluation for ACH origination redundancy.

- **Recommended disposition**: `accept-with-conditions`. Conditions: dispute-timing reconciliation evidenced before the next ERC cycle; fee-disclosure refresh evidenced before the next sponsor-processor annual review; CFPB larger-participant applicability decision in writing.

The assessment stops at the recommendation. The CCO and the head of payments compliance own sign-off; the sponsor-processor operating committees consume separately.

## Why this scenario matters

- **Boundary check on UDAAP-as-cross-cutting**: the dispute-timing failures sit in both the consumer segment row and the cross-cutting UDAAP row; the assessment cannot collapse them.
- **Boundary check on default-to-USA geography**: the BNPL state regime is state-by-state and state-AG action is the live enforcement vector. A single "USA" geography row would miss the CA DFPI under CCFPL angle entirely.
- **Boundary check on concentration sub-tables**: the BNPL construct shifts the "sponsor-bank" axis to "sponsor-processor" but keeps the discipline of three separate views. BIN-sponsor is not applicable here and is named as not applicable, not omitted.
- **Boundary check on §1033**: the data-provider role under §1033 is operative for consumer-account-style BNPL ledger data; the implementation tier needs verification, not assumption.
- **Boundary check on the larger-participant rule**: the assessment names the applicability check as a remediation item rather than asserting the determination.

## Anchors

- Reg E (12 CFR Part 1005) §1005.6, §1005.11.
- NACHA Operating Rules (current edition; paywalled; conceptual citation against firm's licensed copy) — return-rate thresholds, WEB Debit account-validation rule effective March 19, 2021, Third-Party Sender posture.
- Visa Core Rules and Mastercard Rules (current edition; paywalled; conceptual citation) — chargeback program escalation thresholds.
- CFPB Personal Financial Data Rights Final Rule under §1033 (October 22, 2024 — verify Federal Register citation and current docket status).
- CFPB final rule on larger participants of digital consumer payment applications (December 2024 — verify Federal Register citation and current state).
- CFPB BNPL / Pay-in-Four Interpretive Rule (May 2024) — **nullified by Pub. L. 119-11 (May 9, 2025); historical only.**
- CFPB Supervisory Highlights and Circular series (current cycles).
- FDIC misrepresentation rule, 12 CFR Part 328 Subpart B.
- State Money Transmitter Modernization Act adoption status via NMLS (state-by-state; verify on the analysis date).

See `references/source-anchors.md` for full citations and `references/sector-overlays/payments-fintech.md` for the rail-specific failure-mode menu.
