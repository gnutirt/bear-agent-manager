# Banking sector overlay for management-response

When the scope record names `banking` for a management-response engagement, this overlay sets banking-supervisor-shaped conventions for the response artifact. Banking is the primary case for this skill; the formal-letter conventions and the supervisory-severity-ladder defaults are tightest here.

Loaded by: `management-response/SKILL.md` when `scope.sector_overlay_set` includes `banking`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- FRB SR 13-13 (Supervisory Considerations for the Communication of Supervisory Findings, June 2013) — the principal federal-banking-agency framework for the MRA / MRIA distinction and the management-response posture the FRB expects.
- OCC Comptroller's Handbook Bank Supervision Process booklet — the OCC's operative framework for routine findings communication and corrective actions; PPM 5310-3 (enforcement actions) applies once a matter has escalated beyond routine supervision.
- FDIC Risk Management Manual of Examination Policies — the FDIC's framework for examination findings and Matters Requiring Board Attention.
- 12 CFR Part 30 Appendix D (OCC Heightened Standards) — for OCC-supervised covered banks, the framework binding on the response (board oversight; risk governance framework). The published Appendix uses lettered Roman-numeral headings without the III.B-style sub-numbering colloquially used.
- FRB SR 12-17 (Consolidated Supervision Framework for Large Financial Institutions, December 2012) and SR 19-3 (LFI rating system) — for BHCs above thresholds, the consolidated supervision framework that contextualises the response.
- Federal banking agencies' interagency guidance on third-party risk management (June 2023) — frequent subject of supervisory findings.
- BCBS principles for sound management of operational risk (revised March 2021) — for operational-risk findings, the prudential framework the response references.

## What changes for banking-flagged management responses

### 1. Severity ladder defaults

The banking-supervision frame distinguishes Matters Requiring Attention from Matters Requiring Immediate Attention. The skill applies tier-specific defaults the responding role can adjust:

- **MRIA**: monthly written progress reports to the supervisory office until closure; firm-level signatory typically the CEO or General Counsel (in addition to the CRO or process-owner responding role); board-level attention required (the response is read at the next risk committee or audit committee meeting, with the chair acknowledging receipt); compressed action-plan envelope (typically 6 to 12 months, with shorter envelopes for specific MRIAs the supervisor flags as urgent); evidence-of-effectiveness method usually includes a supervisor walk-through in addition to control-test or KRI-trend evidence.
- **MRA**: quarterly written progress reports; firm-level signatory typically the CRO or process-owner responding role; risk committee notification rather than board-level attention required (depending on materiality); action-plan envelope typically 12 to 18 months; evidence-of-effectiveness method usually two consecutive quarters at GREEN on the relevant KRI or two consecutive quarterly control-test passes.
- **Matters Requiring Board Attention** (FDIC equivalent of MRA in many examination contexts): cadence and signatory follow the FDIC examination team's specification in the report of examination; defaults follow the MRA convention above.

Defaults are starting points, not constraints; the supervisory team's specification in the finding communication overrides the default.

### 2. Addressee conventions

