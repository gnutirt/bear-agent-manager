# Source anchors — payments-risk-assessment

Named, dated regulatory sources this skill anchors to. SKILL.md cites this file by path and does not restate excerpts. Sector flavour for payments-fintech sits in `sector-overlays/payments-fintech.md`; cross-cutting flavour sits in `cross-cutting/<topic>.md`.

NACHA Operating Rules and the card-network rulebooks (Visa Core Rules, Visa Product and Service Rules, Mastercard Rules) are paywalled. Citations to those sources are conceptual; the disclaimer "current edition; specific sections to be confirmed against the firm's licensed copy" applies wherever they appear in an artifact.

## Primary frame — federal payments rules

- **Reg E — Electronic Fund Transfers Act and Regulation E, 12 CFR Part 1005**. §1005.6 consumer liability for unauthorised EFTs; §1005.11 procedures for resolving errors with the 10 / 45 / 90-day clocks (10 business days for provisional credit; up to 45 / 90 calendar days for full investigation depending on transaction type); §1005.18 Subpart A applicability to prepaid accounts; §1005.31 remittance transfer rule subpart B pre-payment and post-payment disclosures [verify exact subpart B section structure]. §1005.8(a) change-in-terms notice timing [verify]. https://www.ecfr.gov/current/title-12/chapter-X/part-1005 .

- **Reg DD — Truth in Savings Act and Regulation DD, 12 CFR Part 1030**. APY disclosure, periodic-statement disclosure, fee schedule for deposit-like accounts. https://www.ecfr.gov/current/title-12/chapter-X/part-1030 .

- **Reg II — Debit Card Interchange Fees and Routing, 12 CFR Part 235**. Interchange-fee standards for issuers above the small-issuer threshold; routing requirements for two unaffiliated networks per debit card. https://www.ecfr.gov/current/title-12/chapter-II/subchapter-A/part-235 .

- **Reg Z — Truth in Lending Act and Regulation Z, 12 CFR Part 1026**. Open-end credit (§1026 Subpart B), closed-end credit (§1026 Subpart C), credit-card rules (§1026 Subparts B and G), BNPL applicability question for closed-end vs open-end credit [verify per the current CFPB position on Pay-in-Four BNPL and any associated rulemaking or interpretive rule]. https://www.ecfr.gov/current/title-12/chapter-X/part-1026 .

## Payments-rail rules

