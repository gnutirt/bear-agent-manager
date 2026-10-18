# Sector overlay — payments-fintech

This skill is the payments-fintech sector flagship. The overlay is not "extra payments flavour layered on a generic primitive"; it is the workflow itself. This file carries the rail-specific, sponsor-bank-specific, money-transmitter-specific detail that the matrix rows must reflect.

The overlay is required-on for every engagement run through this skill. SKILL.md does not gate on it.

## Rail-specific failure modes (matrix denominators, not generic risks)

Drop these into the **risk universe by rail** matrix as the top-three failure-mode candidates per row. The actual top three for any program depend on volume mix and prior-cycle KRI history; the menu below is the source.

**ACH (originated; received separately).** Unauthorised-return-rate breach against the current NACHA threshold (R10, R11, R29, R51 codes drive the unauthorised-return rate; verify current code list and threshold against the firm's licensed copy of the current edition). Administrative-return-rate breach (R02, R03, R04 codes). Overall-return-rate breach. Same Day ACH cutover errors (window misses; per-transaction dollar-limit breach against the current limit). WEB Debit account-validation rule failure (the account-validation requirement effective March 19, 2021; cite the rule as paywalled and confirm against the firm's licensed copy). Third-Party Sender risk-management failure (Originator agreements not on file; return-rate monitoring not at the Originator level; registration not current). NACHA risk-management framework breach (network risk management posture, monthly reporting). NOC handling failures.

**Same Day ACH (subset).** As above plus: window-cutover errors specific to Same Day windows; settlement-window funding errors at the ODFI; per-transaction dollar-limit breaches.

**Wire (Fedwire / CHIPS).** Sanctions-screening latency on outbound wires; misdirected-wire fraud (BEC patterns); reversal mechanic limits (a wire is final at the Federal Reserve credit; recovery is a goodwill mechanic, not a right); Fedwire / CHIPS hours coverage; correspondent-bank de-risking on cross-border legs.

