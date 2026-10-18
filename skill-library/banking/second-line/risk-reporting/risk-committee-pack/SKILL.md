---
name: risk-committee-pack
description: |
  Drafts the enterprise risk committee pack a CRO carries into the meeting: heat map by risk type, top risks, material risk events, KRI movement and breaches against the risk appetite statement, issues and remediation, forward-looking commentary including scenario results, and decision items. The pack is the load-bearing governance instrument the risk committee of the board (or the enterprise risk committee) uses to discharge its oversight under the firm's risk governance framework.

  Best for:
  - Standing quarterly or monthly enterprise risk committee pack from upstream KRI feeds, the issue log, the loss-event register, and CRO commentary.
  - Board-level risk pack ahead of a regulator-attended meeting (FRB horizontal review, OCC Heightened Standards readiness, FRB CCAR cycle review).
  - A single committee view across credit, market, liquidity, operational, compliance, financial-crime, model, third-party, cyber, climate where in scope, strategic, and reputational risk.
  - An adviser-firm or insurer enterprise risk committee pack where the underlying taxonomy and regulators differ from the bank case.

  Not the right tool when:
  - The pack is the AI-committee-specific view (use `ai-governance-model-risk/skills/board-ai-risk-pack`; the ERM pack pulls a brief from there rather than re-anchoring the AI sources).
  - The work is a single KRI commentary block (use `kri-commentary`; this skill consumes its output).
  - The work is an SEC cyber Item 1.05 trigger analysis or 8-K disclosure decision (use `cyber-disclosure-readiness`).
  - The work is a management response to an MRA, MRIA, or audit finding (use `management-response`; this skill consumes its status into the issues section).
  - The data lineage feeding the pack is not yet fit for purpose (run `bcbs239-gap-assessment` first; this skill assumes BCBS 239 data quality is established and surfaces the residual limitations in the appendix).
argument-hint: "[committee name and meeting date, KRI feed pointer, issue log pointer, RAS register pointer, prior-period pack, or scope statement]"
---

# Risk committee pack

The pack is what the risk committee of the board (or the enterprise risk committee) reaches for to discharge its oversight of the risk governance framework and the risk appetite statement. It is the CRO's instrument, drafted by the risk reporting function, distributed by the committee secretary, challenged by the chair. The named sections (heat map, top risks, material events, KRI movement and breaches, RAS status, issues, forward-looking, decision items) are not optional; the committee charter expects all of them. Depth and tone flex with the firm.

This is a CRO-function artifact, not a compliance artifact. The vocabulary is risk appetite, RAS breach, top risks, scenario commentary, Heightened Standards expectations, ORSA framing, three-lines roles. Compliance reporting (CFPB, fair-lending, BSA, conduct) lands in this pack only as a row in the heat map and as items in the issues and forward-looking sections; the substantive compliance pack is somewhere else in the firm.

The pack is a draft until the CRO and the head of risk reporting attest. The skill stops at the draft.

## Ask first

Most of the spine is set by the engagement and the prior-period pack. A few things settle before drafting:

- Who is the audience. A board risk committee pack is challenge-shaped and decision-loaded. An enterprise risk committee pack is wider on management metrics and lighter on the committee-vote machinery. An adviser firm risk committee pack is a different beast (firm-level enterprise view, not fund-board). A regulator-attended meeting tightens the source trace and the RAS-to-operating-limit ladder.
- What is the period and the cycle. Quarterly is the default; monthly cycles compress everything; an annual board pack is the deepest cut and usually carries the RAS recalibration.
- What is in scope on the heat map. The firm's risk taxonomy drives this. For OCC-supervised covered banks, the heightened-standards eight-category frame is the floor; insurers map to ORSA risk categories; advisers map to the firm's adviser-level risk taxonomy, not fund-board risks. Climate is included as a separately-rated cell where the firm reports it that way; otherwise it lands under strategic with rationale documented. Citations live in `references/source-anchors.md`.
- What decisions does the committee owe this cycle. The decision items section is the load-bearing one; a pack with no decisions is a status update. Decisions usually include RAS recalibrations, MRA or MRIA extension requests, framework changes, and scenario-driven actions. Surface them up front.
- What is the source posture and the data confidence label. BCBS 239 known limitations bind the label; if the most recent self-assessment lists three KRIs with lineage gaps, the label is medium at best. The label is the BCBS 239 voice in the pack, not a marketing decision.

