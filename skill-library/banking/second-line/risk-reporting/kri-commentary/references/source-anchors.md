# Source anchors: kri-commentary

Cited regulatory sources this skill anchors to. Every primary anchor names the source, the section reference (or `[verify section]` flag), a one-paragraph paraphrase of what the source says that the skill relies on, and the link.

The skill cites these by file path. SKILL.md does not restate excerpts.

## Primary anchors

### 1. BCBS 239 — Principles for Effective Risk Data Aggregation and Risk Reporting

- Citation: Basel Committee on Banking Supervision, "Principles for effective risk data aggregation and risk reporting" (January 2013), Principles 7 (accuracy), 8 (comprehensiveness), 9 (clarity and usefulness), 10 (frequency), 11 (distribution). Supervisory context: BCBS Newsletter on RDARR implementation (January 2026) [verify exact title and publication date] flags persistent data-quality framework gaps that pressure the commentary's data-confidence label.
- Excerpt-paraphrase: Principle 7 requires risk reports to reconcile and validate to source data and to be accurate. Principle 8 requires reports to cover all material risk areas with appropriate aggregation. Principle 9 (the load-bearing principle for this skill) requires reports to be tailored to the recipient's needs and to communicate information in clear, concise terms; the commentary must be useful for the audience and enable action. Principle 10 matches reporting frequency to the volatility of the risk and the cadence of decision-making. Principle 11 sets distribution and confidentiality controls. The KRI commentary is the principle-9 instrument: it converts a metric movement into decision-supporting context. Where the firm carries known data-aggregation limitations under principles 2 / 3 / 6, the commentary's data-confidence label is constrained accordingly.
- Link: https://www.bis.org/publ/bcbs239.htm — Principles 7-11; https://www.bis.org/bcbs/publications.htm — BCBS Newsletter on RDARR (January 2026 issue) [verify exact URL]
- Notes: BCBS 239 is supervisory guidance. For US G-SIBs and other in-scope firms, prudential regulators incorporate it through the supervisory cycle. Principles 1-6 (governance and data-aggregation infrastructure) sit upstream and are addressed by `bcbs239-gap-assessment`; this skill assumes the principle 1-6 posture is established and surfaces residual data-confidence caveats in the block. The 2026 Newsletter is supervisory commentary, not new rule text; cite for context, not as binding.

### 2. COSO ERM 2017 — Performance component

- Citation: Committee of Sponsoring Organizations of the Treadway Commission, "Enterprise Risk Management — Integrating with Strategy and Performance" (June 2017), Performance component (Principles 10 through 14: Identifies Risk; Assesses Severity; Prioritizes Risk; Implements Risk Responses; Develops Portfolio View) and Information, Communication, and Reporting component (Principle 18: Reports on Risk, Culture, and Performance).
- Excerpt-paraphrase: The Performance component frames risk identification, severity assessment, and the response to deviations from risk appetite. The Information, Communication, and Reporting component frames the obligation to report on risk and on performance against risk appetite. KRI commentary is the running record of performance against the firm's RAS metrics; the residual-risk view in each block is the COSO ERM "implements risk responses" voice projecting forward.
- Link: https://www.coso.org/enterprise-risk-management — ERM 2017 framework, Performance component (Principles 10-14) and Information, Communication, and Reporting component (Principle 18)
- Notes: COSO ERM 2017 is voluntary framework guidance and is heavily adopted across US financial-services firms.

### 3. OCC Heightened Standards — 12 CFR Part 30 Appendix D (Risk Appetite Statement section)

- Citation: 12 CFR Part 30 Appendix D, "OCC Guidelines Establishing Heightened Standards for Certain Large Insured National Banks, Insured Federal Savings Associations, and Insured Federal Branches", the Risk Appetite Statement section (colloquially "Section III"; the published Appendix uses lettered Roman-numeral headings without the III.B-style sub-numbering colloquially used) [verify section labels at write time].
- Excerpt-paraphrase: The RAS section requires covered banks to maintain a written Risk Appetite Statement with both qualitative components and quantitative limits, and provides for monitoring and reporting against those limits. The KRI commentary is the running record of the monitoring-and-reporting obligation; for covered banks the `linked_ras_metric_id` in each block is the load-bearing connection between the KRI population and the RAS the board oversees.
- Link: https://www.ecfr.gov/current/title-12/chapter-I/part-30/appendix-Appendix%20D%20to%20Part%2030 — 12 CFR Part 30 Appendix D
- Notes: Heightened Standards apply to OCC-supervised insured national banks, federal savings associations, and federal branches with average total consolidated assets at or above the threshold (currently $50 billion). Verify section labels against the current eCFR text at write time.

