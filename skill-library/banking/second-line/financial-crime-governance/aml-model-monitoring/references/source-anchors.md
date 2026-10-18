# Source anchors: aml-model-monitoring

Named, dated regulatory and supervisory sources the AML model-monitoring review anchors to. The SKILL.md body uses generic workflow language; specific section references and excerpts live here. Firm-specific anchors (internal model risk policy, AML governance committee charter, scenario inventory taxonomy, refresh-cycle policy) belong in `references/firm-overlay.md`.

`[verify section]` placeholders mark anchors where the precise paragraph or subsection still needs verification against the current edition.

## Model risk supervisory guidance — applied to AML transaction monitoring as a model

### Joint Interagency Revised Guidance on Model Risk Management — OCC Bulletin 2026-13 / FRB SR 26-2 / FDIC FIL-15-2026 (April 17, 2026)

Anchor: Section II (definitions, scope, threshold relevance for banking organizations over $30 billion in total assets); sections covering model identification and inventory, validation requirements, ongoing monitoring expectations, and governance. The joint guidance is one document issued through three agency channels with the same date, text, and signatories. It supersedes and replaces SR 11-7 / OCC Bulletin 2011-12 (Supervisory Guidance on Model Risk Management, April 4, 2011) and SR 21-8 (Interagency Statement on Model Risk Management for Bank Systems Supporting Bank Secrecy Act / Anti-Money Laundering Compliance, April 9, 2021). For AML transaction monitoring, the supersession of SR 21-8 is the consequential change: the bank-AML-specific prescription has been withdrawn and the general principles in the revised joint guidance now cover BSA/AML model use.

What this skill relies on: that AML transaction-monitoring systems sit inside the model-risk perimeter under the joint guidance's definition (a complex quantitative method, system, or approach that applies statistical, economic, or financial theories to process input data into quantitative estimates — AML scenarios, thresholds, segmentation, and tuning all qualify, while deterministic rule-based processes without statistical, economic, or financial theory are explicitly out of scope per Section II); that ongoing monitoring, effective challenge, and validation are program-level expectations; and that governance over scenario change, threshold change, and segmentation refresh requires documented review and challenge under the inventory and ongoing-monitoring expectations.

Caveats the memo carries:

- The joint guidance is non-binding (does not set forth enforceable standards or prescriptive requirements; non-compliance does not result in supervisory criticism per Section I, footnote 1) and is "expected to be most relevant to banking organizations with over $30 billion in total assets." Smaller institutions still draft against it as the prevailing supervisory expectation, but the memo records the relevance posture explicitly rather than asserting a uniform standard.
- Generative AI and agentic AI models are explicitly out of scope (footnote 3 of the joint guidance text). The principles cover only traditional statistical / quantitative models and non-generative, non-agentic AI models. Where the AML monitoring stack incorporates GenAI components (LLM-driven typology classification, agentic alert triage, RAG-enhanced narrative generation, embedding-based segmentation), AI scope routes to NIST AI RMF, NIST AI 600-1 GenAI Profile, and the EU AI Act for relevant exposure, not to the bulletin. The QA names the route explicitly rather than collapsing GenAI components into the model-risk frame.
- The joint guidance contains zero references to NIST AI RMF or NIST AI 600-1. NIST instruments are voluntary and non-bank-supervisory; the QA cites them as analogous principle reference where AI-system governance is the artifact's subject, not as the controlling federal model-risk standard.

Links:

- https://occ.gov/news-issuances/bulletins/2026/bulletin-2026-13a.pdf (OCC bulletin guidance text PDF)
- https://www.occ.treas.gov/news-issuances/bulletins/2026/bulletin-2026-13.html (OCC bulletin landing page)
- https://www.federalreserve.gov/supervisionreg/srletters/SR2602.htm (FRB SR 26-2)
- https://www.fdic.gov/news/financial-institution-letters/2026/agencies-revise-interagency-model-risk-management-guidance (FDIC FIL-15-2026)

### Superseded — SR 11-7 / OCC Bulletin 2011-12 and SR 21-8

