# Insurance sector overlay for risk-committee-pack

When the scope record names sector `insurance`, this overlay adds insurance-specific structure and content expectations to the committee pack so the artifact a state DOI examiner reviews reads as ORSA-aligned. Where there is conflict between the capability defaults and this overlay, the overlay governs the insurance-sector elements.

Loaded by: `risk-committee-pack/SKILL.md` when `scope.sector_overlay_set` includes `insurance`, or when the institution type implicates a state DOI (life and health insurer, P&C insurer, fraternal benefit society, captive, surplus lines insurer, reinsurer with US operations).

## Source basis

Cited and section-referenced in `references/source-anchors.md`. This overlay names the regulators and sources without restating excerpts.

## What changes for insurance committee packs

### 1. Pack architecture maps to the ORSA Summary Report

NAIC Risk Management and Own Risk and Solvency Assessment Model Act (#505) requires in-scope insurers to file an annual ORSA Summary Report with their lead state regulator, organized in three sections: Section 1 (Description of the Insurer's Risk Management Framework), Section 2 (Insurer's Assessment of Risk Exposure), Section 3 (Group Risk Capital and Prospective Solvency Assessment). The committee pack is the principal supporting document for Sections 1 and 2 and an input to Section 3.

Section-by-section mapping:

- ORSA Section 1 (Risk Management Framework) consumes: pack risk-governance-framework brief, three-lines-of-defense maturity, RAS overview, framework changes in the period.
- ORSA Section 2 (Risk Exposure Assessment) consumes: pack heat map, top risks, material risk events, KRI movement and breaches, RAS status, scenario commentary including normal and stressed conditions.
- ORSA Section 3 (Group Risk Capital and Prospective Solvency Assessment) consumes: pack capital and prospective-solvency commentary; deeper actuarial analysis lives outside the pack.

### 2. Insurance risk taxonomy adds carrier-specific categories

The heat map for insurers covers, at minimum: pricing and underwriting risk; reserving risk (life, health, P&C as applicable); reinsurance and credit risk (counterparty exposure on ceded business); market and ALM risk (interest rate, equity, spread, FX); insurance operational risk including outsourced functions; compliance risk; financial-crime risk; cyber risk per NAIC Insurance Data Security Model Law (Model #668); strategic risk; reputational risk. AI risk is added per NAIC Bulletin Use of Artificial Intelligence Systems by Insurers (December 2023) where the carrier has material AI use cases. Climate risk is mapped under strategic unless the carrier reports under a regime requiring a standalone cell (e.g., EU CSRD parent-group consolidation).

Health insurers add medical-loss-ratio risk and benefit-design risk. Life insurers add longevity, mortality, and lapse risk. P&C insurers add catastrophe risk and casualty-development risk. The overlay does not enumerate every line-of-business breakdown; the firm's risk taxonomy drives the rows.

### 3. Stress and prospective-solvency narrative is required

ORSA Section 2 expects forward-looking stress and capital-adequacy commentary under both normal and stressed conditions. The pack's Forward-Looking Commentary section carries:

- Scenario inventory used (own scenarios, NAIC catastrophe scenarios where applicable, regulator-prescribed scenarios for life insurers under principle-based reserving, climate scenarios where in scope).
- Result summary per scenario with breach flags against capital, liquidity, and risk-appetite metrics.
- Narrative on prospective solvency including capital actions contemplated or executed in the period.
- Ladder to ORSA Section 3 actuarial analysis (the pack does not duplicate the actuarial work).

### 4. NAIC Corporate Governance Annual Disclosure cross-walk

NAIC Corporate Governance Annual Disclosure Model Act (#305) requires in-scope insurers to file annual governance disclosure with the lead state regulator. The committee pack frequently supports the CGAD filing as evidence of board-level risk oversight. The pack carries:

- Risk committee charter reference and current composition.
- Standing committee cadence and special-meeting count for the period.
- Key-person dependencies in the risk-governance framework (CRO, chief actuary, head of risk reporting, head of internal audit) and any vacancies.
- Self-assessment posture: most carriers refresh CGAD content annually; the committee pack supports the annual cycle.

Verify Model #305 state adoption status for the carrier's lead state at pack-write time.

### 5. State DOI variation and lead-state framework

ORSA filing posture varies by state: some receive ORSA in narrative form, others receive it as an attachment to other filings, others have additional reporting demands (e.g., NY DFS Regulation 203 ERM reporting for in-scope NY-licensed entities). The committee pack flags the lead-state framework and any non-lead-state-specific demands the pack supports.

### 6. AI risk content per NAIC Bulletin December 2023

For carriers with material AI use cases (accelerated underwriting, claims AI, marketing AI, agent / producer AI co-pilots), the pack carries a brief on:

- AIS Program element-by-element status: governance, risk management, testing and validation, third-party AI accountability, data practices, monitoring, transparency, fairness.
- Material AI use cases by tier with named owner.
- AI-related risk events in the period (model performance breach, vendor change-of-version, fairness-test exception, consumer-disclosure complaint).
- Cross-link to the AI-specific committee pack: `ai-governance-model-risk/skills/board-ai-risk-pack`.

### 7. TPA / claims-administrator and outsourced-function exposure

For carriers with material outsourced functions (TPA, MGA, MGU, claims administrator, IT outsourcer, AI vendor, ECDIS data provider), the pack's third-party section carries the concentration view across these vendor types. NAIC Insurance Data Security Model Law §4.F third-party-service-provider obligations sit alongside the committee's third-party-risk-management oversight; the pack flags any §4.F gap that surfaced in the period.

Cross-link to insurance vendor-diligence overlays where present.

### 8. Cross-link to other capability skills

- KRI commentary for individual RAG-breached metrics: `risk-reporting/skills/kri-commentary`.
- Open-issue write-ups beyond the standing aging summary: `risk-compliance-core/skills/issue-writeup`.
- AI-specific committee pack for material AI use cases: `ai-governance-model-risk/skills/board-ai-risk-pack`.
- Cyber-disclosure-decision content for material cyber events: `risk-reporting/skills/cyber-disclosure-readiness`.

## Insurance-specific output template additions

Added to the pack (mapped to schema where present):

- `pack_metadata.lead_state_regulator` — state insurance department serving as lead-state regulator for the group.
- `pack_metadata.orsa_filer` — boolean, true for #505-in-scope insurers.
- `pack_metadata.cgad_filer` — boolean, true for #305-adopted-state-licensed insurers.
- `pack_metadata.business_lines` — array of LOBs (life, health, P&C, reinsurance, fraternal, surplus-lines, captive).
- `heat_map[]` — insurance-taxonomy rows (pricing/underwriting, reserving, reinsurance/credit, market/ALM, insurance operational, compliance, financial crime, cyber, AI where applicable, strategic, reputational).
- `forward_looking.scenario_results[]` — scenario inventory required; normal and stressed conditions both required for ORSA-filer packs.
- `orsa_section_map` — object mapping pack sections to ORSA Summary Report sections (1, 2, 3) for #505-in-scope insurers.
- `cgad_section_map` — object mapping pack sections to CGAD content for #305-adopted-state-licensed insurers.
- `ais_program_status` — object with element-by-element status for carriers with material AI use cases.

## Common pitfalls in insurance committee packs

- Treating ORSA as the carrier's annual-cycle artifact and the committee pack as separate. The committee pack is the principal supporting document for ORSA Sections 1 and 2; the two should not contradict each other.
- Carrying generic enterprise risk taxonomy without insurance-specific categories (pricing/underwriting, reserving, reinsurance/credit). Examiners read for these by name.
- Reporting AI risk as a footnote when the carrier has material AI use cases. NAIC Bulletin December 2023 expects AIS Program status; committee-level visibility is part of the program.
- Treating the TPA's controls as out of scope. Under NAIC #668 §4.F the carrier remains accountable for the TPA's controls on the carrier's policies; the pack flags TPA-related gaps as carrier issues.
- Catastrophe-risk commentary in P&C packs that reports modeled PML without the assumption set and the validation status of the model. Examiners probe both.
- Climate as a standalone appendix rather than mapped into the risk taxonomy. The climate cross-cutting overlay covers placement and content.
- Reporting CGAD elements only annually when the underlying governance posture has changed in the period. Material changes (CRO turnover, framework restructure, new committee charter) belong in the standing pack.