### 4. Basel revised principles for the sound management of operational risk

- Citation: Basel Committee on Banking Supervision, "Revisions to the Principles for the Sound Management of Operational Risk" (March 2021) [verify date]. Principle on KRI taxonomy and operational-risk data taxonomy.
- Excerpt-paraphrase: The revised principles set the operational-risk taxonomy that most banks use for KRI subtype classification (external fraud, internal fraud, employment practices and workplace safety, clients products and business practices, damage to physical assets, business disruption and system failures, execution delivery and process management). KRI commentary on operational-risk metrics consumes this taxonomy for `risk_subtype`.
- Link: https://www.bis.org/bcbs/publ/d515.htm — Revisions to the Principles for the Sound Management of Operational Risk (March 2021) [verify date and current revision]
- Notes: The revised principles updated and clarified the 2003 / 2011 versions. Verify the most recent BCBS publication on operational-risk principles at write time.

### 5. FRB SR 95-51 — Rating the Adequacy of Risk Management Processes

- Citation: Board of Governors of the Federal Reserve System, Supervision and Regulation Letter SR 95-51, "Rating the Adequacy of Risk Management Processes and Internal Controls at State Member Banks and Bank Holding Companies" [verify current applicability and any successor letter at write time].
- Excerpt-paraphrase: SR 95-51 frames the adequacy of risk management as a four-element rating: active board and senior management oversight; adequate policies, procedures, and limits; adequate risk monitoring and management information systems; and comprehensive internal controls. KRI commentary is the principal supervisory artifact demonstrating element three (risk monitoring and MIS) under this framing.
- Link: https://www.federalreserve.gov/boarddocs/srletters/1995/SR9551.HTM — SR 95-51 Rating the Adequacy of Risk Management Processes and Internal Controls
- Notes: SR 95-51 dates from 1995 and predates the LFI rating system framework operationalized by SR 19-3. The four-element framing remains widely cited; verify whether the FRB has published a successor letter or guidance superseding SR 95-51 for the institution category at write time. [verify current applicability]

## Secondary anchors (overlay only)

### 6. IIA Three Lines Model (2020 revision)

- Citation: Institute of Internal Auditors, "The IIA's Three Lines Model: An update of the Three Lines of Defense" (July 2020).
- Excerpt-paraphrase: The 2020 revision reframes the three-lines model as principles-based rather than function-mapped, and clarifies that the second line (risk management and compliance functions) provides expertise, support, and challenge to the first line. KRI commentary in the second-line voice is challenge, not first-line restatement; the `second_line_challenge_note` in each block is the explicit second-line voice.
- Link: https://www.theiia.org/en/content/articles/global-knowledge-brief/2020/the-iias-three-lines-model/ — IIA Three Lines Model (July 2020 revision), section on the second-line role
- Notes: IIA guidance is voluntary; widely adopted across financial-services as the operating model for the three lines.

### 7. FSB Principles for an Effective Risk Appetite Framework (November 2013)

- Citation: Financial Stability Board, "Principles for an Effective Risk Appetite Framework" (November 18, 2013), Section 3 (Risk Appetite Statement) and Section 4 (Risk Limits) [verify section].
- Excerpt-paraphrase: The FSB principles set the international supervisory frame for risk-appetite frameworks at financial institutions; covers risk-appetite-statement content, risk-limit structure, and the role of the board, the CRO, and business-line management. KRI commentary on RAS-linked metrics consumes this frame for the linkage between KRI breach and RAS metric and for the escalation expectation.
- Link: https://www.fsb.org/2013/11/r_131118/ — FSB Principles for an Effective Risk Appetite Framework (November 2013), Sections 3 and 4
- Notes: FSB guidance; adopted as supervisory expectation by national authorities through the supervisory cycle. [verify section labels]

## Cross-cutting overlays cited (loaded by overlay files)

### 8. NIST Cybersecurity Framework 2.0

