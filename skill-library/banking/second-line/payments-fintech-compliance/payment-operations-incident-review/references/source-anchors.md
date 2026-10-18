# Source anchors — payment-operations-incident-review

Named, dated regulatory sources this skill anchors to. SKILL.md cites this file by path and does not restate excerpts in narrative. Sector flavour for payments-fintech sits in `sector-overlays/payments-fintech.md`; cross-cutting flavour sits in `cross-cutting/<topic>.md`.

NACHA Operating Rules and the card-network rulebooks (Visa Core Rules, Visa Product and Service Rules, Mastercard Rules) are paywalled. Citations to those sources are conceptual; the disclaimer "current edition; specific sections to be confirmed against the firm's licensed copy" applies wherever they appear in an artifact produced by this skill.

## Consumer-EFT error-resolution and liability frame

- **Reg E — Electronic Fund Transfers Act and Regulation E, 12 CFR Part 1005**.
  - **§1005.11** procedures for resolving errors. The 10-business-day investigation window for ordinary errors; the 45-calendar-day extended investigation window with provisional credit if the financial institution is unable to complete the investigation in 10 business days; the 90-calendar-day extended window for new accounts, point-of-sale-debit-card transactions, and foreign-initiated transfers; written-notification timing requirements; recordkeeping for two years. The clock runs from the consumer's notice of error, not from incident detection or from confirmed customer impact. https://www.ecfr.gov/current/title-12/chapter-X/part-1005/section-1005.11 .
  - **§1005.6** consumer liability for unauthorised electronic fund transfers. The two-business-day liability tier (up to $50) and the 60-calendar-day tier (up to $500) and the after-60-day tier (unlimited liability for transfers occurring after the 60-day period). https://www.ecfr.gov/current/title-12/chapter-X/part-1005/section-1005.6 .
  - **§1005.18** Subpart A applicability to prepaid accounts; prepaid-account error-resolution overlays. https://www.ecfr.gov/current/title-12/chapter-X/part-1005/section-1005.18 .
  - **§1005.31** remittance transfer rule subpart B, pre-payment and post-payment disclosures and error-resolution mechanics for remittance transfers [verify exact subpart B section structure on the analysis date]. https://www.ecfr.gov/current/title-12/chapter-X/part-1005 .

## Payments-rail rules and operating procedures

