# Source anchors — sanctions-screening-qa

The named, dated regulatory sources this skill anchors to. SKILL.md cites this file by path and does not restate excerpts. Sector-specific and cross-cutting anchors live in the corresponding overlay files. OFAC list citations carry a date-as-of every time they appear in a workproduct; lists move.

## Primary frame — OFAC sanctions compliance

- **A Framework for OFAC Compliance Commitments** (OFAC, May 2, 2019), the five-components section. The framework articulates the five components OFAC expects in a sanctions compliance program: management commitment, risk assessment, internal controls, testing and auditing, and training. The QA aligns its findings to these components. https://ofac.treasury.gov/media/16331/download?inline [verify section / current URL on the date of analysis].

- **OFAC Revised Guidance on Entities Owned by Persons Whose Property and Interests in Property Are Blocked (50 Percent Rule)** (Office of Foreign Assets Control, August 13, 2014) [verify date]. Aggregate ownership at 50% or more by one or more blocked persons triggers blocking treatment for the entity, even where no single blocked person individually meets the threshold. The rule is the operative anchor for the program-level aggregation methodology the QA reads. https://ofac.treasury.gov/recent-actions/20140813 [verify section / current URL].

- **31 CFR Chapter V** — OFAC sanctions regulations [verify specific program citations as needed: 31 CFR Part 510 (DPRK), Part 535 (Iran legacy), Part 538 (Sudan), Part 542 (Syria), Part 544 (WMD proliferators), Part 560 (Iranian Transactions), Part 575 (Iraq legacy), Part 583 (Western Balkans), Part 584 (FSE), Part 587 (Russia harmful foreign activities), and others operative on the date of analysis]. The QA scopes the operative program(s) before applying any prohibition-specific logic. https://www.ecfr.gov/current/title-31/subtitle-B/chapter-V .

## OFAC lists and program pages

- **OFAC Specially Designated Nationals and Blocked Persons List (SDN List)** — primary blocking list across most OFAC programs; the QA reads identifier-record sections including Digital Currency Address records. https://ofac.treasury.gov/sanctions-programs-and-country-information [verify section / current URL]. Date-as-of every list citation in the QA artifact.

- **OFAC Sectoral Sanctions Identifications List (SSI List)** — non-blocking, directive-specific restrictions. Different prohibitions, different operational handling. The QA reads SSI handling distinct from SDN.

- **OFAC Foreign Sanctions Evaders List (FSE List)** — secondary-sanctions-style designations under E.O. 13608 (and parallel authorities); 31 CFR Part 584 implementing section. https://ofac.treasury.gov/sanctions-programs-and-country-information/foreign-sanctions-evaders-fse-list [verify section].

- **OFAC Non-SDN Communist Chinese Military Companies (NS-CMIC) and other restricted-securities lists** [verify current list set on the date of analysis]. Restriction-style handling, not blocking.

- **OFAC Recent Actions / enforcement releases** — pattern reference for evasion typologies and lessons-learned themes; the QA reads the settlement-release section for control-design lessons. https://ofac.treasury.gov/recent-actions [verify section]. The QA uses these as calibration; it does not name-drop institutions in narrative unless the institution is a public defendant in a finalized enforcement action with a published consent order.

## OFAC General Licenses and FAQs

- **OFAC General Licenses** — program- and counterparty-specific authorisations; cited by GL number and effective date in the operative section of each program. Where the program relies on a General License, the QA reads the operative GL by number and effective date. https://ofac.treasury.gov/sanctions-programs-and-country-information [verify section / general-license set on the date of analysis].

- **OFAC FAQs** — the operating interpretation OFAC publishes alongside the rules. FAQ numbers and dates are cited specifically; an FAQ rescinded or superseded carries no weight. https://ofac.treasury.gov/faqs .

## FFIEC examiner frame

- **FFIEC BSA/AML Examination Manual — Office of Foreign Assets Control section** [verify section anchor for the current online manual]. The examiner-facing detail on sanctions program elements: program scoping, list management and update governance, customer and transaction screening, alert investigation and disposition, escalation, blocking and rejecting reports, recordkeeping, training, and independent testing. The manual is the operative read for "what does a defensible sanctions program look like" in a US examination context. https://bsaaml.ffiec.gov/manual [verify section anchor].

## FinCEN-OFAC parallel anchors

- **FinCEN advisories that intersect sanctions evasion** — FinCEN and OFAC publish parallel advisories on shared typologies (virtual currency, ransomware, evasion tradecraft); the QA reads the typology-indicator section of the operative advisory. The QA cross-references the operative FinCEN advisory by name and date alongside the OFAC anchor. https://www.fincen.gov/resources/advisoriesbulletinsfact-sheets [verify section / specific advisory by date for the typology under review].

## Joint statements

- **Joint Interagency Revised Guidance on Model Risk Management** (OCC Bulletin 2026-13 / FRB SR 26-2 / FDIC FIL-15-2026, April 17, 2026). Supersedes SR 11-7 (April 4, 2011) and SR 21-8 (Interagency Statement on Model Risk Management for BSA/AML and OFAC Compliance, April 9, 2021). Where the alert was generated by a model (sanctions-screening tool, name-matching engine, blockchain-analytics tool), model-risk governance for that model sits adjacent to the screening QA; this skill does not re-do model-monitoring work (`aml-model-monitoring` does), but the QA notes whether the screening engine has model-risk coverage on file under the operative guidance. Caveats: the guidance is non-binding (does not set forth enforceable standards) and is "most relevant to banking organizations with over $30 billion in total assets"; generative AI and agentic AI models are explicitly out of scope (footnote 3 of the joint guidance text), so where the screening stack uses GenAI components, AI scope routes to NIST AI RMF / NIST AI 600-1 / EU AI Act rather than to the bulletin. https://occ.gov/news-issuances/bulletins/2026/bulletin-2026-13a.pdf ; https://www.federalreserve.gov/supervisionreg/srletters/SR2602.htm ; https://www.fdic.gov/news/financial-institution-letters/2026/agencies-revise-interagency-model-risk-management-guidance .

- **OCC / FRB / FDIC Joint Statement on Risk-Focused BSA/AML Supervision** (July 22, 2021) [verify section / URL]. Risk-focused supervisory framing. The QA reads sanctions-program depth with risk focus, not a uniform-depth pass on every alert. https://www.federalreserve.gov/newsevents/pressreleases/files/bcreg20210722a1.pdf [verify section].

## Plugin-level shared references

Also consult, when present in the plugin:

- `references/source-map.md` — plugin-wide named-source map.
- `references/policy-control-library.md` — plugin-wide policy-and-control library.
- `references/review-gates.md` — named human-review gates and confidence-label definitions.

## Firm overlays

A firm using this skill in production adds firm-specific detail in `references/firm-overlay.md`. The skill consumes that file when present. Firm overlays do not modify the public anchors above.
