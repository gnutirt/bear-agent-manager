# Climate cross-cutting overlay for risk-committee-pack

When the scope record flags `climate` for the committee pack, this overlay sets the climate-risk content for named pack sections. Climate is in scope for the committee pack when the firm reports under the SEC Climate Disclosure Rule (where current effectiveness applies), under EU CSRD as a non-US group company or US subsidiary of an EU-headquartered group, under voluntary TCFD-aligned disclosure, or where the firm's risk taxonomy includes climate as an enterprise risk type.

Loaded by: `risk-committee-pack/SKILL.md` when `scope.cross_cutting_set` includes `climate`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- SEC Climate Disclosure Rule (Release Nos. 33-11275, 34-99678, final March 6, 2024), Items 1500-1507 of Regulation S-K and Article 14 of Regulation S-X. Verify current effectiveness at pack-write time; the rule has been subject to legal challenges and SEC stay actions, with consolidated litigation in the Eighth Circuit.
- TCFD: "Recommendations of the Task Force on Climate-related Financial Disclosures" (Final Report, June 2017) and "Implementing the Recommendations of the Task Force on Climate-related Financial Disclosures" (October 2021). Pillars: Governance, Strategy, Risk Management, Metrics and Targets. The FSB disbanded the TCFD in October 2023; the recommendations remain the working frame and underpin ISSB IFRS S2.
- IFRS S2 Climate-related Disclosures (June 2023) for firms reporting under ISSB-aligned regimes.
- NGFS Climate Scenarios (current vintage): used by US, UK, EU, and other supervisors for climate scenario analysis. Reference scenarios include Net Zero 2050, Below 2 Degrees, Delayed Transition, Current Policies, Fragmented World.
- FSB SCEAS (Supervisory and Climate-related Exercises and Analytical Studies, 2022) for the supervisory landscape.
- Federal Reserve Pilot Climate Scenario Analysis (2023-2024) for the six largest US BHCs as a supervisory reference.
- Sector-specific climate frames where applicable: NAIC Climate Risk Disclosure Survey (TCFD-aligned, mandatory in 15 US states for in-scope insurers); NYDFS Industry Letter on Climate-Related Financial Risks for state-regulated insurers and banks; PRA SS3/19 (Enhancing banks' and insurers' approaches to managing the financial risks from climate change) for UK-regulated entities.

## What changes for climate-flagged committee packs

### 1. Heat-map placement and rationale

Climate is reported either as a standalone heat-map cell or mapped under strategic with documented rationale. The choice depends on the firm's risk taxonomy and reporting regime:

- **Standalone cell**: typical for firms reporting under the SEC climate rule (where current effectiveness applies), under EU CSRD parent-group consolidation, or where the firm has elected a top-of-house climate-risk view. The cell carries current rating, prior rating, direction, and a commentary that distinguishes physical risk and transition risk.
- **Mapped under strategic**: typical for firms in the early stages of climate-risk integration, for firms with limited material exposure (after assessment), or for firms where the materiality posture is documented under the firm's enterprise risk framework. The strategic-cell commentary names the climate component explicitly.

The choice is documented in the heat-map commentary; the climate cross-cutting overlay rejects floating-appendix climate treatment that sits outside the risk taxonomy.

### 2. Climate-section content

For climate-flagged packs, the dedicated climate section carries:

- **Governance subsection**: board-committee oversight of climate-related risk; management responsibility (typically the CRO with the chief sustainability officer or equivalent as accountable executive); committee cadence on climate items; integration with the firm's risk-governance framework. Maps to TCFD Governance pillar; for SEC-rule-in-scope firms, supports Item 1501 of Regulation S-K.
- **Strategy subsection**: identification of climate-related risks (physical risk: acute and chronic; transition risk: policy, technology, market, reputation) and opportunities relevant to the firm's businesses, strategy, and financial planning over the short, medium, and long term. Resilience of the firm's strategy under different climate scenarios. Maps to TCFD Strategy pillar.
- **Risk management subsection**: how climate-related risk is identified, assessed, prioritized, and managed; integration into the enterprise risk-management framework. Material risk events in the period that have a climate component (severe weather impact on operations or counterparties; transition-policy event affecting a material exposure). Maps to TCFD Risk Management pillar.
- **Metrics and targets subsection**: climate-related metrics used to assess and manage risk (financed emissions for banks and asset managers; underwriting-portfolio emissions for insurers; physical-risk exposure metrics; transition-risk exposure by sector). Climate-related targets and progress against them. For SEC-rule-in-scope firms, Scope 1 and Scope 2 emissions disclosure status; financial-statement-level climate disclosure status under Article 14 of Regulation S-X.

### 3. Scenario analysis