- Citation: National Institute of Standards and Technology, "The NIST Cybersecurity Framework (CSF) 2.0" (NIST CSWP 29, February 26, 2024), Functions: Govern, Identify, Protect, Detect, Respond, Recover.
- Excerpt-paraphrase: CSF 2.0 organizes cybersecurity outcomes into six functions; the Govern function is the new addition (over CSF 1.1) and frames organizational governance, risk management strategy, and oversight. Cyber KRI commentary loaded by the cyber overlay aligns `risk_subtype` to the CSF 2.0 function names where the firm taxonomy supports it.
- Link: https://www.nist.gov/cyberframework — NIST CSF 2.0, section on the six Functions (Govern / Identify / Protect / Detect / Respond / Recover), February 2024
- Notes: NIST CSF is voluntary. Used widely across US financial-services as the cybersecurity-program framing.

### 9. NYDFS 23 NYCRR Part 500 §500.4(b) CISO report; §500.17 notification and annual certification

- Citation: New York Department of Financial Services, 23 NYCRR Part 500, "Cybersecurity Requirements for Financial Services Companies". §500.4(b) (CISO annual written report to the senior governing body) and §500.4(d) (board oversight). §500.17(a) (notice of cybersecurity event within 72 hours of determination); §500.17(b) (annual notice of compliance — Form B — signed by the CISO and the highest-ranking executive, or a written acknowledgement of non-compliance with one or more requirements); §500.17(c) (notice of extortion payment, added by the Second Amendment effective November 1, 2023). [Verify section labels post-amendment.]
- Excerpt-paraphrase: §500.4(b) requires the CISO to report at least annually in writing to the senior governing body on the cybersecurity program — material issues, remediation, CIA-of-NPI assessment. §500.17(a) requires notification of cybersecurity events meeting the rule's threshold within 72 hours of determination. §500.17(b) is the annual Form B compliance notice. Cyber KRI commentary feeds the §500.4(b) report and flags the §500.17(a) notification posture for any KRI movement materially driven by a notification-relevant event.
- Link: https://www.dfs.ny.gov/industry-guidance/cybersecurity — 23 NYCRR Part 500 §§500.4 and 500.17
- Notes: Part 500 reach is to NYDFS-licensed covered entities; many cross-state and multinational firms are in scope through a NY licence even where their primary regulator is elsewhere. The Second Amendment effective November 1, 2023 phased compliance through November 2025; verify section labels at write time.

### 10. SEC cyber disclosure rule

- Citation: SEC Release Nos. 33-11216, 34-97989, "Cybersecurity Risk Management, Strategy, Governance, and Incident Disclosure" (final July 26, 2023). Form 8-K Item 1.05 (material cybersecurity incident disclosure) and Regulation S-K Item 106 (annual cybersecurity risk management, strategy, and governance).
- Excerpt-paraphrase: The rule requires public-company registrants to disclose material cybersecurity incidents on Form 8-K within four business days of the determination of materiality (subject to limited delay), and to disclose cybersecurity risk management, strategy, and governance under Item 106 of Regulation S-K in the annual report. Sustained cyber-KRI deterioration is a leading indicator that should feed the firm's disclosure-controls discipline; the cyber overlay cross-references `cyber-disclosure-readiness` for the leading-indicator referral process.
- Link: https://www.sec.gov/files/rules/final/2023/33-11216.pdf — Release Nos. 33-11216, 34-97989; Form 8-K Item 1.05; Regulation S-K Item 106
- Notes: 8-K Item 1.05 effective December 18, 2023 for non-smaller-reporting-companies and June 15, 2024 for SRCs. Item 106 effective for fiscal-year filings ending on or after December 15, 2023 for large filers, with phased applicability for SRCs. Verify current SRC phase-in dates and any post-adoption staff guidance (CD&Is) at write time.

### 11. TCFD Recommendations and ISSB IFRS S2

