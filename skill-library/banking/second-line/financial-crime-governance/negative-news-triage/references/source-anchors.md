# Source anchors — negative-news-triage

The named, dated regulatory and public-industry sources this skill anchors to. SKILL.md cites this file by path and does not restate excerpts. Sector-specific anchors live in the corresponding overlay files; the conduct anchor set lives in `references/cross-cutting/conduct.md`.

## Primary frame — ongoing CDD and adverse-information escalation

- **FinCEN Customer Due Diligence Requirements for Financial Institutions Final Rule** (81 FR 29397, May 11, 2016; compliance date May 11, 2018) [verify section]. Establishes the four pillars of CDD; the fourth pillar (ongoing monitoring to identify and report suspicious transactions and, on a risk basis, to maintain and update customer information) is the operative basis for treating adverse-media findings as a customer-information input that may trigger a refresh, an EDD upgrade, or a SAR-decision evidence input. https://www.federalregister.gov/documents/2016/05/11/2016-10567/customer-due-diligence-requirements-for-financial-institutions .

- **FFIEC BSA/AML Examination Manual — Customer Due Diligence section** [verify exact section anchor for the current online manual]. Examiner-facing detail on CDD program elements, ongoing monitoring scope, refresh expectations, and the use of adverse-information inputs in customer risk profile maintenance. The manual does not carry a stand-alone "adverse media" subsection in a single named anchor; the operative read is the CDD ongoing-monitoring expectations and the EDD-context expectations where adverse-information is a contextual driver. https://bsaaml.ffiec.gov/manual/AssessingComplianceWithBSARegulatoryRequirements/02 .

- **FFIEC BSA/AML Examination Manual — Enhanced Due Diligence sections (PEP, Private Banking, Correspondent)** [verify section anchors]. Examiner-facing detail on the EDD profiles where adverse media is a routine contextual driver. The triage routes to `edd-escalation-pack` against these frames where applicable. https://bsaaml.ffiec.gov/manual .

- **FFIEC BSA/AML Examination Manual — index** (entry point for section-anchor verification). https://bsaaml.ffiec.gov/manual .

## Joint statements

- **OCC / FRB / FDIC / NCUA Joint Statement on Risk-Focused BSA/AML Supervision** (July 22, 2021) [verify section]. Risk-focused supervision concentrates on areas of higher ML/TF risk. The triage applies risk focus to the materiality read; not every adverse-media hit warrants the same depth of investigation. https://www.federalreserve.gov/newsevents/pressreleases/files/bcreg20210722a1.pdf .

- **FinCEN / Federal Banking Agencies Joint Statement on Innovation in BSA/AML Compliance** (December 3, 2018) [verify section]. Acknowledges and supports innovation in CDD and ongoing monitoring, including in the use of public information and adverse-media tooling. The triage does not penalise documented, governed innovation in the adverse-media pipeline as long as the artifact evidences the identity-confidence and source-tier discipline. https://www.fincen.gov/news/news-releases/treasurys-financial-crimes-enforcement-network-and-federal-banking-agencies .

## Public industry reference