Retained as a citation anchor only because legacy validation reports, prior-cycle memos, and pre-April-17-2026 examination evidence frequently reference these documents by name. Cite as superseded when reading historical evidence; do not cite as the operative current standard. SR 11-7 (https://www.federalreserve.gov/supervisionreg/srletters/sr1107.htm) covered model risk management generally; SR 21-8 (https://www.federalreserve.gov/supervisionreg/srletters/SR2108.htm) was the AML-specific interagency statement.

## BSA/AML examination expectations on transaction monitoring

### FFIEC BSA/AML Examination Manual — Suspicious Activity Reporting section

Anchor: Examination procedures covering automated transaction monitoring system expectations, rules / scenario coverage, alert generation, investigation, and SAR decisioning. [verify the precise sub-section anchor for transaction-monitoring system expectations within the SAR section of the current online manual edition.]

What this skill relies on: the examiner-facing expectation that the transaction-monitoring system covers products, services, customers, and geographies on a risk basis; that scenarios are designed and calibrated to the institution's risk profile; that the system is documented, validated, and reviewed; and that alert investigations and SAR decisions tie back to monitoring output.

Link: https://bsaaml.ffiec.gov/manual/AssessingComplianceWithBSARegulatoryRequirements/04

### FFIEC BSA/AML Examination Manual — BSA/AML Compliance Program section

Anchor: Risk-based BSA/AML compliance program expectations covering the BSA/AML risk assessment, internal controls, independent testing, BSA officer designation, and training. [verify section anchors.]

What this skill relies on: that the monitoring system's design and tuning flow from the BSA/AML risk assessment, and that independent testing and the BSA officer's program oversight cover the monitoring system.

Link: https://bsaaml.ffiec.gov/manual/

### FFIEC BSA/AML Examination Manual — Customer Due Diligence section

Anchor: CDD expectations including the expected-activity profile that the monitoring scenarios are calibrated against. [verify section anchors.]

What this skill relies on: the linkage between CDD-derived customer segmentation and monitoring scenario calibration; segmentation drift cannot be read in isolation from CDD posture.

Link: https://bsaaml.ffiec.gov/manual/

## Joint statements on innovation and risk-focused supervision

### FinCEN / Federal Banking Agencies Joint Statement on Innovation in BSA/AML Compliance (December 3, 2018)

Anchor: Joint statement issued by FinCEN, OCC, FRB, FDIC, and NCUA on innovative approaches to BSA/AML compliance.

What this skill relies on: the supervisory posture that institutions testing innovative approaches (machine-learning scenarios, network analytics, alternative segmentation) on top of an existing program will not be criticised for self-identified weaknesses surfaced during the test, provided the existing program continues to meet expectations. Relevant when the monitoring memo discusses pilots, parallel runs, or champion-challenger model comparisons.

Link: https://www.fincen.gov/news/news-releases/treasury-and-federal-banking-agencies-issue-joint-statement-encouraging

### OCC, FRB, FDIC, NCUA Joint Statement on Risk-Focused BSA/AML Supervision (July 22, 2021)

Anchor: Joint statement on risk-focused approach to BSA/AML examinations.

What this skill relies on: the supervisory expectation that the institution's BSA/AML risk assessment drives monitoring scope and tuning intensity, and that examination focus follows the institution's risk profile.

Link: https://www.fincen.gov/news/news-releases/agencies-issue-statement-bank-secrecy-actanti-money-laundering

## Adjacent sources used for pattern reference

### FinCEN typology advisories (general)

Anchor: FinCEN advisories documenting active typologies (ransomware, virtual-currency-enabled laundering, BEC, human trafficking, fentanyl, elder fraud, others). [verify specific advisory FIN-references and dates per typology when cited in the memo.]

What this skill relies on: that monitoring scenarios should reflect the typology landscape FinCEN has flagged, and that scenario coverage gaps against active advisories are findings.

Link: https://www.fincen.gov/resources/advisories

### Public AML transaction-monitoring enforcement actions and consent orders

Anchor: Public consent orders and civil-money-penalty assessments addressing transaction-monitoring deficiencies (data integrity, segmentation, scenario coverage, tuning evidence, validation). Used as pattern reference for what regulators have called material; never asserted as binding criteria for any other institution.

What this skill relies on: that recurring enforcement themes (segmentation refresh delays, BTL evidence absent, scenario coverage gaps against the institution's risk profile, change-governance gaps) are the same findings the QA looks for. Examples cited in memo narrative are anonymised; named institutions appear only where they are public defendants in a finalised action with a published consent order.

## Cross-cutting overlay — cyber typologies in transaction monitoring

When the scope flags the cyber cross-cutting overlay, the cross-cutting reference loads the OFAC and FinCEN ransomware advisories, the FinCEN virtual-currency-related guidance, and the relevant typology references. See `references/cross-cutting/cyber.md`.

## Sector overlays

Sector-specific anchors load from the corresponding `references/sector-overlays/<sector>.md` file when the scope names the sector. The banking and payments-fintech overlays carry the heaviest content; capital-markets and insurance carry narrow scope.
