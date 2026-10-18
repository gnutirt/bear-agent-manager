# Source anchors — cdd-risk-review

The named, dated regulatory sources this skill anchors to. SKILL.md cites this file by path and does not restate excerpts. Sector-specific anchors live in the corresponding overlay files.

## Primary frame — CDD Final Rule and the four pillars

- **FinCEN Customer Due Diligence Requirements for Financial Institutions Final Rule** (81 FR 29397, May 11, 2016; compliance date May 11, 2018) [verify section]. Establishes the four pillars of CDD: customer identification and verification (CIP); identification and verification of beneficial owners of legal entity customers; understanding the nature and purpose of the customer relationship to develop a customer risk profile; and ongoing monitoring to identify and report suspicious transactions and, on a risk basis, to maintain and update customer information. The QA reads each pillar separately. https://www.federalregister.gov/documents/2016/05/11/2016-10567/customer-due-diligence-requirements-for-financial-institutions . **FinCEN Order FIN-2026-R001 (February 13, 2026) — exceptive relief from the requirement to identify and verify beneficial owners at each new account opening for an existing legal-entity customer.** Verification required only at first account opening, when the FI has knowledge of facts that call into question previously-obtained BOI, or as needed under risk-based ongoing CDD. Election is voluntary. https://www.fincen.gov/news/news-releases/fincen-issues-exceptive-relief-streamline-customer-due-diligence-requirements .

- **FFIEC BSA/AML Examination Manual — Customer Due Diligence section** [verify exact section anchor for the current online manual]. Examiner-facing detail on CDD program elements: customer risk profile development, expected-activity profile, ongoing monitoring scope, refresh expectations, and EDD upgrade criteria. The manual is the operative read for "what does a defensible CDD file look like" in a US examination context. https://bsaaml.ffiec.gov/manual/AssessingComplianceWithBSARegulatoryRequirements/02 .

- **FFIEC BSA/AML Examination Manual — Beneficial Ownership Requirements for Legal Entity Customers section** [verify section anchor]. Examiner-facing detail on the beneficial-ownership pillar specifically: control prong, ownership prong, certification reliance, exempt entities, and refresh expectations on a risk basis. https://bsaaml.ffiec.gov/manual .

## Beneficial ownership — operative rules

- **31 CFR §1010.230** — Beneficial ownership requirements for legal entity customers. The regulatory text behind the CDD Final Rule's beneficial-ownership pillar: control-prong individual, ownership-prong individual(s) at the 25% threshold, the certification form mechanism, the legal-entity-customer scope, and the rule's exemption list (publicly traded companies, certain regulated entities, certain pooled investment vehicles, others as listed). https://www.law.cornell.edu/cfr/text/31/1010.230 .

- **FinCEN Beneficial Ownership Information Reporting Rule** (CTA implementing rule, codified at 31 CFR §1010.380). **FinCEN Interim Final Rule (March 26, 2025; 90 FR 13688) revises "reporting company" to include only foreign entities formed under foreign law and registered to do business in the US; US-formed entities and US persons are exempt from BOI reporting.** As of this date the rule is interim final and pending finalization. Foreign entities registered before publication had 30 days to file; entities registered on or after have 30 calendar days from registration. Verify rule-state on engagement date — the BOI history is volatile (NSBA v. Yellen, Texas Top Cop Shop, and subsequent rulemaking shifts). The QA marks `boi_filing_status` as `required`, `not_required`, `unknown`, or carries the `[verify]` flag explicitly with the as-of date. https://www.fincen.gov/boi ; https://www.federalregister.gov/documents/2025/03/26/2025-05199/beneficial-ownership-information-reporting-requirement-revision-and-deadline-extension .

## Customer Identification Program — operative rules per institution type

- **31 CFR §1020.220** — CIP for banks [verify section]. Identifying-information collection (legal name, date of birth, address, identification number); verification by documentary or non-documentary methods or both; recordkeeping and retention; comparison against government lists. https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1020/subpart-B/section-1020.220 .

- **31 CFR §1023.220** — CIP for broker-dealers [verify section]. Parallel CIP rule. https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1023 .

- **31 CFR §1024.220** — CIP for mutual funds [verify section]. https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1024 .

- **31 CFR §1025.220** — CIP for insurance companies [verify section]. Covered products only; see `§1025.210` for the covered-product scope. https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1025 .

- **31 CFR §1026.220** — CIP for futures commission merchants and introducing brokers in commodities [verify section]. https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1026 .

- **31 CFR §1022.210** and the MSB rule set [verify exact CIP and CDD anchors for MSBs; the MSB AML program rule sits at `§1022.210` while MSBs are not subject to a stand-alone CIP rule of the §1020.220 form]. The QA reads against the MSB AML program rule and the institution's CIP-equivalent program. https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1022 .

## Enhanced due diligence — operative rules

- **31 CFR §1010.610** — Enhanced due diligence for correspondent accounts for foreign financial institutions [verify section]. Risk assessment framework, EDD elements (ownership, products and services offered to non-US persons, AML/CFT regime in the foreign FI's home country, public information on the foreign FI), and the foreign-bank-account due diligence program. https://www.law.cornell.edu/cfr/text/31/1010.610 .

- **31 CFR §1010.620** — Enhanced due diligence for private-banking accounts [verify section]. Source-of-funds inquiry, scrutiny of activity for senior foreign political figures, and the program elements. https://www.law.cornell.edu/cfr/text/31/1010.620 .

## Investment-adviser AML — operative rule

- **FinCEN Anti-Money Laundering / Countering the Financing of Terrorism Programs and Suspicious Activity Reports for Registered Investment Advisers and Exempt Reporting Advisers** (Final Rule, August 28, 2024). **IA AML Rule effective date delayed to January 1, 2028 (FinCEN final rule January 2, 2026; 91 FR 14) — superseding the original January 1, 2026 effective date.** Until the effective date, AML/CFT program and SAR-filing obligations under the rule are not enforceable against RIAs / ERAs. Brings covered investment advisers within the BSA regime when operative; the CDD Final Rule and the beneficial-ownership rule extend to covered advisers under the rule's scope and timing. https://www.fincen.gov/news/news-releases/fincen-issues-final-rule-postpone-effective-date-investment-adviser-rule-2028 .

## Joint statements

- **OCC / FRB / FDIC / NCUA Joint Statement on Risk-Focused BSA/AML Supervision** (July 22, 2021) [verify section / URL]. Risk-focused supervision concentrates on areas of higher ML/TF risk; the QA reads file depth with risk focus, not a uniform-depth pass on every customer. https://www.federalreserve.gov/newsevents/pressreleases/files/bcreg20210722a1.pdf .

- **FinCEN / Federal Banking Agencies Joint Statement on Innovation in BSA/AML Compliance** (December 3, 2018) [verify section]. Acknowledges and supports innovation in CDD and ongoing monitoring; the QA does not penalise documented, governed innovation in the CDD or refresh pipeline as long as the file evidences the four-pillar work. https://www.fincen.gov/news/news-releases/treasurys-financial-crimes-enforcement-network-and-federal-banking-agencies .

## Plugin-level shared references

Also consult, when present in the plugin:

- `references/source-map.md` — plugin-wide named-source map.
- `references/policy-control-library.md` — plugin-wide policy-and-control library.
- `references/review-gates.md` — named human-review gates and confidence-label definitions.

## Firm overlays

A firm using this skill in production adds firm-specific detail in `references/firm-overlay.md`. The skill consumes that file when present. Firm overlays do not modify the public anchors above.