- Citation: Task Force on Climate-related Financial Disclosures, "Recommendations of the Task Force on Climate-related Financial Disclosures" (Final Report, June 2017) and "Implementing the Recommendations of the Task Force on Climate-related Financial Disclosures" (October 2021). Pillars: Governance, Strategy, Risk Management, Metrics and Targets. ISSB IFRS S2 Climate-related Disclosures (June 2023), incorporating TCFD.
- Excerpt-paraphrase: TCFD and ISSB IFRS S2 set the metric-and-target frame for climate KRIs; Pillar 4 (Metrics and Targets) is the load-bearing pillar for KRI commentary. Climate KRI blocks loaded by the climate overlay carry the TCFD or IFRS S2 framework linkage and (where in scope) the SEC Climate Rule linkage with the current-effectiveness flag.
- Link: https://www.fsb-tcfd.org/recommendations/ — TCFD Recommendations (June 2017) and Implementation Guidance (October 2021), Pillar 4 (Metrics and Targets) section; https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/ifrs-s2-climate-related-disclosures/ — ISSB IFRS S2 (June 2023), section on climate-related metrics and targets
- Notes: The Financial Stability Board disbanded the TCFD in October 2023; monitoring transferred to the IFRS Foundation. TCFD recommendations remain the working frame and underpin ISSB IFRS S2.

### 12. SEC Climate Disclosure Rule (March 2024) — current-effectiveness caveat

- Citation: SEC Release Nos. 33-11275, 34-99678, "The Enhancement and Standardization of Climate-Related Disclosures for Investors" (final March 6, 2024), Items 1500-1507 of Regulation S-K and Article 14 of Regulation S-X.
- Excerpt-paraphrase: The SEC final rule requires registrants to disclose material climate-related risks, governance and risk management of those risks, climate-related targets and goals, and (for larger registrants) Scope 1 and Scope 2 emissions, and to provide certain financial-statement disclosures regarding the financial effects of severe weather events. Climate KRIs feeding any disclosure under this rule require a current-effectiveness check at write time.
- Link: https://www.sec.gov/files/rules/final/2024/33-11275.pdf — Release Nos. 33-11275, 34-99678 (final rule, March 6, 2024), Items 1500-1507 of Regulation S-K and Article 14 of Regulation S-X
- Notes: The rule is subject to consolidated litigation in the Eighth Circuit; the SEC issued a stay April 4, 2024 pending resolution of litigation. Pack-writer must verify current status at write time and not assert current effectiveness without checking SEC posture. Default posture: cite the rule with `[verify current effectiveness]` and lean on TCFD or ISSB IFRS S2 for substantive content. [verify current effectiveness]

### 13. BCBS Principles for the effective management and supervision of climate-related financial risks (June 2022)

- Citation: Basel Committee on Banking Supervision, "Principles for the effective management and supervision of climate-related financial risks" (June 2022), Principles 1-12 (banks) and 13-18 (supervisors).
- Excerpt-paraphrase: The BCBS climate principles set supervisory expectations for the management of climate-related financial risks at banks, including risk-reporting and metrics expectations. Climate KRIs at supervised banks feed the principles 7-9 expectations on monitoring and reporting; the climate overlay loads this anchor where banking + climate are both in scope.
- Link: https://www.bis.org/bcbs/publ/d532.htm — BCBS Principles for the effective management and supervision of climate-related financial risks (June 2022), Principles 1-12 (banks)
- Notes: Supervisory guidance; national supervisors incorporate through the supervisory cycle.

## Verification flags

The following items carry `[verify section]`, `[verify date]`, or `[verify current effectiveness]` flags and must be confirmed at write time:

- 12 CFR Part 30 Appendix D Section III — confirm section label and current text against eCFR.
- BCBS revised principles for the sound management of operational risk — confirm March 2021 publication is current vintage.
- FRB SR 95-51 — confirm current applicability and any successor letter for the institution category.
- FSB Principles for an Effective Risk Appetite Framework (November 2013) — confirm section labels.
- NYDFS 23 NYCRR Part 500 §§500.4 and 500.17 — confirm section labels post-Second Amendment (effective November 1, 2023).
- SEC cyber disclosure rule — confirm SRC phase-in dates and any post-adoption staff guidance at write time.
- SEC Climate Disclosure Rule (March 2024) — confirm current effectiveness given Eighth Circuit consolidated litigation and SEC stay.

Where verification is incomplete, the block carries the flag forward; do not invent.

## Firm overlay placeholder

A firm using this skill in production overlays its risk-appetite-statement structure, its risk taxonomy, its KRI population, named owners, the disclosure-process referral protocol, and the firm's CISO-report cadence via `references/firm-overlay.md` (not committed in this repo). The firm overlay does not modify this source-anchors file. A consulting firm shipping a client overlay does the same thing under a separate overlay file.
