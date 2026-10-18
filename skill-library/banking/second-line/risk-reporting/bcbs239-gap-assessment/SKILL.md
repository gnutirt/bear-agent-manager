---
name: bcbs239-gap-assessment
description: |
  Drafts a gap assessment of the firm's risk data aggregation and risk reporting posture against the fourteen BCBS 239 principles, organised by the four BCBS groups (overarching governance and infrastructure, aggregation, reporting, supervisory review). Produces a principle-by-principle matrix with rating, direction, evidence summary, gaps, owners, and target dates that the head of risk data, head of regulatory reporting, CRO office, and internal audit can take to the data-management committee after qualified review.

  Best for:
  - Standing up or refreshing a self-assessment ahead of a regulator-driven review (FRB horizontal review on RDARR, ECB SREP thematic, OCC Heightened Standards thematic).
  - Diagnosing why a risk committee pack carries a non-high data-confidence label; the gap assessment is the upstream artifact.
  - Refreshing the BCBS 239 posture after a material change (acquisition, system migration, source-of-record consolidation, taxonomy revision).
  - Pulling the cross-entity gap view across G-SIBs and D-SIBs where Principle 12 to 14 supervisory expectations apply.

  Not the right tool when:
  - The artifact is the committee pack itself; use `risk-committee-pack` and surface the BCBS 239 posture there as a data-confidence appendix.
  - The artifact is a single KRI commentary; use `kri-commentary`.
  - The artifact is a one-off data-quality issue write-up; use `risk-compliance-core/skills/issue-writeup`.
  - The work is enterprise data governance generally. BCBS 239 is risk-data anchored. SOX 404 financial-reporting data quality is a different regime.
argument-hint: "[scope, prior assessment, risk-data inventory, MRA/MRIA register, system-tracing evidence, reconciliation tests, or scenario]"
---

# BCBS 239 gap assessment

The firm's posture on risk data aggregation and risk reporting, mapped to the fourteen BCBS 239 principles, with a rating, a direction-of-travel, an evidence summary, named gaps with severity and owner, and recommended actions with target dates. The grammar is BCBS 239's own (compliant, largely compliant, materially non-compliant, non-compliant); the audience knows the principles by number and reads accordingly.

The artifact serves the head of risk data and head of regulatory reporting (the line one and a half running it day to day), the CRO office (the second line that reviews and signs), and internal audit (the third line that uses the same matrix as a starting point for assurance). It feeds the data-management committee, the Risk Committee, and, where applicable, the regulator-driven review (FRB horizontal, SSM SREP, OCC thematic). It is a draft until a qualified human reviewer attests; the skill stops at draft.

## Ask first

Most of these are obvious from the engagement, but settle them before drafting:

- Which supervisory context applies. FRB-only, OCC-only, ECB-SSM-only, or multi-jurisdiction. The supervisor drives the overlay weight (Heightened Standards for OCC covered banks, ECB Guide May 2024 incremental expectations for SSM-supervised entities, FRB consolidated supervision frame for LFIs and IHCs) and the citation focus.
- Which legal entities are in scope. Group, IHC, EU subsidiary, designated branch, broker-dealer subsidiary. For G-SIBs and FBOs, ratings can vary by entity. Plan for per-entity ratings where they will diverge.
- Whether climate is reported to a committee covered by the assessment. If yes, climate-data lineage is in scope under Principles 3 and 6 and the cross-cutting climate overlay loads. If no, do not gold-plate.
- What evidence is on the table today. Document review and interviews alone do not support a credible rating in groups B and C; you need at least one reconciliation test or system trace per principle in those groups, plus recent ad-hoc aggregation runs to defend any rating above materially-non-compliant on Principle 6.
- Whether there are open MRAs or MRIAs on risk data. Principle 13 must reflect them, with linkage to the issue register. An assessment that omits known open findings is not credible.

When the scope record (see `risk-compliance-core/skills/scoping`) is supplied, consume it for institution profile, supervisory context, sector and cross-cutting overlays, and persona; otherwise ask the practitioner the few facts above and default the rest, flagging the defaults in `assumptions_and_dependencies`. The skill works without a formal scope; it does not block.

## How the assessment gets filled in

The assessment has the same spine across firms: cover, executive summary, methodology, four principle groups walked in BCBS order, aggregate posture, top-five priority gaps, linked open issues, source trace, reviewer questions, sign-off. The order below is roughly how a senior practitioner walks it; in practice the conversation surfaces sections in the order the evidence arrives, and the structured object sorts itself.

The two parts of the workflow that are genuinely sequential and load-bearing:

