# Source anchors: cyber-disclosure-readiness

Cited regulatory sources this skill anchors to. Every primary anchor names the source, the section reference (or `[verify section]` flag), a one-paragraph paraphrase of what the source says that the skill relies on, and the link.

The skill cites these by file path. SKILL.md does not restate excerpts.

## Primary anchors

### 1. SEC Cybersecurity Risk Management, Strategy, Governance, and Incident Disclosure Final Rule

- Citation: Securities and Exchange Commission, "Cybersecurity Risk Management, Strategy, Governance, and Incident Disclosure", Release Nos. 33-11216 / 34-97989 (adopted July 26, 2023). Effective dates phased: 8-K Item 1.05 effective December 18, 2023 for non-smaller-reporting-companies and June 15, 2024 for SRCs; Item 106 of Regulation S-K and Form 20-F amendments effective for fiscal years ending on or after December 15, 2023 (large filers) with phased applicability for SRCs [verify section refs against current Federal Register text].
- Excerpt-paraphrase: The rule adds Item 1.05 to Form 8-K requiring registrants to disclose material cybersecurity incidents within four business days of determining that the incident is material; the disclosure must describe the material aspects of the nature, scope, and timing of the incident, and the material impact or reasonably likely material impact on the registrant. The rule adds Item 106 to Regulation S-K requiring annual disclosure of the registrant's processes for assessing, identifying, and managing material risks from cybersecurity threats, and disclosure of board oversight and management's role and expertise. A delay provision permits postponement of the Item 1.05 filing if the US Attorney General determines that immediate disclosure would pose a substantial risk to national security or public safety.
- Link: https://www.sec.gov/files/rules/final/2023/33-11216.pdf — Release Nos. 33-11216 / 34-97989, Sections II.A (Item 1.05), II.B (delay provision), II.C (Item 106 of Regulation S-K), II.D (Form 20-F)
- Notes: SEC has issued Compliance and Disclosure Interpretations (CD&Is) post-adoption clarifying staff views on materiality, the delay provision, and certain trigger questions; verify the current CD&I version at draft time. The Justice Department has issued guidance on the AG delay-determination process; verify current DOJ guidance at draft time.

### 2. Form 8-K Item 1.05 — Material Cybersecurity Incidents

- Citation: 17 CFR §249.308 (Form 8-K), Item 1.05 "Material Cybersecurity Incidents" (added by Release No. 33-11216, effective December 18, 2023; June 15, 2024 for SRCs). Instruction 1 to Item 1.05 covers a series of related occurrences.
- Excerpt-paraphrase: Item 1.05(a) requires disclosure within four business days of determining that a cybersecurity incident is material, describing the material aspects of (i) the nature, scope, and timing of the incident and (ii) the material impact or reasonably likely material impact on the registrant, including its financial condition and results of operations. Item 1.05(b) addresses material amendments. Item 1.05(c) provides the delay provision. Instruction 1 requires aggregation of related occurrences in determining materiality where the incidents stem from the same threat actor or related occurrences.
- Link: https://www.ecfr.gov/current/title-17/chapter-II/part-249/subpart-A/section-249.308 — 17 CFR §249.308 Item 1.05 [verify section after Federal Register update]
- Notes: The 4-business-day clock starts at the date of materiality determination, not at detection or at determination of the incident's existence. SEC has been explicit on this point in adopting release commentary and in CD&Is. Conflating clock start with detection is a known failure mode and is what the workpaper's `disclosure_clock_start` field is designed to prevent.

### 3. Regulation S-K Item 106 — Cybersecurity Risk Management, Strategy, and Governance