- **FRB findings**: addressee is the supervisory office identified in the SR-13-13-conformant communication (e.g., the relevant Reserve Bank or the Board's Division of Supervision and Regulation for Board-supervised entities). The response form follows formal supervisory-letter convention.
- **OCC findings**: addressee is the OCC supervisory office identified in the supervisory-letter communication (typically the assigned examiner-in-charge or the supervisory-office director). The response form follows the OCC's letter convention; for Heightened Standards-covered banks the response may also need to be acknowledged at the risk committee under the heightened-standards board-oversight expectations.
- **FDIC findings**: addressee is the FDIC regional office or the examiner-in-charge identified in the report of examination; the response is appended to the report.

### 3. Linkage to 12 CFR Part 30 Appendix D for Heightened Standards-covered banks

For OCC-supervised banks above the Heightened Standards threshold (currently $50 billion average total consolidated assets), the response carries explicit linkage to:

- Risk Governance Framework — the response acknowledges where the finding implicates a deficiency in the framework and what change to the framework is committed.
- Risk Appetite Statement — where the finding implicates a RAS metric or a RAS limit, the response identifies any RAS recalibration request and links to the risk committee pack section.
- Roles and Responsibilities — the response identifies the responsible role at front-line, independent risk management, or internal audit.

This linkage is typically required for MRAs and MRIAs that hit Heightened Standards-covered topics; for more routine findings it is best-practice rather than required. Citations live in `references/source-anchors.md`.

### 4. Linkage to LFI ratings and BHC supervision

For FRB-supervised BHCs above the LFI rating system thresholds (SR 19-3), the response is read in the context of the firm's LFI rating and may itself contribute to subsequent rating decisions. The response carries explicit linkage to:

- The firm's most recent LFI rating components (Capital Planning and Positions; Liquidity Risk Management and Positions; Governance and Controls).
- The supervisory cycle phase (continuous monitoring vs. target examination vs. horizontal review).

For firms below the LFI thresholds (community-banking and smaller-regional supervision), the rating reference is to the CAMELS components.

### 5. Concentration with the Annual Review Letter and the supervisory cycle

FRB and OCC findings are typically communicated in or alongside the annual review letter or supervisory communications at the close of an examination cycle. The response is read alongside the firm's other open findings; the response template carries explicit linkage to other open findings sharing root cause or remediation actions (`linked_finding_ids`). Concentration of root cause across multiple findings (for example, a recurring data-quality root cause showing in third-party, model, and BSA/AML findings) is itself a topic the supervisor will press on; the response surfaces this concentration where it exists.

### 6. Cross-link to other capability skills

- Underlying issue write-up: `risk-compliance-core/skills/issue-writeup`.
- Standing committee pack carrying the finding ageing across the open population: `risk-reporting/skills/risk-committee-pack` (issues-and-remediation-status section).
- BCBS 239 self-assessment for data-quality findings: `risk-reporting/skills/bcbs239-gap-assessment`.
- Third-party remediation: `third-party-operational-resilience/skills/contract-gap-review` and `third-party-operational-resilience/skills/concentration-risk-review`.
- Operational-resilience remediation: `third-party-operational-resilience/skills/criticality-assessment` (important-business-service mapping) and `third-party-operational-resilience/skills/resilience-testing-pack`.

## Banking-specific output additions

Added to the response (mapped to schema where present):

- `addressee.addressee_name` — banking convention names the supervisory office and the regulator (e.g., "FRB-Supervised Office, Federal Reserve Bank of [district]"; "OCC Supervisory Office, [district]"; "FDIC Regional Office, [region]"). Personal names are not used.
- `reporting_cadence.frequency` — defaults to monthly for MRIA, quarterly for MRA / MRBA per the severity-ladder defaults above.
- `firm_level_signatory_role` — populated for MRIAs (typically CEO or General Counsel); optional for MRAs.
- `linked_finding_ids` — banking responses commonly cross-link to other open findings sharing root cause; the response surfaces concentration explicitly.
- `evidence_of_effectiveness_plan.evidence_method` — for MRIAs, typically includes a supervisor walk-through in addition to control-test or KRI-trend evidence.

## Common pitfalls in banking-flagged management responses

- Treating MRA and MRIA as the same. MRIA carries a more rapid response expectation, board-level attention, a more senior signatory, and a tighter reporting cadence; the response defaults must reflect this.
- Addressee block missing the supervisory office. "FRB" or "OCC" alone is insufficient; the supervisory office and the regulator together are the convention.
- Heightened Standards linkage missing on Heightened-Standards-covered banks. For findings that implicate the risk governance framework, the RAS, or roles and responsibilities, the response must surface the linkage explicitly.
- LFI rating linkage missing on LFI-rated BHCs. For findings that may affect the next LFI rating cycle, the response acknowledges the rating context.
- Concentration of root cause across multiple findings ignored. Where a recurring root cause shows in multiple open findings, the response surfaces this concentration; treating each finding in isolation invites the supervisor to point out the pattern.
- Personal names in the addressee or signatory blocks. Banking convention is roles, not personal names; personnel rotate, and the response may be filed and read months or years later.