1. **Set methodology before rating.** A `largely-compliant` rating requires multiple lines of evidence (document plus system plus reconciliation), and at least one ad-hoc aggregation run within the last reporting cycle for Principle 6. A `compliant` rating requires the same plus passing reconciliation tests across all in-scope risk types. Decide what evidence the engagement has; this decides what ratings the assessment can defend. Set the confidence label here, methodology-anchored, not finding-anchored.
2. **Walk the principles before the aggregate.** The aggregate group rating and the overall rating roll up from the principle ratings, not the other way around. Drafting the aggregate first inverts the work and bakes in pre-decided positions that the principle evidence may not support.

Beyond those two, the principle-level work can run in any order the evidence arrives.

### Methodology

Lines of evidence: document review, system tracing, reconciliation tests, interviews, observation, ad-hoc aggregation runs witnessed. Capture counts and the coverage map (which risk types, which entities, which production cycles). Capture the manual workaround inventory; an empty inventory at a large bank carries a reviewer question by default.

### Group A — Overarching governance and infrastructure

**Principle 1 (Governance).** Board and senior management oversight of RDARR capabilities. Named risk-data committee with charter, composition, cadence, and escalation. CDO line of reporting. Data-quality framework reviewed and approved by the management body. For SSM-supervised entities, the ECB Guide expectation on annual management-body review of the data-quality framework lands here as a supplementary criterion.

**Principle 2 (Data architecture and IT infrastructure).** Risk-data taxonomy, golden source mapping, source-to-report lineage, controls over data flows, change management, BCM and DR for risk-data infrastructure. Principle 2 is one of the persistent BCBS thematic-finding principles. A `largely-compliant` or higher rating requires evidence of documented lineage for material risk types and named controls over change in upstream systems. The ECB Guide expectation on integrated reporting taxonomy across financial, regulatory, statistical, and risk reporting lands here for SSM-supervised entities.

### Group B — Risk data aggregation capabilities

**Principle 3 (Accuracy and integrity).** Automated reconciliation between source systems and risk-aggregation layer; manual workaround inventory with rationale and remediation path; data-quality KPI set with thresholds and breach-driven escalation; data-quality testing across the in-scope risk types. Climate-data lineage from vendor-supplied scenario providers and sustainability feeds reads here when the climate overlay is loaded; a vendor refresh cadence not aligned to the firm's stress cycle is a Principle 3 finding.

**Principle 4 (Completeness).** Coverage of all material risk types, lines of business, legal entities, geographies. On-balance-sheet versus off-balance-sheet exposures. The Basel III monitoring exercise is a working evidence pointer here; the aggregation discipline required to populate the templates is a test of completeness.

**Principle 5 (Timeliness).** Production cycles for normal and stress conditions; lag from event to report; out-of-cycle production capability. Stress timeframes are usually the binding constraint.

**Principle 6 (Adaptability).** Ability to produce ad-hoc and stress-scenario aggregations within required timeframes. Principle 6 is the most-cited BCBS thematic finding across the progress-report series. A rating above `materially-non-compliant` requires evidence of recent ad-hoc and stress runs that met the required timeframe; without that evidence, the rating is not defensible. For SSM-supervised entities, the ECB Guide flags climate-stress adaptability specifically.

### Group C — Risk reporting practices

**Principle 7 (Accuracy of reporting).** Reconciliation between risk reports and source data. Reconciliation tests at the report level (not just at the aggregation layer) are the evidence that defends the rating.

**Principle 8 (Comprehensiveness).** Risk reports cover all material risk types. Gaps are usually at the seams: emerging risks (climate, crypto exposure, third-party concentration) that the report set has not yet absorbed.

**Principle 9 (Clarity and usefulness).** Fitness for the audience. The board pack reads at one altitude; the ExCo pack at another; the working-group dashboard at a third. A risk report that the audience cannot act on is a Principle 9 finding regardless of how complete or accurate it is.

**Principle 10 (Frequency).** Alignment of report frequency with audience needs and risk profile. Stress conditions raise the bar; a quarterly cadence that the firm cannot lift to weekly under stress is a Principle 10 and Principle 6 issue.

**Principle 11 (Distribution).** Controls over distribution lists, classification, redaction, need-to-know enforcement. For cross-border groups, distribution beyond the home-supervisor perimeter without classification controls is the recurring Principle 11 finding. The ECB Guide raises the bar on distribution controls for SSM-supervised entities.

### Group D — Supervisory review, tools, and cooperation

**Principle 12 (Review).** The firm's readiness for a regulator-driven assessment. Self-assessment evidence pack, prior-cycle review history, open recommendations. Principle 12 is supervisor-facing; the firm reads it as a readiness expectation.

**Principle 13 (Remedial actions and supervisory measures).** Track record on closing supervisory findings. Current open MRAs, MRIAs, and internal issues related to risk data must be linked to the issue register and reflected in the principle they apply to. An assessment that hides known open findings will not survive a regulator-driven review.