- Citation: 17 CFR §229.106, "Cybersecurity" (added by Release No. 33-11216). Subitems 106(b) (risk management and strategy), 106(c) (governance). Item 106(a) provides definitions including "cybersecurity incident", "cybersecurity threat", and "information systems".
- Excerpt-paraphrase: Item 106(b)(1) requires disclosure of the registrant's processes for assessing, identifying, and managing material risks from cybersecurity threats, including (i) whether and how those processes are integrated into the overall risk-management system, (ii) engagement of assessors, consultants, auditors, or other third parties, and (iii) processes to oversee and identify material risks from the use of third-party service providers. Item 106(b)(2) requires disclosure of whether risks from cybersecurity threats have materially affected, or are reasonably likely to materially affect, the registrant. Item 106(c)(1) requires disclosure of the board of directors' oversight of risks from cybersecurity threats, including the identification of any board committee or subcommittee responsible for the oversight and the processes by which the board or committee is informed about such risks. Item 106(c)(2) requires disclosure of management's role in assessing and managing material risks, including identifying which positions or committees are responsible and the relevant expertise.
- Link: https://www.ecfr.gov/current/title-17/chapter-II/part-229/subpart-229.1/section-229.106 — 17 CFR §229.106 Item 106 [verify section after Federal Register update]
- Notes: The disclosure is filed in the 10-K (and 20-F for FPIs). Year-over-year diff and rationale is required by the disclosure committee's standard practice; rolled-forward-unchanged Item 106 is a frequent finding from second-line and audit reviews.

### 4. Exchange Act Rule 13a-15 / 15d-15 — Disclosure Controls and Procedures

- Citation: 17 CFR §240.13a-15 and 17 CFR §240.15d-15, "Controls and procedures". Disclosure controls and procedures (DCP) are defined in Rule 13a-15(e) / 15d-15(e) as controls and procedures of an issuer designed to ensure that information required to be disclosed in reports filed under the Exchange Act is recorded, processed, summarized, and reported within the time periods specified in the SEC's rules and forms.
- Excerpt-paraphrase: DCP requires that information required to be disclosed by an issuer is accumulated and communicated to the issuer's management, including its principal executive and principal financial officers, as appropriate to allow timely decisions regarding required disclosure. Sarbanes-Oxley Section 302 certifications attest to the effectiveness of DCP. The Item 1.05 trigger flow (detection through materiality determination through filing decision) is the cyber-disclosure cut of the DCP framework; the DCP readiness map (Artifact C) is the disclosure-committee view of how that flow works.
- Link: https://www.ecfr.gov/current/title-17/chapter-II/part-240/section-240.13a-15 — 17 CFR §240.13a-15(a) (maintenance), (e) (definition), (f) (ICFR — separate but adjacent)
- Notes: ICFR (internal control over financial reporting) under the same rules is adjacent but separate; DCP and ICFR cover different elements and the Item 1.05 trigger flow is principally a DCP question. Sarbanes-Oxley 906 certifications by the CEO and CFO are the financial-statement-side certification adjacent to DCP.

### 5. TSC Industries, Inc. v. Northway, Inc. and Basic Inc. v. Levinson — Materiality Standard

- Citation: TSC Industries, Inc. v. Northway, Inc., 426 U.S. 438, 449 (1976) [verify pin cite at draft time]; Basic Inc. v. Levinson, 485 U.S. 224, 231-232 (1988) [verify pin cite at draft time].
- Excerpt-paraphrase: TSC Industries set the materiality standard as a substantial likelihood that a reasonable investor would consider the omitted fact important in deciding how to vote (or, in the SEC-disclosure context, in making an investment decision); the standard does not require certainty that disclosure would change a reasonable investor's decision. Basic v. Levinson applied the TSC standard in the Section 10(b) / Rule 10b-5 context and adopted the probability-magnitude analysis for forward-looking or contingent events. The SEC final rule incorporates this materiality standard by reference; the materiality determination workpaper applies the TSC / Basic test to the incident's known and reasonably foreseeable facts as of the determination date.
- Link: https://supreme.justia.com/cases/federal/us/426/438/ — TSC Industries v. Northway, 426 U.S. 438, materiality standard section [verify pin cite]; https://supreme.justia.com/cases/federal/us/485/224/ — Basic v. Levinson, 485 U.S. 224, materiality and probability-magnitude analysis section [verify pin cite]
- Notes: SEC Staff Accounting Bulletin No. 99 (1999) gives the staff's view on materiality in the financial-reporting context, including qualitative-versus-quantitative considerations; useful as a reference but not the controlling cite for cyber materiality.