- **Wolfsberg Group guidance on adverse media / negative news screening** (most recent public version; [verify section] for the current edition's identity-confidence-and-source-tier sections). The cleanest public reference for the identity-confidence-then-source-reliability-then-materiality discipline at the heart of this skill. Wolfsberg is an industry standard authored by a global-bank consortium; it is not a regulator anchor and is not legally binding in any US examination context, but it is the reference examiners frequently cite as the public industry baseline for adverse-media program design and disposition. https://www.wolfsberg-group.org/ .

## Typology references — named public advisories used in the materiality read

The materiality read tags hits against named financial-crime typologies. Where a public advisory frames the typology, the triage cites the advisory by name and date in the per-hit record. Common references (verify the cited advisory against the date of analysis; FinCEN re-issues and supplements advisories on a rolling cadence):

- **FinCEN Advisory on Elder Financial Exploitation** (FIN-2022-A002, June 15, 2022) [verify section for the indicator list and current edition]. Typology indicators for elder financial exploitation. https://www.fincen.gov/resources/advisories .

- **FinCEN Advisory and Supplemental Advisory on Human Smuggling and Human Trafficking** (FIN-2014-A008 with later supplemental advisories) [verify section / advisory ID for the current edition]. Typology indicators for human trafficking and human smuggling. https://www.fincen.gov/resources/advisories .

- **FinCEN Advisory on Real-Estate-Sector Money Laundering** (where applicable to the customer's sector) [verify section / advisory ID and date]. Typology indicators for real-estate-sector laundering. https://www.fincen.gov/resources/advisories .

- **FinCEN Advisory on Ransomware and the Use of the Financial System to Facilitate Ransom Payments** (FIN-2021-A004, November 8, 2021, updating FIN-2020-A006) [verify section / advisory ID for the current edition]. Typology indicators for ransomware-adjacent activity and counterparty exposure. The intersection with sanctions evasion is also addressed in OFAC's ransomware advisory; the triage cites both where applicable. https://www.fincen.gov/resources/advisories .

- **FinCEN Advisory on Convertible Virtual Currency and Cybercrime Typologies** (FIN-2019-A003, May 9, 2019, with supplemental guidance) [verify section for the current edition]. Typology indicators for CVC-related schemes, mixers, and chain-hopping where adverse media surfaces a customer-counterparty exposure. https://www.fincen.gov/resources/advisories .

- **FinCEN Advisory on Trade-Based Money Laundering** [verify section / advisory ID and date]. Typology indicators for TBML where commercial-customer adverse media surfaces over-invoicing, phantom-shipping, or related patterns. https://www.fincen.gov/resources/advisories .

- **OFAC Sanctions Compliance Guidance — Virtual Currency Industry** (October 15, 2021) [verify section for the current edition]. Where adverse media surfaces a sanctions-evasion typology, the triage routes to `sanctions-screening-qa`; the OFAC CVC guidance is the source-of-record for the typology framing. https://ofac.treasury.gov/recent-actions/20211015 .

- **OFAC Updated Advisory on Potential Sanctions Risks for Facilitating Ransomware Payments** (September 21, 2021, updating the October 1, 2020 advisory) [verify section for the current edition]. Where ransomware adverse media surfaces a sanctions-exposure question, the triage cites the OFAC advisory and routes to `sanctions-screening-qa`. https://ofac.treasury.gov/recent-actions/20210921 .

## Ongoing-monitoring and refresh anchors (cross-references inside the BSA regime)

- **31 CFR §1020.210** (and parallels at §1022.210, §1023.210, §1024.210, §1025.210, §1026.210) [verify section] — AML program rules requiring procedures for identifying and reporting suspicious activity. The adverse-media triage's routing to `sar-decision-qa` is anchored here when the hit is evidence on an in-flight or recent alert decision. https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X .

- **31 CFR §1010.230** — beneficial-ownership requirements for legal-entity customers. Where adverse media implies undisclosed control, an ownership-prong inconsistency, or a beneficial-ownership change, the triage routes to `cdd-risk-review` for an event-driven refresh against this rule. https://www.law.cornell.edu/cfr/text/31/1010.230 .

- **31 CFR §1010.610** and **§1010.620** — enhanced due diligence for correspondent and private-banking accounts. Where adverse media implicates a customer in the foreign-correspondent or private-banking population, the triage routes to `edd-escalation-pack` against these rules. https://www.law.cornell.edu/cfr/text/31/1010.610 ; https://www.law.cornell.edu/cfr/text/31/1010.620 .

## Plugin-level shared references

Also consult, when present in the plugin:

- `references/source-map.md` — plugin-wide named-source map.
- `references/policy-control-library.md` — plugin-wide policy-and-control library.
- `references/review-gates.md` — named human-review gates and confidence-label definitions.

## Firm overlays

A firm using this skill in production adds firm-specific detail in `references/firm-overlay.md`: vendor-tier mappings (translating the firm's adverse-media vendor's reliability tags into the tier-1 / tier-2 / tier-3 source-class read), typology-library extensions (firm-specific typology tags beyond the public advisory list), named systems and owners (the case-management system the routing points into; the named role for relationship owner, EDD analyst, BSA officer, SAR review committee), and any firm-specific re-scan cadence the triage reads against. Firm overlays do not modify the public anchors above.