When the scope record is supplied, the skill reads `institution.type`, `institution.primary_regulators`, `persona.role`, `risk_lens`, `sector_overlay_set`, and `cross_cutting_overlay_set` from it, plus `source_posture` for the evidence asks. Otherwise the skill works with what the practitioner names and flags the rest.

## How the pack gets built

The pack has the same spine across firms, with depth and overlay flex. The order below is roughly how a senior risk reporting lead walks it; in practice sections fill out as upstream feeds arrive.

Start with the cover, the decision items list, and the CRO summary bullets. The decision items list is what the committee chair reads first; everything else supports those decisions. CRO summary is up to seven bullets in CRO voice covering the headline movement, the top risk, a material event, RAS posture, a forward-looking signal, the decision pointer, and the data confidence label. If decision items are not yet known, that absence is itself a sign-off question; surface it rather than ship a status pack.

The heat map by risk type carries current rating, prior rating, direction, quantified exposure where one exists, and pointer commentary linking to the top-risks entry. Every cell has all four of current, prior, direction, and commentary. Deteriorating cells are addressed in top risks. Elevated and high cells without quantified exposure carry that absence as a sign-off question. For OCC-supervised covered banks, the heightened-standards eight-category frame is the minimum, with cyber, model, third-party, climate, and conduct added where the firm separately reports them. Insurers carry the ORSA risk categories. Advisers carry the adviser-firm taxonomy.

Top risks names the risks driving each deteriorating cell, with quantified exposure where available, key drivers, owner role (not named individual), and the linked heat-map cell. A top risk without an owner role is unfinished.

Material risk events covers loss events above the firm threshold, near-misses, control failures, regulatory actions, and external events that hit the firm in the period. Each event carries date, type, root-cause line, gross and net impact where quantified, status, and linked issue IDs. Tier-1 events get a paragraph of commentary in the body; the rest sit in the structured object.

KRI movement and breaches pulls from the upstream KRI feed; breach commentary is drafted by `kri-commentary` and consumed here. Each KRI carries threshold, prior, current, RAG status, breach age in days, and a commentary pointer. Red breaches get the full paragraph (root cause, owner role, remediation status, date for next reading); ambers and trigger-level alerts get a short note. The KRI table is the data-density section; resist padding the rest of the pack to balance it.

Risk appetite status is the section the committee owns. Each RAS metric carries limit, trigger, tolerance, current value, breach status, the ladder-to-operating-limit column, and short commentary. The ladder column is required for OCC-supervised covered banks under the heightened-standards RAS frame and is leading practice for any firm with a layered RAS; without it, the supervisory expectation that the board frames and oversees the RAS is not demonstrably met. RAS recalibration requests surface as decision items, not as line-item edits.

Issues and remediation status is bucketed by source: MRA, MRIA, audit, regulatory exam, internal high-severity. Counts and ageing are necessary but not sufficient; the FRB consolidated supervision frame and the OCC heightened-standards frame both expect the committee to manage, not just count, the open population. Each over-age item carries owner role, forward action with date, and slippage commentary explaining why the prior commitment slipped and what changed. `management-response` outputs feed this section for items where a formal response is on file.

Forward-looking commentary is named, dated, and regulator-anchored. "Emerging risks include cyber, AI, and climate" is filler; replace with named items the committee can act on (the FRB stress test scenario published this quarter and its projected capital impact on the commercial real-estate book; the expected NYDFS Part 500 amendment effective Q3 next year; the in-flight CFPB rulemaking on overdraft). Scenario results sit here when they exist, with breach flag where a scenario tripped a RAS threshold.

Decision items in full detail close the body: background, options, recommended option with rationale, dissents from named roles where any, requested vote or acknowledgement, and owner role.

The appendices carry the data confidence and BCBS 239 posture (label, known limitations, restatements), the source trace (every material claim mapped to its source system, evidence pointer, and confidence), and the glossary of risk taxonomy terms in plain English. The sign-off block names the CRO, the head of risk reporting, the committee chair acknowledgement, and the reviewer questions for the secretary to surface in the meeting.

### Climate