### 6. NYDFS 23 NYCRR Part 500 §500.17 — Notice of Cybersecurity Event

- Citation: New York Department of Financial Services, 23 NYCRR Part 500, "Cybersecurity Requirements for Financial Services Companies", §500.17(a) (notice of cybersecurity event) and §500.17(c) (notice of extortion payment). Current text reflects the Second Amendment (effective November 1, 2023) with phased compliance dates [verify section labels and compliance dates at draft time].
- Excerpt-paraphrase: §500.17(a) requires covered entities to notify the Superintendent as promptly as possible but in no event later than 72 hours after determining that a cybersecurity event has occurred, where the event meets the notification thresholds set in the rule (impacts the covered entity for which notice is required to a government body, self-regulatory agency or other supervisory body; has a reasonable likelihood of materially harming any material part of the covered entity's normal operations; or involves an unauthorized user gaining access to a privileged account or the deployment of ransomware). §500.17(c) (added by the Second Amendment) requires notification within 24 hours of an extortion payment and within 30 days a written description of the reasons payment was necessary, alternatives considered, and sanctions due-diligence performed.
- Link: https://www.dfs.ny.gov/industry-guidance/cybersecurity — 23 NYCRR Part 500 §500.17(a), §500.17(c) [verify section after Second Amendment effective date]
- Notes: The 72-hour clock under §500.17 starts at the determination that a cybersecurity event has occurred; the SEC 4-business-day clock under Item 1.05 starts at the determination of materiality. The two clocks run on different bases for the same incident; the parallel-clocks table in Artifact A surfaces both. NYDFS reach is to NYDFS-licensed covered entities; many cross-state and multinational firms are in scope through a NY licence.

### 7. Federal Banking Agencies' Computer-Security Incident Notification Rule

- Citation: 12 CFR Part 53 (OCC, national banks and federal savings associations), 12 CFR Part 225 Subpart N (FRB, state member banks and BHCs), 12 CFR Part 304 Subpart C (FDIC, state nonmember banks and savings associations). Effective May 1, 2022.
- Excerpt-paraphrase: A "computer-security incident" is defined as an occurrence that results in actual harm to the confidentiality, integrity, or availability of an information system or the information that the system processes, stores, or transmits. A "notification incident" is a computer-security incident that has materially disrupted or degraded, or is reasonably likely to materially disrupt or degrade, a banking organization's (i) ability to carry out banking operations, activities, or processes, or deliver banking products and services to a material portion of its customer base; (ii) business line(s) that would result in a material loss of revenue, profit, or franchise value; or (iii) operations that would pose a threat to the financial stability of the United States. A banking organization must notify its primary federal regulator as soon as possible and no later than 36 hours after determining that a notification incident has occurred. Bank service providers are required to notify affected banking-organization customers as soon as possible after determining a computer-security incident has caused, or is reasonably likely to cause, a service disruption of four or more hours.
- Link: https://www.ecfr.gov/current/title-12/chapter-I/part-53 — 12 CFR Part 53 (OCC); https://www.ecfr.gov/current/title-12/chapter-II/subchapter-A/part-225/subpart-N — 12 CFR Part 225 Subpart N (FRB); https://www.ecfr.gov/current/title-12/chapter-III/subchapter-B/part-304/subpart-C — 12 CFR Part 304 Subpart C (FDIC)
- Notes: The 36-hour clock starts at determination of a "notification incident", not at materiality under TSC. A single incident can simultaneously trigger the 36-hour bank-regulator clock, the 72-hour NYDFS clock, and the 4-business-day SEC clock; all three resolve from different basis events. The federal banking agencies' rule applies to covered banking organizations; bank service providers have a separate 4-hour customer-notification trigger.

### 8. SEC Regulation S-P Amendments (May 2024)

- Citation: SEC Release Nos. 34-100155, IA-6604, IC-35193, "Regulation S-P: Privacy of Consumer Financial Information and Safeguarding Customer Information" (final May 16, 2024). Amends 17 CFR Part 248 §§248.30 and adds new requirements; adds incident-response program requirements and a 30-day customer-notification trigger. Compliance dates: larger entities December 3, 2025; smaller entities June 3, 2026 [verify the larger-entity / smaller-entity scope cut against the operative final-rule definitions at draft time].
- Excerpt-paraphrase: The amendments require covered institutions (broker-dealers, investment advisers, registered investment companies, transfer agents) to (i) maintain a written incident-response program reasonably designed to detect, respond to, and recover from unauthorised access to or use of customer information; (ii) notify each affected individual whose sensitive customer information was, or is reasonably likely to have been, accessed or used without authorisation, as soon as practicable but not later than 30 days after the institution becomes aware. The notice must describe the incident, the type of sensitive customer information affected, and contact information.
- Link: https://www.sec.gov/files/rules/final/2024/34-100155.pdf — Release Nos. 34-100155 et al.
- Notes: The 30-day customer-notice clock under Reg S-P starts at awareness of unauthorised access; the SEC 4-business-day Item 1.05 clock starts at materiality determination. The two clocks resolve from different basis events and a single incident can trigger both. Verify entity-tier scope against the operative final-rule definitions at draft time.

### 9. SEC Climate Disclosure Rule

- Citation: SEC Release Nos. 33-11275, 34-99678, "The Enhancement and Standardization of Climate-Related Disclosures for Investors" (final March 6, 2024), Items 1500-1507 of Regulation S-K and Article 14 of Regulation S-X.
- Excerpt-paraphrase: The rule requires registrants to disclose material climate-related risks, governance and risk-management of those risks, climate-related targets and goals, and (for larger registrants) Scope 1 and Scope 2 emissions; and to provide certain financial-statement disclosures regarding the financial effects of severe weather events. The disclosure machinery (DCP, disclosure committee, materiality lens, 8-K trigger flow for material climate-related events) is shared with the cyber-disclosure machinery; this skill carries the climate cross-cutting overlay because the same DCP and the same 8-K mechanic handle climate-related material events.
- Link: https://www.sec.gov/files/rules/final/2024/33-11275.pdf — Release Nos. 33-11275, 34-99678, Items 1500-1507 of Regulation S-K and Article 14 of Regulation S-X
- Notes: The rule has been subject to legal challenges. The Commission stayed the rule pending resolution of consolidated litigation in the Eighth Circuit (Order issued April 4, 2024). Pack-writer must verify the current status at draft time and not assert current effectiveness without checking the SEC's posture; default posture is to cite the rule with a `[verify current effectiveness]` flag and lean on TCFD for substantive content. The TCFD recommendations (Final Report June 2017; Implementing Recommendations October 2021) remain the working voluntary frame; the FSB disbanded the TCFD in October 2023 with monitoring transferred to the IFRS Foundation.

### 10. Form 6-K — Foreign Private Issuer Cyber Disclosure

- Citation: SEC Form 6-K (17 CFR §249.306) and General Instruction B; Form 20-F Item 16K (cybersecurity) for FPI annual disclosure (added by Release No. 33-11216).
- Excerpt-paraphrase: FPIs are not subject to Form 8-K and therefore are not subject to Item 1.05 directly. FPIs furnish material information on Form 6-K when the information is required to be made public in their home jurisdiction, filed with a stock exchange on which their securities are traded, or distributed to security holders. The cyber final rule requires FPIs to furnish on Form 6-K information about material cybersecurity incidents that they disclose or are required to disclose in a foreign jurisdiction or to a stock exchange. Form 20-F Item 16K parallels Item 106 of Regulation S-K for the FPI annual disclosure of cybersecurity risk management, strategy, and governance.
- Link: https://www.ecfr.gov/current/title-17/chapter-II/part-249/subpart-A/section-249.306 — 17 CFR §249.306 Form 6-K; https://www.sec.gov/files/form20-f.pdf — Form 20-F Item 16K [verify section after Federal Register update]
- Notes: The FPI trigger flow is structurally different from the domestic 8-K flow; the pack adapts to the FPI mode when the engagement names FPI status. Treating an FPI as a domestic issuer is a frequent failure mode for advisers working their first FPI.

## Secondary anchors

### 11. NIST SP 800-61 Rev. 3 — Incident Response Recommendations and Considerations for Cybersecurity Risk Management

- Citation: National Institute of Standards and Technology, Special Publication 800-61 Revision 3, "Incident Response Recommendations and Considerations for Cybersecurity Risk Management" (April 3, 2025) [verify exact publication date and any errata at draft time]. Re-anchored to NIST CSF 2.0; replaces Rev. 2 (August 2012).
- Excerpt-paraphrase: SP 800-61 Rev. 3 reorients incident-response guidance around the CSF 2.0 functions (Govern, Identify, Protect, Detect, Respond, Recover) rather than the Rev. 2 four-phase lifecycle. The disclosure committee's materiality call references the operational chronology the incident-response function produces under this guide; the cyber-disclosure pack's DCP trace and parallel-clocks table draw on the Respond and Recover function content, with the materiality call sitting outside SP 800-61's scope.
- Link: https://csrc.nist.gov/pubs/sp/800/61/r3/final — NIST SP 800-61 Rev. 3
- Notes: Rev. 2 (2012) remains in widespread use and may still be referenced in firm runbooks; the migration to Rev. 3 is in progress across the industry. Verify which revision the firm's IR function operates under at draft time.

### 12. FFIEC IT Examination Handbook — Information Security

- Citation: Federal Financial Institutions Examination Council, IT Examination Handbook, "Information Security" booklet (September 2016) and "Architecture, Infrastructure, and Operations" booklet (June 2021), Sections on incident response and cybersecurity governance [verify section labels at draft time].
- Excerpt-paraphrase: The FFIEC IT Handbook sets the bank-supervisory expectations for information security and cybersecurity programs, including incident-response process expectations, board-and-management-oversight expectations, and risk-assessment expectations. The Information Security booklet's incident-response expectations underpin the bank-side narrative in Item 106(b) for bank-affiliated registrants and inform the DCP readiness map for covered banking organizations.
- Link: https://ithandbook.ffiec.gov/it-booklets/information-security/ — FFIEC IT Handbook Information Security booklet, Sections II-IV (Information Security Program Management) [verify section]
- Notes: FFIEC issuances are supervisory guidance, applied through OCC, FRB, FDIC, NCUA, and CFPB examination cycles. The FFIEC Cybersecurity Assessment Tool (CAT) was sunset; verify any successor framework at draft time.

### 13. NIST Cybersecurity Framework 2.0

- Citation: National Institute of Standards and Technology, "The NIST Cybersecurity Framework (CSF) 2.0", NIST CSWP 29 (February 26, 2024). Functions: Govern, Identify, Protect, Detect, Respond, Recover.
- Excerpt-paraphrase: CSF 2.0 adds the Govern function to the original five (Identify, Protect, Detect, Respond, Recover). The Govern function covers organizational context, risk-management strategy, supply-chain risk management, roles and responsibilities, and policy. The Govern function content maps to Item 106(c) governance disclosure; the Identify, Protect, Detect, Respond, and Recover functions map to Item 106(b) risk management and strategy disclosure. CSF 2.0 is voluntary but widely referenced in 10-K Item 106 narratives.
- Link: https://www.nist.gov/cyberframework — NIST CSF 2.0, Govern function (Section 4.1) and Core Functions reference
- Notes: CSF 2.0 is voluntary; the Item 106 disclosure does not require alignment to CSF or any other named framework, but firms commonly reference one and the disclosure committee tests internal consistency.

### 14. NAIC Insurance Data Security Model Law (Model #668)

- Citation: National Association of Insurance Commissioners, "Insurance Data Security Model Law", Model #668 (2017), §4 (information security program), §6 (notification of cybersecurity event) [verify section labels for state-by-state adoption variation].
- Excerpt-paraphrase: Model #668 §6 requires licensees to notify the commissioner as promptly as possible but in no event later than 72 hours after a determination that a cybersecurity event has occurred, where the event meets specified thresholds (involves nonpublic information of consumers, has a reasonable likelihood of materially harming the licensee or consumers, or involves a service-provider event). State adoption varies; verify the specific state DOI's adoption status and any state-specific deviations at draft time.
- Link: https://content.naic.org/sites/default/files/inline-files/MDL-668.pdf — NAIC Model #668 §4, §6
- Notes: Adoption status is tracked by NAIC; not all states have adopted Model #668, and adopting states sometimes vary the notification threshold or the timeline. The Model #668 72-hour clock parallels the NYDFS Part 500 §500.17 72-hour clock for insurance-licensed entities in NY; state-by-state mapping is essential for multi-state insurers.

### 15. SEC C&DI — Cybersecurity Disclosure (Form 8-K Item 1.05 and Reg S-K Item 106)

- Citation: SEC Division of Corporation Finance, Compliance and Disclosure Interpretations (C&DIs), "Exchange Act Form 8-K — Item 1.05" and "Regulation S-K — Item 106" [verify current C&DI version and individual question numbers at draft time].
- Excerpt-paraphrase: Post-adoption SEC staff has issued C&DIs interpreting (i) the materiality determination process and the timing of "without unreasonable delay" in determining materiality; (ii) the delay-provision mechanics under Item 1.05(c); (iii) what constitutes a "cybersecurity incident" for Item 106 purposes; (iv) Item 1.05 voluntary filings (a registrant filing under Item 1.05 for a non-material incident receives reduced safe-harbor treatment); (v) ransomware-payment disclosure considerations; and (vi) related-occurrence aggregation under Instruction 1 to Item 1.05. The materiality determination workpaper and the disclosure draft incorporate the most recent staff interpretations.
- Link: https://www.sec.gov/divisions/corpfin/guidance/exchange-act-form-8-k-cdi.htm — SEC C&DIs Form 8-K [verify current Item 1.05 question numbers]; https://www.sec.gov/divisions/corpfin/guidance/regs-kinterp.htm — SEC C&DIs Regulation S-K [verify current Item 106 question numbers]
- Notes: SEC staff added several C&DIs throughout 2024 in response to early Item 1.05 filings; verify the most recent issuances at draft time. Voluntary Item 1.05 filings have been a recurring topic.

### 16. FINRA Rule 4530 — Reporting Requirements

- Citation: Financial Industry Regulatory Authority, FINRA Rule 4530, "Reporting Requirements". Particular subsections: 4530(a)(1) (statutory disqualification, customer complaints meeting specified criteria, regulatory actions), 4530(b) (internal conclusions of violations), 4530(d) (quarterly statistical and summary reports of customer complaints). [verify subsection labels at draft time.]
- Excerpt-paraphrase: FINRA Rule 4530 requires member firms to report to FINRA specified events and findings within timeframes set by the rule (30 days for many event categories; quarterly for statistical reports). Cybersecurity events that result in customer complaints meeting the 4530(d) threshold or that constitute a 4530(b) internal conclusion of violation are reportable. The Rule 4530 obligation runs alongside the SEC Reg S-P customer-notice and the SEC Item 1.05 8-K obligations for FINRA-member registrants.
- Link: https://www.finra.org/rules-guidance/rulebooks/finra-rules/4530 — FINRA Rule 4530 Subsections (a), (b), (d)
- Notes: FINRA Rule 4530 reach is to FINRA-member broker-dealers. The rule's scope is broader than cybersecurity; only the cyber-relevant cuts surface in the parallel-clocks table.

## Cross-cutting overlays cited

### 17. GLBA Safeguards Rule (FTC) and Banking Agencies' Interagency Guidelines

- Citation: 16 CFR Part 314 (FTC Safeguards Rule, current text reflects December 2021 amendments and October 2023 amendments adding the 30-day notification trigger to the FTC for breaches affecting 500 or more consumers); Interagency Guidelines Establishing Information Security Standards (12 CFR Part 30 Appendix B for OCC; 12 CFR Part 208 Appendix D-2 for FRB; 12 CFR Part 364 Appendix B for FDIC) and Interagency Guidance on Response Programs for Unauthorized Access to Customer Information and Customer Notice (Federal Register, March 29, 2005). [verify section labels at draft time.]
- Excerpt-paraphrase: GLBA Title V and the Safeguards Rule (and the parallel Interagency Guidelines for banking agencies) require financial institutions to maintain administrative, technical, and physical safeguards for customer information; to develop and implement a written information security program; and (under the 2005 Interagency Guidance and the FTC's 2023 amendments) to notify customers and regulators of incidents involving unauthorized access to sensitive customer information. The clocks and triggers vary by regulator; the parallel-clocks table surfaces them all for entities in scope. Depth on the privacy-side notification flow lives in the privacy cross-cutting overlay.
- Link: https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-314 — FTC Safeguards Rule 16 CFR Part 314; https://www.federalregister.gov/documents/2005/03/29/05-5980/ — 2005 Interagency Guidance on Response Programs
- Notes: The FTC Safeguards Rule reach is to non-bank financial institutions including motor vehicle dealers, mortgage brokers, payday lenders, retailers issuing branded credit cards, and similar. The Interagency Guidelines reach is to insured depository institutions and their affiliates. Verify the entity-type applicability at draft time.

### 18. HIPAA Breach Notification Rule

- Citation: 45 CFR §§164.400-414 (HIPAA Breach Notification Rule). 60-day individual-notice clock under §164.404(b); HHS notice under §164.408 (annual log for under-500-affected breaches; concurrent notice for 500-or-more-affected breaches).
- Excerpt-paraphrase: HIPAA covered entities (and business associates with respect to their obligations) must notify affected individuals of a breach of unsecured protected health information without unreasonable delay and in no case later than 60 calendar days after discovery of the breach. HHS Office for Civil Rights must be notified concurrently for breaches affecting 500 or more individuals; under-500 breaches are logged and reported annually. The HIPAA clock surfaces in the parallel-clocks table for any in-scope entity (typically health insurers and business associates of healthcare providers, including some financial-services firms in their AI or third-party-administrator capacities).
- Link: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-D — 45 CFR Part 164 Subpart D, §§164.400-414
- Notes: HIPAA reach is to covered entities (health plans, health-care clearinghouses, health-care providers transmitting health information electronically) and business associates. Financial-services firms acting as business associates (e.g., FNOL handling for insurers, claims processing) inherit the obligation through the BAA.

## Verification flags

The following items carry `[verify section]`, `[verify current...]`, or `[verify pin cite]` flags and must be confirmed at draft time:

- SEC Final Rule (Release Nos. 33-11216 / 34-97989) — verify SRC phase-in dates and post-adoption C&DIs.
- 17 CFR §249.308 Item 1.05 — verify section labels after any Federal Register updates.
- 17 CFR §229.106 Item 106 — verify section labels after any Federal Register updates.
- TSC Industries v. Northway, Basic v. Levinson — verify pin cites at draft time.
- 23 NYCRR Part 500 §500.17 — verify section labels and compliance dates after Second Amendment.
- SEC Reg S-P amendments (May 2024) — compliance dates: larger entities December 3, 2025; smaller entities June 3, 2026; verify entity-tier scope against the operative final-rule definitions.
- SEC Climate Disclosure Rule (March 2024) — verify current effectiveness given Eighth Circuit consolidated litigation and SEC stay.
- FFIEC IT Handbook — verify section labels and any successor to the sunset Cybersecurity Assessment Tool.
- NIST SP 800-61 Rev. 3 (April 2025) — verify the firm's IR function operates under Rev. 3 (re-anchored to CSF 2.0) versus Rev. 2 (legacy four-phase lifecycle).
- NAIC Model #668 — verify state-by-state adoption status and state-specific deviations.
- SEC C&DIs — verify current question numbers for Item 1.05 and Item 106 interpretations.
- FINRA Rule 4530 — verify subsection labels at draft time.
- Form 20-F Item 16K — verify section labels after Federal Register updates.

Where verification is incomplete, the pack carries the flag forward; do not invent.

## Firm overlay placeholder

A firm using this skill in production overlays its DCP, board-committee cyber-oversight structure, materiality-protocol time-box, named officers (head of disclosure, securities counsel, CISO, CFO), and prior-year Item 106 disclosure via `references/firm-overlay.md` (not committed in this repo). The firm overlay does not modify this source-anchors file. A consulting firm shipping a client overlay does the same thing under a separate overlay file.
