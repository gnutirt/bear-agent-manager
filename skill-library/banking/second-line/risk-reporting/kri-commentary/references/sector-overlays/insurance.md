# Insurance sector overlay for kri-commentary

When the scope record flags `insurance`, this overlay sets the KRI-commentary content for insurers and insurance groups.

Loaded by: `kri-commentary/SKILL.md` when `scope.sector_overlay_set` includes `insurance`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- NAIC Risk Management and Own Risk and Solvency Assessment Model Act (Model #505) and the ORSA Guidance Manual, Sections 1 (Description of the Insurer's Risk Management Framework), 2 (Insurer's Assessment of Risk Exposure), and 3 (Group Risk Capital and Prospective Solvency Assessment). KRI commentary on capital-adequacy, solvency, and key risk metrics rolls into the ORSA Summary Report Section 2.
- NAIC Insurance Data Security Model Law (Model #668) for state-licensed insurers; cyber KRIs.
- IAIS Insurance Core Principles (ICP) 16 (Enterprise Risk Management for Solvency Purposes) for international and group-supervised insurers.
- State DOI conduct supervision frames (market-conduct examinations) for conduct-KRI commentary; varies state by state.
- For property and casualty: catastrophe-loss KRIs run on the firm's catastrophe model output; the KRI is a model-output KRI and carries a model-risk caveat.
- For life: actuarial assumption KRIs (lapse, mortality, morbidity) often surface here; commentary references the firm's actuarial valuation cycle.

## What changes for insurance-flagged KRI commentary

### 1. ORSA roll-up

The KRI commentary set is consumed by the ORSA Summary Report Section 2 (insurer's assessment of risk exposure). The block-writing voice is the same; the consumer is different. A separate field in the wrapper or in the scope record names the receiving artifact (committee pack, ORSA Summary Report, both). Where the same block reads into both, the source-trace and confidence-label discipline is the binding constraint.

### 2. Risk taxonomy

Insurance risk taxonomies typically include underwriting (P&C, life, health), market and credit, liquidity, operational, group risk, and (for groups) intra-group risk. The `risk_type` enum in the schema covers most; `risk_subtype` carries the taxonomy detail (e.g., "underwriting-pricing-adequacy", "underwriting-reserve-adequacy", "catastrophe-aggregation"). Where the firm uses an industry-specific taxonomy, the firm-overlay file maps the firm taxonomy onto the schema enum.

### 3. Catastrophe and actuarial KRIs

Catastrophe-loss KRIs (e.g., 1-in-100 modelled annual aggregate loss) and actuarial assumption KRIs (e.g., lapse rate vs. assumed) are model-output KRIs in the sense that the value depends on model parameters. The block carries:

- The model identifier and model owner (cross-link to the model-risk inventory).
- A `data_confidence_note` describing the model-driven nature of the metric and the model-validation status.
- `contributing_factors` includes `model-driver` where the metric movement is materially driven by model recalibration rather than experience.

### 4. Group versus solo KRIs

For insurance groups, KRIs at the group level (group SCR, group capital adequacy) and at the solo entity level (solo SCR, solo capital adequacy, lead-state regulatory metrics) need separate blocks. Conflating them is a common defect; block IDs name the entity scope explicitly.

### 5. Conduct KRIs

For state-conduct-supervised lines, conduct KRIs (complaint volume by theme, claims-handling timeliness, replacement activity for life) carry a heavier audience expectation: the conduct supervisor, the line-of-business committee, and the enterprise risk committee may all consume the same KRI. The block names the audience and the source posture explicitly.

## Insurance-specific output additions

- `risk_subtype` populated against the firm's insurance risk taxonomy.
- `data_confidence_note` populated for catastrophe and actuarial KRIs that rest on model output.
- Wrapper-level "receiving artifact" field where the engagement is dual-purpose (committee pack + ORSA).

## Common pitfalls in insurance-flagged KRI commentary

- Group and solo metrics conflated in one block. Separate blocks; name the entity scope.
- Catastrophe-loss KRI treated as a realized number. The model-driven nature and validation status belong in the data-confidence note.
- Actuarial assumption movement attributed to "experience" without distinguishing experience from assumption recalibration. The contributing-factors enum disambiguates.
- ORSA Summary Report Section 2 consumed verbatim from the committee-pack KRI block. The two artifacts share the underlying source posture but write to different audiences; the second-line lead reviews each consumer separately.