Scenario analysis is a recurring committee item for firms with material climate exposure. The pack carries:

- Scenario inventory used in the period (NGFS Net Zero 2050, NGFS Delayed Transition, NGFS Below 2 Degrees, FRB pilot scenarios for in-scope BHCs, IAIS scenarios for insurers, internal scenarios calibrated for firm-specific exposures).
- Result summary per scenario with breach flags against capital, liquidity, risk-appetite, and earnings metrics.
- Limitations and assumptions used; the data confidence label for climate-scenario data is typically lower than for financial data (third-party-supplied scenarios, modeled exposures, limited internal validation history).
- Forward plan for the next scenario cycle.

### 4. Materiality posture and disclosure linkage

The climate section names the firm's current disclosure posture:

- **SEC rule** (where current effectiveness applies): in scope for which Item 1500-series disclosures based on filer category; phase-in timetable; readiness status. The pack carries a `[verify current effectiveness]` flag where the litigation status is unresolved.
- **EU CSRD**: parent-group consolidation status for non-EU groups; ESRS E1 (climate change) standard applicability; double-materiality assessment status.
- **Voluntary TCFD-aligned**: the firm reports under TCFD as the working frame. The pack identifies the firm's reporting venue (10-K, 20-F, sustainability report, integrated report).
- **State or sector-specific**: NAIC Climate Risk Disclosure Survey for in-scope insurers (mandatory in 15 US states); NYDFS Industry Letter for NY-regulated banks and insurers; California Climate Corporate Data Accountability Act (SB 253) and Climate-Related Financial Risk Act (SB 261) for in-scope entities (verify effective status given litigation history).

### 5. Forward-looking commentary

The climate component of forward-looking commentary in the pack covers:

- Regulatory horizon: SEC rule status update with `[verify current effectiveness]` discipline; EU CSRD wave-2 / wave-3 timing for in-scope subsidiaries; California climate-disclosure laws status; ISSB IFRS S2 adoption status by jurisdictions where the firm operates; sector-specific supervisory exercises (FRB pilot follow-up, EIOPA insurance climate stress, BoE / PRA climate work).
- Internal milestones: financed-emissions methodology refresh; transition-plan publication; net-zero-target review; physical-risk model upgrade; data-quality work under the BCBS 239 frame extended to climate data.

## Climate-specific output template additions

Added to the pack (mapped to schema where present):

- `climate_section.governance_summary` — string, governance posture brief.
- `climate_section.physical_risk_summary` — string, physical-risk exposure brief.
- `climate_section.transition_risk_summary` — string, transition-risk exposure brief.
- `climate_section.scenarios_used` — array of strings, scenario inventory.
- `climate_section.materiality_posture` — enum (sec-rule-in-scope / csrd-in-scope / voluntary-tcfd / state-specific / multiple).
- `climate_section.linked_disclosure_section` — string or null, pointer to the firm's external disclosure (10-K Item, 20-F section, sustainability report).
- `climate_section.disclosure_verification_flag` — boolean, true when the SEC rule current effectiveness or other regime status is unresolved at pack-write time.
- `heat_map[].commentary` — climate-cell commentary (or strategic-cell climate component) names physical and transition risk by type and quantifies exposure where available.
- `forward_looking.regulatory_horizon[]` — climate-tagged items with the verification-flag discipline.

## Common pitfalls in climate-flagged committee packs

- Asserting current effectiveness of the SEC climate rule without checking the litigation and stay status at pack-write time. The default posture is to cite the rule with a `[verify current effectiveness]` flag and lean on TCFD or sector-specific frames for substantive content.
- Treating climate as a standalone appendix that sits outside the risk taxonomy. The committee owns the risk-taxonomy decision; climate is a heat-map cell or mapped under strategic with documented rationale.
- Reporting financed emissions or underwriting-portfolio emissions without the methodology and the data confidence label. Climate data is typically third-party-supplied, modeled, and partially validated; the pack carries that posture.
- Scenario analysis reported as a result summary without the assumption set, the limitations, and the validation status of the scenario data. Examiners and auditors probe both.
- Conflating the climate transition plan with the firm's risk-management posture. The transition plan is a forward-looking commitment; the risk-management posture is the current control surface. The pack carries both, distinctly.
- Treating EU CSRD as out of scope for US-headquartered firms without checking subsidiary consolidation. Many US firms have material EU subsidiaries that pull the parent into wave-2 or wave-3 reporting under ESRS.
- Using the firm's prior-vintage NGFS scenarios after a vintage refresh has been published. Scenario vintages have different policy assumptions; the pack flags the vintage in use.
- Omitting the data confidence appendix entry for climate data. BCBS 239 known-limitations posture extends to climate data; the pack records the limitations.
