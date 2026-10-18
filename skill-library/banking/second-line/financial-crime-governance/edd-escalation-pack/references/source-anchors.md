# Source anchors — edd-escalation-pack

The named, dated regulatory sources this skill anchors to. SKILL.md cites this file by path and does not restate excerpts. Sector-specific anchors live in the corresponding overlay files; the conduct cross-cutting overlay carries the conduct-side anchors.

## Primary frame — FFIEC manual sections that govern EDD scope

- **FFIEC BSA/AML Examination Manual — Politically Exposed Persons section** [verify section anchor for the current online manual]. Examiner-facing detail on PEP, family member, and close-associate scope; the expectation that the program identifies PEP status on a risk basis at onboarding and on ongoing review; the heightened scrutiny on senior foreign political figures; the reliance and limits of commercial PEP-screening tools. https://bsaaml.ffiec.gov/manual .

- **FFIEC BSA/AML Examination Manual — Private Banking Due Diligence Programs (Non-U.S. Persons) section** [verify section anchor]; reflects `31 CFR §1010.620`. Source-of-funds inquiry; ongoing scrutiny of activity for senior foreign political figures; account-opening and ongoing program elements. https://bsaaml.ffiec.gov/manual .

- **FFIEC BSA/AML Examination Manual — Correspondent Accounts (Foreign) section** [verify section anchor]; reflects `31 CFR §1010.610`. EDD elements for foreign-FI correspondent accounts: ownership, products and services offered to non-US persons, AML/CFT regime in the foreign FI's home country, public information on the foreign FI, nested-correspondent posture. https://bsaaml.ffiec.gov/manual .

- **FFIEC BSA/AML Examination Manual — Customer Due Diligence section** [verify exact section anchor]. Examiner-facing detail on CDD program elements that the EDD escalation builds on: customer risk profile development, expected-activity profile, ongoing monitoring scope, EDD upgrade criteria. https://bsaaml.ffiec.gov/manual/AssessingComplianceWithBSARegulatoryRequirements/02 .

## Operative regulatory rules

- **FinCEN Customer Due Diligence Requirements for Financial Institutions Final Rule** (81 FR 29397, May 11, 2016; compliance May 11, 2018) [verify section]. Establishes the four CDD pillars and the risk-based EDD where warranted on higher-risk customers; ongoing monitoring is a CDD pillar, and EDD-tier customers carry heightened ongoing-monitoring scope. https://www.federalregister.gov/documents/2016/05/11/2016-10567/customer-due-diligence-requirements-for-financial-institutions .

- **31 CFR §1010.230** — Beneficial ownership requirements for legal entity customers [verify section]. The control-prong and ownership-prong work that the EDD pack walks layer by layer. https://www.law.cornell.edu/cfr/text/31/1010.230 .

- **31 CFR §1010.620** — Due diligence programs for private-banking accounts [verify section]. Source-of-funds inquiry, scrutiny of activity for senior foreign political figures, and the program elements. https://www.law.cornell.edu/cfr/text/31/1010.620 .

- **31 CFR §1010.610** — Due diligence programs for correspondent accounts for foreign financial institutions [verify section]. Risk assessment framework, EDD elements (ownership, products and services offered to non-US persons, AML/CFT regime in the foreign FI's home country, public information on the foreign FI), and the foreign-bank-account due-diligence program. https://www.law.cornell.edu/cfr/text/31/1010.610 .

- **31 USC §5318(i)** — Statutory underpinning for `§1010.610` and `§1010.620` (Section 312 of the USA PATRIOT Act) [verify section]. Codifies the EDD obligation on private-banking and foreign-correspondent accounts. https://www.law.cornell.edu/uscode/text/31/5318 .

- **31 USC §5318A** — Special measures for jurisdictions, financial institutions, or international transactions of primary money-laundering concern (Section 311 of the USA PATRIOT Act) [verify section]. Where a Section 311 designation is in scope for a customer, the EDD frame interacts with the special measures the designation imposes. https://www.law.cornell.edu/uscode/text/31/5318A .

- **31 CFR §1010.380** — Beneficial Ownership Information Reporting Rule (CTA implementing rule) [verify current effectiveness and entity-class scope as of the date of analysis]. The Corporate Transparency Act's implementing rule has live litigation history (NSBA v. Yellen district-court ruling and subsequent appellate posture; Texas Top Cop Shop nationwide-injunction posture and subsequent stays) and the entity-class scope has been the subject of FinCEN interim final rulemaking. The pack marks `boi_filing_status` as `required`, `not_required`, `unknown`, or carries the `[verify]` flag with the as-of date and the rule-state read on that date. https://www.fincen.gov/boi .

## FinCEN advisories and risk-pattern guidance

- **FinCEN Advisory on Politically Exposed Persons** [verify section / advisory ID and date; FinCEN has issued and updated PEP-related guidance over time, and the current effective version should be dated in the workproduct]. Risk-pattern guidance the EDD pack consults for indicators on PEP and PEP-adjacent customer activity. https://www.fincen.gov .

- **Joint Statement by Treasury, Federal Banking Agencies, and FinCEN on Banking Politically Exposed Persons** (August 21, 2020) [verify section / URL]. Clarifies that there is no regulatory requirement to apply EDD to all PEPs solely because of their PEP status; firms apply EDD on a risk basis. The pack reflects this framing and avoids treating PEP status as automatically EDD-required. https://www.fincen.gov/news/news-releases/joint-statement-bank-secrecy-actdue-diligence-requirements-customers-who-may .

## Joint statements

- **OCC / FRB / FDIC / NCUA Joint Statement on Risk-Focused BSA/AML Supervision** (July 22, 2021) [verify section / URL]. Risk-focused supervision concentrates on areas of higher ML/TF risk; the EDD pack reads file depth on the risk-focused basis, not as a uniform-depth pass. https://www.federalreserve.gov/newsevents/pressreleases/files/bcreg20210722a1.pdf .

## Public industry standard reference (not a regulator)

- **Wolfsberg Group Guidance on Politically Exposed Persons** (most recent public version) [verify section / date]. Industry standard on PEP definition, sub-categories (head of state, senior politician, family / close associate), and risk-tiering of PEP profiles. Used as a public industry reference, not as a regulator anchor. https://www.wolfsberg-principles.com/ .

- **Wolfsberg Group Guidance on Source of Wealth and Source of Funds** (most recent public version) [verify section / date]. Industry standard on the SoW vs SoF distinction, corroboration expectations, and refresh posture. Public industry reference, not a regulator anchor. https://www.wolfsberg-principles.com/ .

- **Wolfsberg Correspondent Banking Due Diligence Questionnaire (CBDDQ)** (most recent public version) [verify section / date]. Industry-standard questionnaire structure for foreign-FI correspondent due diligence. Public industry reference, not a regulator anchor. https://www.wolfsberg-principles.com/ .

## Plugin-level shared references

Also consult, when present in the plugin:

- `references/source-map.md` — plugin-wide named-source map.
- `references/policy-control-library.md` — plugin-wide policy-and-control library.
- `references/review-gates.md` — named human-review gates and confidence-label definitions.

## Firm overlays

A firm using this skill in production adds firm-specific detail in `references/firm-overlay.md`. The skill consumes that file when present. Firm overlays do not modify the public anchors above.