- **NACHA Operating Rules (current edition) — paywalled**.
  - Article Two ODFI / RDFI obligations [verify article numbering against the firm's licensed copy].
  - Return-reason codes and return timeframes — R01 (insufficient funds) through the R85 family; the unauthorised-return codes (R10, R11, R29, R51) drive the unauthorised-return-rate measurement [verify current code list and timeframes against the firm's licensed copy of the current edition].
  - Reversal mechanics — Originator-initiated reversals, with a five-banking-day window and reasons-permitted constraints [verify exact rule citation, the five-banking-day window, and the most recent amendments].
  - ODFI return-rate thresholds — administrative-return rate, overall-return rate, unauthorised-return rate; ODFI obligations on threshold breach including reduction plans and risk-management framework reporting [verify current thresholds and effective dates].
  - Same Day ACH — settlement windows; per-transaction dollar limit ($1 million as of the March 18, 2022 increase, with periodic NACHA review) [verify current limit and any further amendment].
  - WEB Debit account-validation rule effective March 19, 2021 — Originator obligation to use a commercially reasonable fraudulent-transaction-detection system, which includes account validation [verify exact rule text and the implementation FAQ].
  - Third-Party Sender registration and risk-management rules [verify rule citations and the most recent amendments].
  - https://www.nacha.org/ . Disclaimer: current edition; specific sections to be confirmed against the firm's licensed copy.

- **Federal Reserve Operating Circular 4 — Automated Clearing House Items** [verify current edition number]. Federal Reserve operating terms for ACH items processed through the FedACH service. https://www.frbservices.org/resources/rules-regulations/operating-circulars.html .

- **FedNow Service Operating Procedures (current)** [verify version date and section reference]. Settlement-finality irrevocability (a credit is final on receipt; recovery is request-for-return-of-funds, not chargeback); request-for-return-of-funds mechanic and timing; ISO 20022 message-field handling (creditor account, end-to-end ID, structured remittance information); participant operating hours (24/7/365 for FedNow); fraud-hold posture options; intraday liquidity-management posture. https://www.frbservices.org/financial-services/fednow .

- **The Clearing House Real Time Payments (RTP) Operating Rules (current)** [verify version date and section reference]. Settlement-finality irrevocability; request-for-return-of-funds mechanic; ISO 20022 message-field handling; participant obligations. https://www.theclearinghouse.org/payment-systems/rtp .

- **Federal Reserve Operating Circular 6 — Funds Transfers Through the Fedwire Funds Service** [verify current edition number and section]. Fedwire funds-transfer terms; finality on credit. https://www.frbservices.org/resources/rules-regulations/operating-circulars.html .

- **CHIPS Rules and Administrative Procedures (current)** [verify version date and section]. CHIPS funds-transfer rules. https://www.theclearinghouse.org/payment-systems/chips .

- **Card-network rules — paywalled, conceptual only**. **Visa Core Rules and Visa Product and Service Rules (current edition)**. **Mastercard Rules (current edition)**. Chargeback rights and processing windows by dispute-reason code; fraud-rate program and chargeback-rate program escalation thresholds at the merchant or BIN-program level (Visa Fraud Monitoring Program, Visa Dispute Monitoring Program, Mastercard Excessive Fraud Merchant Compliance Program, Mastercard Excessive Chargeback Merchant Compliance Program — verify current program names and thresholds against the firm's licensed copy); BIN-sponsor accountability for issuer-level controls; merchant-monitoring program reporting. https://usa.visa.com/support/consumer/visa-rules.html ; https://www.mastercard.us/en-us/business/overview/support/rules.html . Disclaimer: current edition; specific sections to be confirmed against the firm's licensed copy.

- **ISO 20022 messaging — payments** [verify section]. Conceptual reference; payment-incident triage often turns on which message field carried the bad value (creditor account, end-to-end ID, structured remittance information). https://www.iso20022.org/ .

## Sponsor-bank notification frame

- **Interagency Guidance on Third-Party Relationships: Risk Management** (OCC Bulletin 2023-17 / FRB SR 23-4 / FDIC FIL-29-2023, June 6, 2023) [verify exact section structure across the released bulletin]. Risk-based lifecycle: planning, due diligence and third-party selection, contract negotiation, ongoing monitoring, termination. The notification expectations on the program operator flow through the program agreement; the guidance is the regulator-facing lens applied to the bank, and the bank cascades it into the program-agreement clauses applied to the program operator. https://www.occ.gov/news-issuances/news-releases/2023/nr-ia-2023-53.html ; https://www.federalreserve.gov/newsevents/pressreleases/bcreg20230606a.htm ; https://www.fdic.gov/news/press-releases/2023/pr23047.html .

- **Joint Statement on Banks' Arrangements with Third Parties to Deliver Bank Deposit Products and Services** (FDIC / OCC / FRB, July 25, 2024) [verify exact title and date — this is the operative statement, not the 2023 RFI]. Sponsor-bank end-customer reconciliation expectation; FBO subledger posture; deposit-insurance representation review; customer-facing FDIC framing review; operational-resilience expectations on the program operator. The post-incident customer-impact reconciliation expectation flows from this statement. https://www.fdic.gov/news/financial-institution-letters/2024/ [verify exact FIL number].

- **Federal banking agencies' Computer-Security Incident Notification Rule** (12 CFR Part 53 for OCC, 12 CFR Part 225 Subpart N for FRB, 12 CFR Part 304 Subpart E for FDIC, effective May 1, 2022) [verify exact section structure]. Sponsor-bank obligation to notify its primary federal regulator within 36 hours of determining that a notification incident has occurred. The program operator's incident-detection and notification posture must time against this 36-hour clock; the sponsor bank cannot meet its 36-hour clock if the program operator does not deliver the determination in time. https://www.federalregister.gov/documents/2021/11/23/2021-25510/computer-security-incident-notification-requirements-for-banking-organizations-and-their-bank .

## State licensing and money-transmitter frame

- **FinCEN MSB rules, 31 CFR Part 1022**. Subpart A definitions and registration (§1022.380 registration requirements; the categorical determination of MSB status is fact-specific against the FinCEN administrative-ruling library and is not a matter the artifact should assert categorically). Subpart B program rules (§1022.210 written AML program). Subpart C reporting (§1022.320 SAR filing duties; threshold $2,000 generally and $5,000 with information about a possible insider [verify current thresholds]). https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1022 .

- **FinCEN MSB registration**, 31 CFR §1022.380. Initial registration within 180 days of becoming an MSB; renewal every two years. https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1022/subpart-D/section-1022.380 .

- **Money Transmitter Modernization Act (MTMA) — Conference of State Bank Supervisors (CSBS) model law** [verify section and state-by-state adoption status on the analysis date]. Many state money-transmitter regimes require notification of material operational incidents to the state regulator, often through NMLS. Notification thresholds, content, and timing vary state-by-state; verify per state in the geographic footprint. https://www.csbs.org/mtma .

- **NMLS — Nationwide Multistate Licensing System** [verify section]. Money transmitter and MSB licensing system of record and the customary channel for state-track operational-incident notifications. https://nationwidelicensingsystem.org/ .

- **State examples (incomplete — verify state-by-state for the engagement footprint):**
  - **NY DFS BitLicense, 23 NYCRR Part 200** [verify section]. Virtual currency business activity licence; carries its own incident-notification posture for VC-related events. https://www.dfs.ny.gov/industry_guidance/virtual_currency_businesses .
  - **CA Money Transmission Act, Cal. Fin. Code §2000 et seq.**, administered by the CA DFPI [verify operational-incident notification triggers under CA DFPI rules]. https://dfpi.ca.gov/money-transmitters/ .
  - **CA Consumer Financial Protection Law (CCFPL), Cal. Fin. Code §90000 et seq.**, expanding CA DFPI authority over consumer financial products and services. https://dfpi.ca.gov/california-consumer-financial-protection-law/ .

## CFPB direct supervision and supervisory signal

- **CFPB larger-participant rule for general-use digital consumer payment applications** — finalised November 21, 2024; nullified by Public Law 119-11 (CRA resolution of disapproval) effective May 9, 2025. Not in force. Direct CFPB supervision of payment-app firms does not flow from this rule; consumer-protection reach now runs through general CFPB supervisory authority over service providers and through enforcement.

- **CFPB Personal Financial Data Rights Final Rule under §1033 of the Dodd-Frank Act** (October 22, 2024). **§1033 compliance dates stayed as of October 29, 2025 (Forcht Bank, N.A. v. CFPB); CFPB-initiated reconsideration with ANPR (August 22, 2025).** Where the incident touched authorisation flows, developer-interface tokens, or data-recipient feeds, the §1033 status note carries through. Cross-link to `open-banking-data-controls`. https://www.consumerfinance.gov/rules-policy/final-rules/required-rulemaking-on-personal-financial-data-rights/ .

- **CFPB Supervisory Highlights (current cycles)** [verify which issues are current as of the analysis date]. Recurring fintech-incident themes: §1005.11 dispute-timing failures, account closure / hold UDAAP, fee disclosure, FDIC misrepresentation, P2P scam-recovery posture. https://www.consumerfinance.gov/data-research/research-reports/supervisory-highlights/ .

- **CFPB Circular series** [verify section and which circulars are current and which numbers / dates apply on the analysis date]. https://www.consumerfinance.gov/compliance/circulars/ .

- **CFPB enforcement actions and consent orders, 2023-26** [verify section and which actions are current and finalised on the analysis date]. Use only public defendants in finalised actions for fact-pattern citation. The 2023-24 sponsor-bank consent-order wave establishes the operational-incident-and-reconciliation pattern that several of these actions turn on. https://www.consumerfinance.gov/enforcement/actions/ .

## FDIC misrepresentation and conduct frame

- **FDIC Part 328 final rule (December 2023) with effective-date extensions through 2024-2025** — verify current effective date for the engagement. **12 CFR Part 328 Subpart B** standards for non-bank entities holding out deposit insurance. Where a customer-impact pattern intersects FDIC-pass-through framing on fintech surfaces, the rule frames the customer-facing-posture review. https://www.ecfr.gov/current/title-12/chapter-III/subchapter-B/part-328/subpart-B .

## Cyber-leg cross-anchors (cross-cutting overlay carries the detail)

- **NYDFS 23 NYCRR Part 500** including **§500.17(a)** cybersecurity-event notification clock (72 hours from determination that a cybersecurity event has occurred). Applies to firms that are NYDFS Covered Entities; many fintechs are by virtue of NY footprint. https://www.dfs.ny.gov/industry_guidance/cybersecurity .

- **SEC cybersecurity disclosure** — Item 1.05 of Form 8-K and Reg S-K Item 106 (final rule Release 33-11216 / 34-97989, effective 2023; SRC phase-in to June 15, 2024) [verify exact compliance dates by registrant size]. Where the program operator or its sponsor bank is a public registrant, the cyber leg has public-disclosure reach; cross-link to `risk-reporting/cyber-disclosure-readiness`. https://www.sec.gov/files/rules/final/2023/33-11216.pdf .

- **State breach-notification statutes** — state-by-state; verify per state in the geographic footprint. Each carries its own notification trigger (acquisition standard vs access standard), timing (often 30 days, varies), and AG-notification thresholds.

## Privacy cross-anchors (cross-cutting overlay carries the detail)

- **GLBA Safeguards Rule, 16 CFR Part 314** as amended (FTC, December 2021 amendments effective 2023). **§314.4(h)** incident-response posture; **§314.4(f)** service-provider obligations. https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-314 .

- **GLBA Privacy Rule / Reg P, 12 CFR Part 1016**. Consumer-information privacy notice; sharing limits. https://www.ecfr.gov/current/title-12/chapter-X/part-1016 .

## Plugin-level shared references

Also consult, when present in the plugin:

- `references/source-map.md` — plugin-wide named-source map for payments-fintech.
- `references/policy-control-library.md` — plugin-wide control library for cross-skill payments-fintech controls.
- `references/public-regulatory-scenarios.md` — canonical scenario library reused across the four sector skills.

## Firm overlays

A firm using this skill in production adds firm-specific detail in `references/firm-overlay.md` — the firm's program-agreement clause-set with the named sponsor bank, the named runbooks for incident-management, the named human-review gates, and the firm's NMLS-state list with the state-by-state operational-incident notification triggers. The skill consumes that file when present. Firm overlays do not modify the public anchors above.
