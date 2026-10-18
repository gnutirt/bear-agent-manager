# Sector overlay — payments-fintech

This skill is the payments-fintech sector flagship for the fintech-side controls evidence pack. The overlay is not "extra payments flavour layered on a generic primitive"; it is the workflow itself. This file carries the rail-by-rail control families, the sponsor-bank construct, the FBO mechanics, the §1033 status note discipline, and the MSB-vs-not discipline that the inventory rows must reflect.

The overlay is required-on for every engagement run through this skill. SKILL.md does not gate on it.

## Rail-by-rail control families (inventory rows, not generic controls)

The control inventory holds one row per control. The menu below is the source for the rail-specific failure-mode-and-control rows that appear in every pack. The actual rows for any program depend on rails in scope, prior-cycle KRI history, and findings from the prior sponsor-bank review.

**ACH (originated; received separately).** Third-Party Sender registration current; Originator agreements on file; ODFI sub-agreement with the sponsor bank on file. Originator-level return-rate monitoring against the current administrative-return-rate, overall-return-rate, and unauthorised-return-rate thresholds (paywalled — current edition; specific sections to be confirmed against the firm's licensed copy of NACHA Operating Rules). WEB Debit account-validation rule effective March 19, 2021 — Originator obligation to use a commercially reasonable fraudulent-transaction-detection system that includes account validation. Same Day ACH window-cutover and per-transaction dollar-limit controls (verify current limit). NOC handling SLA. Settlement reconciliation against the sponsor bank's ACH operations report.

**Same Day ACH (subset).** As above plus Same Day window funding controls at the ODFI; per-transaction dollar-limit breach detection.

**Wire (Fedwire / CHIPS).** Sanctions-screening on outbound wires under the OFAC framework; misdirected-wire fraud controls (BEC patterns); recovery posture (a Fedwire credit is final at the Federal Reserve; recovery is goodwill, not a right); operating-hours coverage. The fintech-side reading: most program operators do not originate wires directly; the controls evidence the operator's wire-instruction handoff to the sponsor bank and the reconciliation of returned / refused wires.

**Card debit.** Chargeback intake and timing windows under network rules (Visa / Mastercard, paywalled — current edition; specific sections to be confirmed against the firm's licensed copy). Fraud-rate program escalation under the network monitoring program (Visa Fraud Monitoring Program, Visa Dispute Monitoring Program; Mastercard Excessive Fraud Merchant Compliance Program, Excessive Chargeback Merchant Compliance Program — verify current program names and thresholds). Reg II §235.7 routing posture. EMV liability-shift posture. BIN-sponsor coordination evidence (issuer-level controls, fraud-rate reporting). Reg E §1005.6 unauthorised-transfer liability allocation between fintech and bank. Reg E §1005.11 dispute-timing on debit-card disputes.

**Card credit (where in scope).** As above plus Reg Z disclosure stack; CARD Act compliance posture (where applicable).

**FedNow.** Settlement-finality irrevocability — no chargeback; recovery is request-for-return-of-funds. Fraud-hold parameter ownership and override authority (the parameters cannot sit with the processor without fintech sign-off; the program agreement should name the controlling party). ISO 20022 message-field handling and anomaly detection (suspicious creditor account, suspicious end-to-end ID). Operating-hours coverage and 24/7/365 staffing posture. Intraday liquidity controls. Customer-dispute pathway: Reg E §1005.11 applies but the rail's irrevocability shifts mechanics — a dispute pathway that defaults the customer to the ACH path is a finding.

**RTP.** As FedNow plus participant-rule-specific obligations under The Clearing House RTP Operating Rules (current edition; verify version date).

**P2P (Zelle, Venmo-style, Cash App-style).** Reg E §1005.6 unauthorised-transfer liability and §1005.11 dispute-timing — the CFPB's Supervisory Highlights and the 2023-26 Zelle-themed actions establish that this is a high-frequency examiner-finding lane. Authorised-fraud (scam) recovery posture (network-rule mechanics; non-binding industry frameworks). Account-takeover (ATO) controls.

**Check.** Hold-period controls under Reg CC. Forged-check / altered-check liability posture. Positive-pay file controls (where applicable).

**Cross-border correspondent.** OFAC-screening on outbound and inbound legs. Correspondent-bank de-risking response posture. FX-disclosure timing under Reg E §1005.31 subpart B. SWIFT MT / ISO 20022 message-field handling. Travel Rule under 31 CFR §1010.410(f) at threshold (verify current threshold).

**Virtual-currency on-ramp / off-ramp.** Travel Rule applicability at threshold (verify current threshold and the FinCEN proposed-rule status). FinCEN CVC guidance (FIN-2013-G001 and FIN-2019-G001; verify currency). VASP counterparty screening. Chain-analytics vendor coverage. NYDFS BitLicense applicability under 23 NYCRR Part 200 where the program touches NY persons. State-by-state money transmitter applicability via NMLS.

## Customer-protection control families

Read into the customer-protection section. The CFPB and prudential-supervisory examiner findings concentrate here; this is non-negotiable depth in any pack.

**Reg E §1005.11 error-resolution timing.** The 10 / 45 / 90-day clocks. Evidence: dispute-management system extracts; aging report by stage; provisional-credit issuance log; written-notification log; §1005.11 timing-breach rate as a KRI to the sponsor bank. The intake-reconciliation between fintech and bank (who receives the claim, who triages, who notifies, who issues provisional credit) is the operative test; the program agreement nearly always pushes operational ownership to the fintech.

**Reg E §1005.6 unauthorised-transfer liability allocation.** The program-agreement clause naming the allocation; the operator's claims-handling procedure; the fraud-loss apportionment evidence with the sponsor bank.

**Reg DD disclosure stack** where the surface presents a deposit-like product. §1030.4 account disclosures; §1030.5 change-in-terms; §1030.6 periodic-statement disclosures; §1030.7 APY calculation; §1030.8 advertising. Evidence is the rendered surface (web, mobile app, statement, marketing email) read against the rule.

**FDIC representation.** 12 CFR Part 328 Subpart B. Every "FDIC-insured" framing on any fintech surface re-papered to the pass-through caveats. Marketing-claim review log. Post-2024 examiner findings concentrate here.

**Account-closure and account-hold procedures.** Notice timing and content; customer-recourse channel; complaint-routing-to-sponsor-bank loop; account-closure root-cause review; hold-release SLA; redress posture for wrongful holds. The most-frequent fintech UDAAP theme per CFPB Supervisory Highlights.

**Fee-disclosure-vs-actual reconciliation.** Junk-fee and surprise-fee themes per current CFPB Circular series and Supervisory Highlights (verify current circular numbers). The control is the disclosure-vs-charged-fee reconciliation; evidence is the periodic reconciliation log.

**Complaint intake and routing.** Complaint volume vs CFPB Consumer Complaint Database benchmark; sponsor-bank-routed complaint reconciliation; complaint root-cause review cadence.

**Remittance transfer disclosures.** Where the program operator is a remittance transfer provider, Reg E §1005.31 subpart B pre-payment and post-payment disclosure timing.

## FBO / customer-funds account mechanics

Post-2024 examiner findings concentrate here. The control families:

- **Subledger reconciliation cadence.** Daily is the floor; intraday is common. Cadence named, last-completed evidence on file.
- **Break-resolution SLA and aging report.** Open breaks aged past SLA are an examiner finding; the break-aging report is consumed by the sponsor bank's TPRM team.
- **Deposit-insurance pass-through requirements** per the OCC / FRB / FDIC Joint Statement on Banks' Arrangements with Third Parties to Deliver Bank Deposit Products and Services (July 25, 2024 — verify exact date and FIL number). Evidence: account-titling documentation; beneficial-owner records sufficient to support pass-through; the sponsor bank's confirmation of pass-through eligibility.
- **Customer-facing FDIC representation review.** 12 CFR Part 328 Subpart B (verify amendments and effective dates). Re-papered on any sponsor change. Evidence: marketing-claim review log, current-state surface review.
- **Escheatment posture by state.** Last-completed escheatment cycle, by state.
- **Operational-resilience evidence.** Sponsor-bank cutover capability for the FBO architecture; in-flight-clock preservation under any transition.

The 2023 RFI on bank-fintech arrangements is not the binding statement. The pack must cite the July 2024 joint statement, not the RFI.

## Program-agreement control map

The clauses below typically appear in a sponsor-bank program agreement. The control map reads each clause against current operating reality.

- **Oversight and audit rights.** The bank's right to audit the operator and the operator's subcontractors; cadence; scope; remediation tracking. Evidence: prior audit reports, prior-finding remediation log.
- **Change-control rights.** Sponsor-bank approval for new rail / new product / new vendor / new sub-sponsor / new geography. The control is the change-control intake log and the documented sponsor-bank approval before go-live. Frequent failure mode: a new ledger provider migrated without re-papering through the change-control clause.
- **Termination and exit.** Termination triggers; cure periods; transition-services-agreement scope; customer-transfer mechanics. Cross-link to `third-party-operational-resilience/exit-plan` (with the payments-fintech overlay) for the rail-by-rail wind-down playbook.
- **Indemnification.** Loss allocation between fintech and bank for regulatory penalties, customer harm, fraud loss, vendor-caused incidents.
- **Regulatory cooperation.** Examiner-access duties, document-production duties, supervisor-correspondence obligations.
- **Customer-data ownership.** During-relationship and post-termination data-handling, including §1033 implications where the operator is a covered data provider.
- **Sub-contractor and fourth-party flow-down.** The bank's right to cause the operator to flow program-agreement obligations through to subcontractors and the fourth-party register.
- **Insurance.** Cyber, fidelity, fraud-loss, errors-and-omissions; minimums set in the agreement; current evidence of coverage on file.
- **Dispute / complaint routing.** Operational ownership of intake and triage; sponsor-bank visibility into complaint volume and resolution.
- **FBO architecture.** Account-titling, beneficial-owner records, reconciliation cadence, deposit-insurance representation requirements.
- **Sponsor-bank reporting cadence.** Each report named with cadence and recipient.

For each clause, the control map carries: clause text reference; the operative expectation under the Interagency TPRM Guidance and the July 2024 joint statement; present / absent / partial; evidence of adherence; gap with severity, owner, target close date.

## Sponsor-bank reporting cadence

The pack names every load-bearing report the operator owes the sponsor bank.

- **Reg E §1005.11 timing data.** Most-load-bearing report. Cadence: weekly or monthly to the sponsor bank's consumer-compliance officer; aging-by-stage; breach-rate.
- **NACHA return-rate monitoring.** Monthly to the sponsor bank's ACH operations and the bank's risk function. Administrative, overall, unauthorised return rates against threshold.
- **FBO subledger reconciliation report.** Daily reconciliation summary plus exception aging.
- **Complaint volume and resolution.** Monthly. Includes CFPB Consumer Complaint Database triangulation.
- **Fraud-loss and dispute aging.** Monthly. By rail and by segment.
- **Sanctions-screening posture.** Monthly. Hit rate, aged-alert rate, OFAC list-update SLA.
- **SAR-filing posture.** Where the operator is an MSB filing directly, monthly SAR aging; where the operator routes through the sponsor bank, the routing log.
- **Cyber and incident posture.** Monthly. Rolls into the incident-history summary in the pack.
- **Vendor-stack health.** Quarterly. SOC 2 currency, contract-renewal pipeline, fourth-party register changes.

For each report: definition, source system, threshold (where set; otherwise `[evidence needed]`), owner role, cadence, recipient role at the sponsor bank, evidence of last delivery.

## §1033 status note

Repeat in any artifact that touches §1033. The CFPB Personal Financial Data Rights Final Rule under §1033 of the Dodd-Frank Act was finalised October 22, 2024 (verify Federal Register publication date and exact citation). The docket has been active; tier dates and any compliance-date relief may have shifted (verify current docket status, any litigation, any congressional review, and the firm's tier on the analysis date). Where the program operator is a data provider under the rule, the controls pack carries §1033 obligations in the customer-protection and reporting rows. Where the program operator is a data recipient, the cross-link is to `open-banking-data-controls`.

## MSB-vs-not is configuration-specific

A common failure mode: drafting the controls pack with a categorical "this firm is / is not an MSB" assertion. The right answer is fact-pattern-specific against the FinCEN administrative-ruling library (https://www.fincen.gov/resources/administrative-rulings) and the state-by-state MTL footprint via NMLS. The pack captures the configuration as fact, the determination as a legal question that sits with counsel, and the operative posture (registration on file, written AML program, CIP applicability, SAR-filing chain) as evidence.

## CFPB direct supervision

Where the December 2024 CFPB final rule on larger participants of digital consumer payment applications designates the firm (verify current state on the analysis date), direct CFPB supervision applies and the controls pack carries a CFPB direct-supervision posture row alongside the sponsor-bank-mediated posture. Cross-link to `regulatory-change-management/exam-brief` (with the payments-fintech overlay) for the three-track exam-prep posture (sponsor-bank-led, CFPB-direct, state-MTL).

## Audience notes

- **Sponsor-bank TPRM team.** The primary consumer. Expects the inventory in workbook form, the memo as second-line cover, and the self-evidence index as the bridge to artifacts. The bank's TPRM intake template typically maps to a subset of the inventory; the workbook carries the union and the bank pulls what it needs.
- **Sponsor-bank operating committee.** A management-level read-out that consumes the memo and the disposition recommendation. The inventory sits as appendix.
- **State-MTL examiner via NMLS.** Lead with the state geography row and the MTL / NMLS posture; the rail and segment inventory rows support. Confirm current MTL status, MTMA adoption posture, and any open state findings.
- **CFPB EXAMS where the larger-participant rule designates the firm.** Lead with the customer-protection row (Reg E §1005.11 timing, account-closure / hold, fee disclosure, FDIC representation). The CFPB EXAMS posture is closer to a consumer-compliance examination than a prudential examination.
- **Internal audit and ERC.** Heat-map summaries with the inventory in an appendix; remediation portfolio leads.