When the scope flags climate, the climate cross-cutting overlay (`references/cross-cutting/climate.md` when installed) drives placement and depth. Climate is part of the enterprise heat map, not a separate appendix; either as a separately-rated cell or under strategic with rationale documented in the cell commentary. The Climate section in the body carries governance summary, physical and transition risk summary, scenarios used (NGFS Net Zero 2050, NGFS Delayed Transition, NGFS Current Policies, FRB pilot scenarios where applicable), and the link to the firm's external climate disclosure (10-K Item 1500 series, CSRD-aligned report, voluntary TCFD report). The SEC climate disclosure rule has been subject to legal challenges and stay actions; never assert current effectiveness without checking the SEC's posture as of the report date. Default posture is to lean on TCFD for substantive content and flag the SEC rule status in source trace.

### Cyber

Cyber risk lands in the heat map and in the top risks where elevated. Depth lives in `cyber-disclosure-readiness`; pull a brief from there into the cyber heat-map cell and any top-risks entry rather than re-anchoring the cyber sources in the pack.

### Sector overlays

Load only the overlay the scope names. For OCC-supervised covered banks, the heightened-standards expectations are explicit in the pack (RAS ladder, three-lines roles, risk-governance-framework alignment); citations live in the banking sector overlay. Insurance ERM committee packs map sections to ORSA Summary Report sections so the same content rolls up to the framework, exposure-assessment, and prospective-solvency expectations under Model #505. Capital-markets adviser packs are firm-level (investment risk at the firm, fiduciary risk at the firm, vendor and technology risk at the firm); fund-level items go to the fund boards via separate reporting and cross-link if material to both, do not collapse. Payments-fintech packs carry third-party concentration and BaaS roll-up where the firm has bank-partnership exposure.

The sector overlay is content that lands in the pack, not background reading. An insurance overlay loaded but no ORSA mapping in the pack is the failure mode the troubleshooting file calls out.

## Quality bar

- Every material claim cites a source. Unsupported items carry `[evidence needed]` and route to the engagement issue log, not silently into the pack.
- Evidence is separated from inference. The source-trace appendix shows the seam.
- Decision items requested is the first body section a committee member reads. A pack without decision items is a status update; surface that absence as a sign-off question rather than ship the status pack as a committee instrument.
- Heat-map cells carry current, prior, and direction. Deteriorating cells are addressed in top risks.
- Where climate is in scope, it is part of the enterprise heat map; not a floating appendix.
- The data confidence label is BCBS 239-anchored. A "high" label with a non-empty BCBS 239 known-limitations list fails the schema; medium at best where limitations are present.
- The pack is a draft until the CRO and the head of risk reporting attest. The skill does not assert sign-off, distribute, file, or post to the committee folder.

## Adaptation

Audience drives tone (board chair is challenge-shaped; ERM committee is wider on management metrics; regulator-attended meeting tightens the source trace). Depth flexes with firm tier (Heightened Standards covered bank deepest; mid-cap regional and adviser firm lighter). Sector and cross-cutting overlays load from the scope. Where firm-specific taxonomy, RAS structure, or governance machinery applies, it lives in `references/firm-overlay.md` (consumed when present) and never in the pack directly.

## Output

Default to drafting against `templates/default-output.md`. Render as Word, Excel, PowerPoint, or Markdown when the audience or workflow asks for it; for a board risk committee, PowerPoint is often the live deliverable, with a Word memo for the CRO summary and Excel for the KRI and RAS appendices. Produce the structured record at `schemas/risk-committee-pack.schema.json` when downstream automation or a registered consumer needs it. The reviewer attestation block is filled by the CRO and the head of risk reporting; the pack is distributed only after.

Downstream consumers: the structured object feeds the firm's committee minutes system and the regulator response file when supervisors ask for the pack as part of a horizontal review or examination request. The KRI section is populated from `kri-commentary` outputs; the issues section consumes `management-response` outputs; the cyber heat-map cell consumes a brief from `cyber-disclosure-readiness` when elevated. The schema is the cross-skill contract; additive changes only, never silent renames. Breaking changes ship as a versioned migration with the consumers told in advance.

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors.
- `references/sector-overlays/{banking,insurance,capital-markets}.md` — sector overlays loaded from scope.
- `references/cross-cutting/climate.md` — climate cross-cutting overlay (when installed).
- `references/firm-overlay.md` — firm-installed taxonomy, RAS structure, governance machinery (consumed when present).
- `templates/default-output.md` — pack template with the named sections.
- `schemas/risk-committee-pack.schema.json` — structured-output contract.
- `examples/` — anonymised public-source-derived scenarios.
- `TROUBLESHOOTING.md` — recurring defects.