**Card debit.** Chargeback-rate program escalation under the network monitoring program (Visa Dispute Monitoring Program / Mastercard Excessive Chargeback Merchant Compliance Program — verify program names and thresholds against the firm's licensed copy). Fraud-rate program escalation (Visa Fraud Monitoring Program / Mastercard Excessive Fraud Merchant Compliance Program). PIN-debit / signature-debit routing failure under Reg II §235.7. BIN-sponsor reporting failure. EMV liability-shift failure. Reg E §1005.6 unauthorised-transfer liability breaches. Reg E §1005.11 dispute-timing failures.

**Card credit (where in scope).** As above plus Reg Z disclosure failures; CARD Act compliance posture (where applicable).

**FedNow.** Settlement-finality irrevocability (a credit is final on receipt; recovery is request-for-return-of-funds, not chargeback). Request-for-return-of-funds latency. ISO 20022 message-field anomalies (suspicious creditor account, suspicious end-to-end ID). Operating-hours coverage and 24/7/365 staffing posture. Fraud-hold posture. Liquidity-management posture (intraday).

**RTP.** As FedNow plus participant-rule-specific obligations under The Clearing House RTP Operating Rules (current edition; verify version date).

**P2P (Zelle, Venmo-style, Cash App-style).** Reg E §1005.6 unauthorised-transfer liability breach (CFPB Supervisory Highlights and the 2023-26 Zelle-themed actions establish that this is a high-frequency examiner-finding lane; verify current actions). Reg E §1005.11 dispute-timing failures. Authorised-fraud (scam) recovery posture (network-rule mechanics; non-binding industry frameworks). Account-takeover (ATO) fraud rate.

**Check.** Hold-period failures under Reg CC. Forged-check / altered-check liability. Positive-pay file failures (where applicable).

**Cross-border correspondent.** OFAC-screening latency on outbound and inbound. Correspondent-bank de-risking. FX-disclosure timing under Reg E §1005.31 subpart B (pre-payment / post-payment disclosure timing). Sanctioned-jurisdiction proximity. SWIFT MT / ISO 20022 message-field handling. Travel Rule applicability under 31 CFR §1010.410(f) at threshold (verify current threshold).

**Virtual-currency on-ramp / off-ramp.** Travel Rule applicability under 31 CFR §1010.410(f) for transmittals at threshold (verify current threshold and the FinCEN proposed-rule status). FinCEN CVC guidance (FIN-2013-G001 and FIN-2019-G001; verify currency). VASP counterparty screening. Chain-analytics vendor coverage. NYDFS BitLicense applicability under 23 NYCRR Part 200 where the program touches NY persons. State-by-state money transmitter applicability (CSBS MTMA adoption status varies; verify state-by-state).

## Customer-segment risk patterns

**Consumer.** Reg E §1005.11 dispute-timing failures (10 / 45 / 90-day windows). Account-closure / hold without notice or recourse — the most-frequent fintech UDAAP theme per CFPB Supervisory Highlights. Fee-disclosure-vs-actual reconciliation. FDIC-insurance representation under 12 CFR Part 328 Subpart B. Dark-pattern risk in onboarding and product-selection flows.

**SMB.** Treasury-management dispute mechanics (Reg E does not cover business-account EFTs; UCC Article 4A governs commercial wires; commercial-account terms govern ACH and card). Account-closure / hold posture (UDAAP exposure carries through where the program markets to SMB consumer-style). Funding-flow concentration (single-customer-of-the-program risk).

**Payroll-on-demand / earned-wage access (EWA).** State-licensing applicability (state EWA frameworks vary; verify state-by-state). Fee-vs-tip presentation (the CFPB BNPL / Pay-in-Four Interpretive Rule was **nullified by Pub. L. 119-11 (May 9, 2025); historical only.** EWA proposed rule and Supervisory Highlights themes; verify current state). Reg E and Reg Z applicability question.

**Gig-economy disbursement.** Push-to-card disbursement velocity (fraud signal); 1099-payment information reporting (separate from the risk lane but operationally adjacent). Account-takeover patterns on instant-funded accounts.

**BNPL borrower / merchant.** The CFPB BNPL / Pay-in-Four Interpretive Rule was **nullified by Pub. L. 119-11 (May 9, 2025); historical only.** Reg Z applicability now turns on the product structure under the regulatory text rather than the nullified interpretive rule (verify open-end vs closed-end credit posture for how the firm has structured the product). Dispute-rights presentation. Fee disclosure. Late-fee policy. Reg E §1005.11 applicability where the BNPL flow runs on debit-card rails.

**Cross-border remittance sender / receiver.** Reg E §1005.31 subpart B remittance-transfer rule pre-payment and post-payment disclosure timing. OFAC sanctions-screening posture per corridor. Travel Rule. Corridor-specific consumer-protection (each corridor country has its own; verify per corridor).

**High-risk vertical (gambling, adult, MSB customer, cannabis-adjacent, MLM).** Card-network high-risk merchant categorisation. ACH return-rate monitoring at heightened thresholds. SAR-pattern monitoring at heightened expectation. Underbanked / de-risked counterparty management.

## Geography-row content

The geography matrix has one row per US state in scope plus one row per corridor country if cross-border. Default-to-USA is wrong; the operative obligations are state-by-state.

**Per US state row, the licensing posture column carries:**

- MTL via NMLS (status, expiration, last exam date).
- Money Transmitter Modernization Act adoption status for the state (verify state-by-state on the analysis date).
- MSB registration status under FinCEN 31 CFR §1022.380 where applicable.
- State DFI / DOB registration where required.
- Specialised licences (NYDFS BitLicense for VC activity in NY; CA DFPI under CA Money Transmission Act and CCFPL; state-specific EWA frameworks; state-specific BNPL frameworks).

**Per corridor country row, the licensing posture column carries:**

- Sending-side US obligation (Reg E §1005.31 subpart B; OFAC screening posture per corridor; FinCEN obligations; Travel Rule).
- Receiving-side host-country obligation (named at high level; the assessment does not substitute for local counsel).
- Corridor-specific vendor stack (FX vendor, last-mile vendor, sanctions-screening vendor coverage).

## Sponsor-bank construct

The assessment must reflect the operative sponsor-bank construct and the obligations that flow from it. Anchored to:

- **Interagency Guidance on Third-Party Relationships** (June 6, 2023) — the bank's principal-side oversight expectation, which is the lens the sponsor bank applies to the program operator. Subcontractor / fourth-party expectations under risk-based application apply (the processor, BIN sponsor, ledger provider, KYC vendor, fraud-decision vendor are the usual fourth-party pyramid).
- **OCC / FRB / FDIC Joint Statement on Banks' Arrangements with Third Parties to Deliver Bank Deposit Products and Services** (July 25, 2024 — verify exact date). End-customer reconciliation (FBO subledger reconciliation cadence and break-resolution); deposit-insurance representation review (the customer-facing FDIC framing must be re-papered on any sponsor change); operational-resilience expectations on the program operator.
- **FDIC misrepresentation rule, 12 CFR Part 328 Subpart B** (verify amendments and effective dates). Standards for non-bank entities holding out deposit insurance; this drives marketing-claim review for any "FDIC-insured" framing on fintech surfaces.

The 2023 RFI on bank-fintech arrangements is not the binding statement. The artifact must cite the July 2024 joint statement, not the RFI.

## Concentration sub-tables (three, not one)

**Sponsor-bank concentration.** Top-N share by deposits, by transaction volume, by transaction value, by customer count. Scenario impact under single-sponsor exit (consent-order-driven, business-decision-driven, or merger-driven). Standby-sponsor and dual-sponsor architecture status. Pre-papered transition-services-agreement status. Anchored to the Joint Statement on Bank-Fintech Arrangements (July 2024) and to the 2023-24 sponsor-bank consent-order wave (verify which actions are current and finalised).

**Processor concentration.** Top-N share by volume and value per rail. Scenario impact under single-processor outage or consent-order. Rail-by-rail redundancy (dual-processor architecture per rail; some rails carry single-processor concentration that is operationally rational; the assessment names which is which).

**BIN-sponsor concentration.** Top-N share of card volume and outstanding cards. Scenario impact under BIN-sponsor exit or fraud-rate program escalation at the BIN-sponsor level. Debit-vs-credit BIN separation. Network-by-network coverage (Visa-only, Mastercard-only, dual-network).

The three axes fail differently. The assessment must keep them separate. Cross-link to `third-party-operational-resilience/concentration-risk-review` (with the payments-fintech overlay) for the portfolio-level analysis; raise the flag here, do the analysis there.

## §1033 status note

Repeat in any artifact that touches §1033. The CFPB Personal Financial Data Rights Final Rule under §1033 of the Dodd-Frank Act was finalised October 22, 2024 (verify Federal Register publication date and exact citation). The docket has been active; tier dates and any compliance-date relief may have shifted (verify current docket status, any litigation, any congressional review, and the firm's tier on the analysis date). Where the program operator is a data provider under the rule, the assessment carries §1033 obligations in the cross-cutting reporting and conduct rows. Where the program operator is a data recipient, the assessment cross-links to `open-banking-data-controls`.

## MSB-vs-not is configuration-specific

A common failure mode: drafting the assessment with a categorical "this firm is / is not an MSB" assertion. The right answer is fact-pattern-specific against the FinCEN administrative-ruling library (https://www.fincen.gov/resources/administrative-rulings) and the state-by-state MTL footprint via NMLS. The assessment captures the configuration as fact, the determination as a legal question that sits with counsel, and the operative posture (registration on file, written AML program, CIP applicability, SAR-filing chain) as evidence.

## Faster-payments shift in the playbook

FedNow and RTP change the recovery mechanic. There is no chargeback. Settlement is final on receipt. Recovery is request-for-return-of-funds plus monitoring escalation. The fraud playbook must reflect this; the matrix rows for FedNow and RTP cannot reuse the card-rail recovery template. The cross-cutting fraud row notes the typology shift (irrevocability shifts the fraud-loss curve forward; mule patterns on instant-funded inbound are heightened).

## CFPB direct supervision and the larger-participant rule

Where the CFPB final rule defining larger participants of digital consumer payment applications (December 2024 — verify Federal Register citation and current state) designates the firm, the assessment carries a CFPB direct-supervision row in the geography matrix and a CFPB EXAMS-equivalent posture line in the recommended remediation portfolio. Cross-link to `regulatory-change-management/exam-brief` (with the payments-fintech overlay) for the three-track exam-prep posture (sponsor-bank-led, CFPB-direct, state-MTL).

## Audience notes

- **Sponsor-bank operating committee and TPRM.** Expect rail-by-rail KRI alignment with the sponsor bank's own monitoring, FBO subledger reconciliation evidence, and the controls inventory cross-link to `fintech-partner-controls`.
- **State MTL examiner via NMLS.** Lead with the state geography row; the rail and segment matrices support. Confirm current MTL status, MTMA adoption posture, and any open state findings.
- **CFPB EXAMS where the larger-participant rule designates the firm.** Lead with the segment matrix and the cross-cutting UDAAP and Reg E §1005.11 timing rows. The CFPB EXAMS posture is closer to a consumer-compliance examination than a prudential examination.
- **Internal audit and board risk committee.** Heat-map summaries with the matrix in an appendix; remediation portfolio leads.