**Principle 14 (Home/host cooperation).** For cross-border groups, the protocol for sharing risk data with home and host supervisors, supervisory-college submission practice, deconflicted reporting timelines (e.g. FRB Y-7 versus ECB SREP). For single-jurisdiction firms, this is light-weight or not applicable; mark it accordingly rather than fabricating content.

### Per-principle output

For each principle: rating from the BCBS vocabulary (compliant, largely-compliant, materially-non-compliant, non-compliant); direction since the prior assessment (improving, stable, deteriorating, first-assessment); evidence summary citing the lines of evidence relied on; ECB Guide overlay delta where SSM applies; per-entity ratings where they diverge; gaps with ID, description, severity, owner, evidence pointer, linked issue ID; recommended actions with description, owner, target date, dependencies.

### Aggregate, priority gaps, source trace

The four group ratings roll up from the principle ratings within each group; the overall rating reads from the four group ratings. Top-five priority gaps are surfaced from the per-principle gap lists with owner, target date, and dependency map; they are what the data-management committee and the Risk Committee read first. Linked open issues map every Principle-13-relevant finding to the issue register. The source trace records every material claim with source, date, section, and confidence label.

### Sector and cross-cutting overlays

Sector overlays (`references/sector-overlays/banking.md` is the primary; `insurance.md`, `capital-markets.md`, `payments-fintech.md` are light overlays for cases where a non-bank entity adopts BCBS 239 voluntarily or where a broker-dealer subsidiary inherits the parent's posture) load when the scope names the sector. Cross-cutting overlays (`references/cross-cutting/cyber.md`, `climate.md`) load when the scope flags the topic. The overlay's named criteria land inside the principle blocks they apply to (climate-data lineage inside Principle 3 and 6; cyber-control failures affecting risk-data infrastructure inside Principle 1 and 2). Loading overlays the engagement does not implicate adds noise without challenge value.

## Quality bar

Every material claim cites a source. Unsupported items carry `[evidence needed]` and route to the engagement issue log, not silently into the assessment. Evidence is separated from inference; vendor self-attestation is not on the same line as firm-independent evaluation; document review is not on the same line as a passing reconciliation test. Ratings in groups B and C cannot rest on document review and interviews alone; at least one reconciliation test or system trace per principle is needed to defend a rating above `materially-non-compliant`. Principle 6 above `materially-non-compliant` requires evidence of recent ad-hoc and stress-scenario runs within the required timeframe. Open MRAs and MRIAs related to risk data are linked under Principle 13 and reflected in the principle they apply to. The assessment is a draft until the head of risk data, head of regulatory reporting, CRO, and (where reviewing) chief internal auditor attest; the skill stops at draft.

## Adaptation

Audience drives tone (CRO and CDO read the executive summary; the data-management committee reads the body; the Risk Committee reads the priority-gap section and the open-issue linkage; internal audit reads the methodology and source trace; an examiner reads the whole thing). Depth flexes with engagement type (a regulator-driven self-assessment runs deep; a post-acquisition refresh focuses on the principles the change implicates). Per-entity rating is allowed where it tells a more honest story than a group-level average; document the rationale. Confidence label is methodology-anchored, not finding-anchored; a `high` label requires multi-line evidence per principle in groups B and C.

## Output

Default to drafting against `templates/default-output.md`. Render as Word, Excel, PowerPoint, or Markdown when the audience or workflow asks for it; a regulator-facing self-assessment usually rides as a Word memo with the per-principle rating grid in Excel, while a Risk Committee read-out collapses to a deck. Produce the structured record at `schemas/bcbs239-gap-assessment.schema.json` when downstream automation or a registered consumer needs it. The schema is the cross-skill contract; additive changes only between minor versions, never silent renames. Downstream consumers: `risk-committee-pack` pulls the overall rating, the top-five priority gaps, and the data-confidence label for the data-confidence appendix; `attestation-pack` pulls the linked-issues and sign-off block; `kri-commentary` pulls the per-principle posture for KRI commentary on data-quality KRIs.

The reviewer attestation is filled by the human reviewer, not the skill. The assessment files only after attestation.

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors.
- `references/sector-overlays/{banking,insurance,capital-markets,payments-fintech}.md` — sector overlays loaded from scope.
- `references/cross-cutting/{cyber,climate}.md` — cross-cutting overlays loaded from scope.
- `references/firm-overlay.md` — firm policy, taxonomy, named owners, named systems, internal data-quality KPI set (consumed when present; never committed in this repo).
- `templates/default-output.md` — assessment template.
- `schemas/bcbs239-gap-assessment.schema.json` — structured-output contract.
- `examples/` — public-source-derived scenarios (regional bank self-assessment; G-SIB FBO ahead of an SSM SREP review).
- `TROUBLESHOOTING.md` — recurring defects (where present).