- **NACHA Operating Rules (current edition) — paywalled**. Article Two ODFI / RDFI obligations [verify article numbering against the firm's licensed copy]. Return-rate thresholds (administrative-return-rate, overall-return-rate, unauthorised-return-rate) [verify current thresholds and effective dates]. Same Day ACH settlement windows and per-transaction dollar limit [verify current limit and the effective date of the most recent increase]. WEB Debit account-validation rule effective March 19, 2021 — Originator obligation to use a commercially reasonable fraudulent-transaction-detection system, which includes account validation [verify the exact rule text and the implementation FAQ]. Third-Party Sender registration and risk-management rules [verify rule citations and the most recent amendments]. https://www.nacha.org/ . Disclaimer: current edition; specific sections to be confirmed against the firm's licensed copy.

- **Federal Reserve Operating Circular 4 (Automated Clearing House Items)** [verify current edition number]. Federal Reserve operating terms for ACH items processed through the FedACH service. https://www.frbservices.org/resources/rules-regulations/operating-circulars.html .

- **FedNow Service Operating Procedures (current)** [verify version date and section]. Settlement-finality irrevocability; request-for-return-of-funds mechanic; ISO 20022 message-field handling; participant operating hours; fraud-hold posture. https://www.frbservices.org/financial-services/fednow .

- **The Clearing House Real Time Payments (RTP) Operating Rules (current)** [verify version date and section reference]. Settlement-finality irrevocability; request-for-return-of-funds mechanic; ISO 20022 message-field handling; participant obligations. https://www.theclearinghouse.org/payment-systems/rtp .

- **Federal Reserve Operating Circular 6 (Funds Transfers Through the Fedwire Funds Service)** [verify current edition number and section]. Fedwire funds-transfer terms. https://www.frbservices.org/resources/rules-regulations/operating-circulars.html .

- **CHIPS Rules and Administrative Procedures (current)** [verify version date and section]. CHIPS funds-transfer rules. https://www.theclearinghouse.org/payment-systems/chips .

- **Card-network rules — paywalled, conceptual only**. **Visa Core Rules and Visa Product and Service Rules (current edition)**. **Mastercard Rules (current edition)**. Chargeback rights and processing windows; fraud-rate program escalation thresholds (Visa Fraud Monitoring Program / Visa Dispute Monitoring Program; Mastercard Excessive Fraud Merchant Compliance Program / Excessive Chargeback Merchant Compliance Program) [verify current program names and thresholds against the firm's licensed copy]; BIN-sponsor accountability for issuer-level controls; merchant-monitoring program reporting. https://usa.visa.com/support/consumer/visa-rules.html ; https://www.mastercard.us/en-us/business/overview/support/rules.html . Disclaimer: current edition; specific sections to be confirmed against the firm's licensed copy.

## BSA / AML / sanctions

- **FFIEC BSA/AML Examination Manual (current edition)** [verify section and which chapters were last revised on the analysis date]. CDD chapter; SAR chapter; CIP chapter; MSB-specific chapter where applicable; correspondent-account chapter for foreign financial institutions; OFAC chapter. https://bsaaml.ffiec.gov/manual .

- **FinCEN Money Services Business rules, 31 CFR Part 1022**. Subpart A definitions and registration (§1022.380 registration requirements; the categorical determination of MSB status is fact-specific against the FinCEN administrative-ruling library and is not a matter the assessment should assert categorically). Subpart B program rules (§1022.210 written AML program). Subpart C reporting (§1022.320 SAR filing duties; SAR threshold $2,000 generally and $5,000 with information about a possible insider) [verify current thresholds]. Subpart D recordkeeping. https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1022 .

- **FinCEN MSB registration**, 31 CFR §1022.380. Initial registration within 180 days of becoming an MSB; renewal every two years. https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1022/subpart-D/section-1022.380 .

- **FinCEN Travel Rule**, 31 CFR §1010.410(f). Recordkeeping and information-passing on transmittals of funds at or above the threshold (currently $3,000 for non-bank financial institutions and banks per the 1995 joint rule) [verify current threshold and the status of the FinCEN proposed rule to lower the threshold]. https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1010/subpart-D/section-1010.410 .

- **FinCEN guidance on convertible virtual currency (CVC)** — FIN-2013-G001 (March 18, 2013) and FIN-2019-G001 (May 9, 2019) [verify section currency against any subsequent FinCEN releases]. https://www.fincen.gov/resources/statutes-regulations/guidance .

- **OFAC — 31 CFR Part 501 (Reporting, Procedures and Penalties Regulations)** including blocked-property reporting requirements. https://www.ecfr.gov/current/title-31/subtitle-B/chapter-V/part-501 .

- **OFAC — A Framework for OFAC Compliance Commitments (May 2, 2019)** [verify section]. Five components of a risk-based sanctions-compliance program: management commitment, risk assessment, internal controls, testing and auditing, training. https://ofac.treasury.gov/media/16331/download?inline .

- **OFAC SDN list and 50 Percent Rule guidance**. https://ofac.treasury.gov/sanctions-list-search-tool ; https://ofac.treasury.gov/recent-actions/20140813 [verify current 50 Percent Rule guidance link].

## Third-party / sponsor-bank frame

- **Interagency Guidance on Third-Party Relationships: Risk Management** (OCC Bulletin 2023-17 / FRB SR 23-4 / FDIC FIL-29-2023, June 6, 2023) [verify exact section structure across the released bulletin]. Risk-based lifecycle: planning, due diligence and third-party selection, contract negotiation, ongoing monitoring, termination. Subcontractor / fourth-party expectations under risk-based application. https://www.occ.gov/news-issuances/news-releases/2023/nr-ia-2023-53.html ; https://www.federalreserve.gov/newsevents/pressreleases/bcreg20230606a.htm ; https://www.fdic.gov/news/press-releases/2023/pr23047.html .

- **Joint Statement on Banks' Arrangements with Third Parties to Deliver Bank Deposit Products and Services** (FDIC / OCC / FRB, July 25, 2024) [verify exact title and date — this is the operative statement, not the 2023 RFI]. Sponsor-bank end-customer reconciliation; FBO subledger posture; deposit-insurance representation review; customer-facing FDIC framing; operational-resilience expectations on the program operator. https://www.fdic.gov/news/financial-institution-letters/2024/ [verify exact FIL number].

- **FDIC Part 328 final rule (December 2023) with effective-date extensions through 2024-2025** — verify current effective date for the engagement. **12 CFR Part 328 Subpart B** prohibits misrepresenting deposit insurance and provides standards for non-bank entities holding out deposit insurance. https://www.ecfr.gov/current/title-12/chapter-III/subchapter-B/part-328/subpart-B .

## CFPB direct supervision and enforcement

- **CFPB larger-participant rule for general-use digital consumer payment applications** — finalised November 21, 2024; nullified by Public Law 119-11 (CRA resolution of disapproval) effective May 9, 2025. Not in force. Direct CFPB supervision of payment-app firms does not flow from this rule; the assessment does not carry a CFPB direct-supervision row anchored to this rule.

- **CFPB Personal Financial Data Rights Final Rule under §1033 of the Dodd-Frank Act** (October 22, 2024). **§1033 compliance dates stayed as of October 29, 2025 (Forcht Bank, N.A. v. CFPB); CFPB-initiated reconsideration with ANPR (August 22, 2025).** Applies primarily to `open-banking-data-controls`; touches `payments-risk-assessment` where the program operator is a data provider, a data recipient, or both. Carry the §1033 status note in the artifact with the date-stamped current docket posture. https://www.consumerfinance.gov/rules-policy/final-rules/required-rulemaking-on-personal-financial-data-rights/ .

- **CFPB Section 1071 small-business-lending data-collection rule, 12 CFR §1002.107**. **§1071 revised final rule (May 1, 2026; 1,000 covered transactions threshold; effective June 30, 2026; compliance January 1, 2028 with grace period through December 31, 2028)** — supersedes 2023 tiered schedule. Small-business gross annual revenue threshold $1M; merchant cash advances, agricultural lending, small-dollar business loans ≤$1,000, and Farm Credit System lenders excluded. Where the program operator originates small-business credit, the §1071 reach applies on the revised schedule. https://www.consumerfinance.gov/rules-policy/final-rules/small-business-lending-under-the-equal-credit-opportunity-act-regulation-b-2026/ .

- **CFPB Supervisory Highlights (current cycles)** [verify which issues are current as of the analysis date]. Recurring fintech themes: account closure / hold UDAAP, Reg E §1005.11 timing failures, fee disclosure, FDIC misrepresentation, junk-fees, BNPL, dark patterns. https://www.consumerfinance.gov/data-research/research-reports/supervisory-highlights/ .

- **CFPB Circular series** [verify section and which circulars are current as of the analysis date and which numbers / dates apply]. Examples include Circular 2022-06 on unanticipated overdraft fees [verify current state]. https://www.consumerfinance.gov/compliance/circulars/ .

- **CFPB BNPL market-monitoring report** (September 15, 2022) and any subsequent BNPL actions or interpretive rulings [verify current state, including the Pay-in-Four interpretive rule status]. https://www.consumerfinance.gov/data-research/research-reports/buy-now-pay-later-market-trends-and-consumer-impacts/ .

- **CFPB enforcement actions and consent orders** [verify section and which are current and finalised as of the analysis date]. Use only public defendants in finalised actions for fact-pattern citation. https://www.consumerfinance.gov/enforcement/actions/ .

## State licensing

- **Money Transmitter Modernization Act (MTMA) — Conference of State Bank Supervisors (CSBS) model law** [verify section and state-by-state adoption status and the version of the model law adopted in each state on the analysis date]. NMLS is the licensing system of record for most states. https://www.csbs.org/mtma .

- **Multistate MSB Licensing Agreement Program (MMLA)** [verify section and current participating-state list]. Multistate processing channel through CSBS. https://www.csbs.org/mmla .

- **NMLS — Nationwide Multistate Licensing System** [verify section]. Money transmitter and MSB licensing system of record. https://nationwidelicensingsystem.org/ .

- **State examples (incomplete — verify state-by-state for the engagement footprint):**
  - **NY DFS BitLicense, 23 NYCRR Part 200** [verify section]. Virtual currency business activity licence. https://www.dfs.ny.gov/industry_guidance/virtual_currency_businesses .
  - **CA Money Transmission Act, Cal. Fin. Code §2000 et seq.**, administered by the CA DFPI. https://dfpi.ca.gov/money-transmitters/ .
  - **CA Consumer Financial Protection Law (CCFPL), Cal. Fin. Code §90000 et seq.**, expanding CA DFPI authority over consumer financial products. https://dfpi.ca.gov/california-consumer-financial-protection-law/ .

## Cyber, privacy, conduct cross-cutting (overlays carry the detail)

- **NYDFS 23 NYCRR Part 500** including §500.17(a) cybersecurity-event notification clock (72 hours). https://www.dfs.ny.gov/industry_guidance/cybersecurity .

- **GLBA Safeguards Rule, 16 CFR Part 314** as amended (FTC, December 2021 amendments effective 2023). §314.4(f) service-provider obligations; §314.4(h) incident-response. https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-314 .

- **GLBA Privacy Rule / Reg P, 12 CFR Part 1016**. https://www.ecfr.gov/current/title-12/chapter-X/part-1016 .

- **FFIEC IT Examination Handbook — Information Security booklet** [verify current edition and section]. https://ithandbook.ffiec.gov/ .

- **FFIEC Authentication and Access to Financial Institution Services and Systems Guidance** (August 11, 2021) [verify section and exact title]. https://www.ffiec.gov/press/PDF/Authentication-and-Access-to-Financial-Institution-Services-and-Systems.pdf .

- **SEC cybersecurity disclosure** — Item 1.05 of Form 8-K and Reg S-K Item 106 (effective 2023) [verify exact compliance dates by registrant size]. https://www.sec.gov/files/rules/final/2023/33-11216.pdf .

## Plugin-level shared references

Also consult, when present in the plugin:

- `references/source-map.md` — plugin-wide named-source map for payments-fintech.
- `references/policy-control-library.md` — plugin-wide control library for cross-skill payments-fintech controls.
- `references/public-regulatory-scenarios.md` — canonical scenario library reused across the four sector skills.

## Firm overlays

A firm using this skill in production adds firm-specific detail in `references/firm-overlay.md`. The skill consumes that file when present. Firm overlays do not modify the public anchors above.
