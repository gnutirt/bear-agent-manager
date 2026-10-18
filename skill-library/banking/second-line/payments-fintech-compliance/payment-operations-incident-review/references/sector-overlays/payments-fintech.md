# Sector overlay — payments-fintech

This skill sits in the payments-fintech sector flagship. The overlay is not "extra payments flavour layered on a generic primitive"; it is the workflow itself. This file carries the rail-by-rail notification mechanics, the sponsor-bank notification chain, the faster-payments recovery mechanics, and the named-rail authority reporting lines that the named sections must reflect.

The overlay is required-on for every engagement run through this skill. SKILL.md does not gate on it.

## Rail-by-rail notification and recovery mechanics

Drop these into the **regulatory notification triggers** sub-sections and the **affected transaction population** rail rows. The rail set in scope sets which sub-sections fire; multi-rail incidents need each fired sub-section.

**ACH (originated; received separately).** Named consumer-EFT clocks under the consumer-EFT rule run from the consumer's notice. NACHA mechanics: return-reason-code coverage by code (R01 family insufficient funds, R10 / R11 / R29 / R51 unauthorised, R02 / R03 / R04 administrative, R14 / R15 deceased / beneficiary; verify code list against the firm's licensed copy of the current edition); reversal mechanic — Originator-initiated reversal carries the five-banking-day window and reasons-permitted constraints (verify exact rule); ODFI return-rate monitoring against current administrative, overall, and unauthorised thresholds (verify current thresholds and effective dates against the firm's licensed copy); risk-management-framework reporting on threshold breach. NOC handling: Notification of Change records and the Originator's response window. Same Day ACH: settlement windows and per-transaction dollar limit (verify current limit against the firm's licensed copy and the effective date of the most recent increase). WEB Debit: account-validation rule effective March 19, 2021 — the artifact records the validation posture for the affected origination and any failure mode.

**Wire (Fedwire / CHIPS).** Settlement is final at the credit. Recovery is a goodwill mechanic (return-of-funds request to the receiving bank; not a right). Sanctions-screening latency is a frequent sub-trigger on outbound wires. BEC misdirected-wire patterns are recorded against the firm's outbound-wire authentication and call-back posture. Operating-hours coverage of Fedwire and CHIPS sets the recovery window.

**Card debit.** Chargeback-window posture per dispute-reason code (timing windows vary by code and by network; verify against the firm's licensed copy of the current edition of Visa Core Rules / Visa Product and Service Rules / Mastercard Rules). Fraud-rate program and chargeback-rate program escalation thresholds at the merchant or BIN-program level (Visa Fraud Monitoring Program, Visa Dispute Monitoring Program, Mastercard Excessive Fraud Merchant Compliance Program, Mastercard Excessive Chargeback Merchant Compliance Program — verify current program names and thresholds). Reg E §1005.6 unauthorised-transfer-liability allocation between issuer / cardholder applies for consumer-account transactions. Reg E §1005.11 dispute-timing applies. Network operational-incident reporting where the incident touched a network monitoring program threshold. BIN-sponsor reporting chain: the program operator reports to the BIN sponsor under the BIN-sponsorship agreement; the BIN sponsor reports to the network.

**Card credit (where in scope).** As card debit plus Reg Z disclosure failures and CARD Act timing windows where applicable [verify the specific Reg Z subpart that applies to the product structure].

**FedNow.** Settlement-finality irrevocability — a credit is final on receipt; the recovery mechanic is request-for-return-of-funds plus monitoring escalation, not chargeback. The artifact records the request-for-return-of-funds posture (initiated, acknowledged, returned, denied), the timing of the request relative to the original credit, and the receiving-institution response. ISO 20022 message-field handling: the artifact identifies which field carried the bad value (creditor account, end-to-end ID, structured remittance information). Operating-hours coverage is 24/7/365; the artifact records the staffing posture during the incident window. Liquidity-management posture: intraday liquidity at the participant; FedNow does not extend intraday credit. Operational-incident reporting under FedNow Service Operating Procedures (verify version and section).

**RTP.** As FedNow plus participant-rule-specific obligations under The Clearing House RTP Operating Rules (current edition; verify version date). Operational-incident reporting under the RTP scheme rules (verify version and section).

**P2P (Zelle, Venmo-style, Cash App-style).** Reg E §1005.6 unauthorised-transfer-liability breach is the high-frequency examiner-finding lane (CFPB Supervisory Highlights and the 2023-26 P2P-themed actions; verify current actions). Reg E §1005.11 dispute-timing applies. Authorised-fraud (scam) recovery posture: network-rule mechanics where the underlying scheme has them, non-binding industry frameworks where it does not. The artifact distinguishes unauthorised from authorised-but-induced; the consumer-EFT clocks run only on the unauthorised side.

**Check.** Reg CC hold-period failures. Forged-check / altered-check liability mechanics under UCC Article 3 / Article 4. Positive-pay file failures.

**Cross-border correspondent.** OFAC-screening latency on outbound and inbound. Correspondent-bank de-risking patterns. FX-disclosure timing under Reg E §1005.31 subpart B for consumer remittance transfers (verify exact subpart structure on the analysis date). Sanctioned-jurisdiction proximity. SWIFT MT / ISO 20022 message-field handling. Travel Rule applicability under 31 CFR §1010.410(f) at threshold (verify current threshold and the FinCEN proposed-rule status). Receiving-side host-country obligations apply; the artifact records the corridor-specific incident posture.

**Virtual-currency on-ramp / off-ramp.** Travel Rule applicability at threshold. NYDFS BitLicense incident-notification posture under 23 NYCRR Part 200 where NY persons are touched (verify section). State-by-state money transmitter applicability and incident-notification posture where MTMA adoption status varies (verify state-by-state on the analysis date). Chain-analytics vendor coverage and counterparty-screening posture.

## Sponsor-bank notification chain

The sponsor-bank notification clause-set is the row that runs first in most incidents. The contractual clock is typically tighter than any named-rail or regulator clock (often 24 hours or less; some clauses run shorter for faster-payments incidents). The clock-start basis matters: detection-based, control-event-based, and customer-impact-based clocks behave differently. The artifact records the basis named in the program agreement; mis-stating the basis is a frequent finding.

Anchored to:

- **Interagency Guidance on Third-Party Relationships** (June 6, 2023) — the bank's principal-side oversight expectation, which the bank cascades into the program-agreement notification clause-set applied to the program operator. Subcontractor / fourth-party expectations under risk-based application apply (the processor, BIN sponsor, ledger provider, KYC vendor, fraud-decision vendor are the usual fourth-party pyramid); a subcontractor-side incident still flows to the sponsor bank under the program operator's notification clause.
- **Joint Statement on Banks' Arrangements with Third Parties to Deliver Bank Deposit Products and Services** (July 25, 2024 — verify exact date). End-customer reconciliation expectation; FBO subledger reconciliation cadence and break-resolution; deposit-insurance representation review on any incident touching customer-facing FDIC framing; operational-resilience expectations on the program operator. The 2023 RFI is not the binding statement.
- **Federal banking agencies' Computer-Security Incident Notification Rule** (12 CFR Parts 53 / 225 / 304, effective May 1, 2022). The sponsor bank's 36-hour clock cascades into the program operator's contractual clock for any incident with a cyber leg; the cross-cutting cyber overlay carries the detail.

The artifact's **sponsor-bank reporting** block records what was sent, when, by whom, against which program-agreement clause, channel, and current status. A second row records what is still owed (post-incident review report, remediation tracker update, next operating-committee read-out, FBO subledger reconciliation closure).

## Network and scheme reporting

Where the rail set requires it, the **network or scheme reporting** block fires:

- **NACHA Risk Management Framework** — reporting on threshold breach and on framework-scope incidents (verify current framework rule set against the firm's licensed copy).
- **Card-network monitoring program reporting** — where the incident touched the program threshold, the BIN sponsor reports to the network; the program operator's reporting is to the BIN sponsor under the BIN-sponsorship agreement.
- **FedNow Service Operating Procedures** — operational-incident reporting per the procedures (verify version and section).
- **The Clearing House RTP Operating Rules** — operational-incident reporting per the rules (verify version and section).

Most incidents do not trigger every line. The block records what does and what does not, with the basis.

## Faster-payments shift in the playbook

FedNow and RTP change the recovery mechanic. Settlement is final on receipt; there is no chargeback. Recovery is request-for-return-of-funds plus monitoring escalation. The fraud playbook reflects this shift: the fraud-loss curve moves forward, mule patterns on instant-funded inbound are heightened, and the 24/7/365 staffing posture is operative not optional. Reusing the card-rail recovery template for FedNow or RTP rows is the most-frequent rebuild cause for these incidents.

## Customer-impact reconciliation

The Joint Statement on Bank-Fintech Arrangements (July 2024) sets the customer-impact reconciliation expectation against the FBO subledger. The artifact's **customer impact** block records:

- The full-population reconciliation method (system-of-record vs sample vs complaint-driven).
- The reconciliation cadence (real-time during the incident, post-incident, end-of-day).
- The break-resolution log (what reconciled, what did not, what the disposition was).
- The FBO subledger posture during the incident (held the truth, lagged the truth, broke against the truth).

A customer-impact population stated without a reconciliation method is an assertion, not a finding.

## CFPB direct supervision and the larger-participant rule

Where the CFPB final rule defining larger participants of digital consumer payment applications (December 2024 — verify Federal Register citation and current state) designates the firm, the regulator-facing posture is direct CFPB EXAMS rather than sponsor-bank-mediated. The artifact's **regulator-facing posture** block carries a direct-CFPB row for designated firms; the artifact list includes any CFPB EXAMS data-request response file, any CFPB Civil Investigative Demand response posture, and any CFPB Consumer Complaint Database triangulation.

Cross-link to `regulatory-change-management/exam-brief` (with the payments-fintech overlay) for the three-track exam-prep posture (sponsor-bank-led, CFPB-direct, state-MTL).

## §1033 status note

Repeat in any artifact where the incident touched authorisation flows, developer-interface tokens, or data-recipient feeds. The CFPB Personal Financial Data Rights Final Rule under §1033 of the Dodd-Frank Act was finalised October 22, 2024 (verify Federal Register publication date and exact citation). The docket has been active; tier dates and any compliance-date relief may have shifted (verify current docket status and the firm's tier on the analysis date). Cross-link to `open-banking-data-controls`.

## MSB / MTL configuration is fact-pattern-specific

A common failure mode: drafting the artifact with a categorical "the firm is / is not an MSB" assertion. The right answer is fact-pattern-specific against the FinCEN administrative-ruling library (https://www.fincen.gov/resources/administrative-rulings) and the state-by-state MTL footprint via NMLS. The artifact captures the configuration as fact, the determination as a legal question that sits with counsel, and the operative posture (registration on file, written AML program, CIP applicability, SAR-filing chain, state-by-state operational-incident notification triggers) as evidence.

## Audience notes

- **Sponsor-bank operating committee and TPRM.** Lead with the **incident summary**, the **affected transaction population** by rail, the **sponsor-bank reporting** block, and the **lessons learned** block tied back to the controls inventory in `fintech-partner-controls`. The chronology and the named-rail triggers blocks support.
- **State-MTL examiner via NMLS.** Lead with the state-track row of the **regulatory notification triggers** block, the **customer impact** block (with state geographic breakdown), and the **regulator-facing posture** block. The rail rows support.
- **CFPB EXAMS where the larger-participant rule designates the firm.** Lead with the **customer impact** block, the **customer-facing posture** block, and the consumer-EFT row of the **regulatory notification triggers** block. The chronology and the named-rail triggers blocks support.
- **Internal audit and board risk committee.** Lead with the **incident summary**, the **root cause** block, the **lessons learned** block, and the **recommended disposition**. The rest goes in the appendix.
