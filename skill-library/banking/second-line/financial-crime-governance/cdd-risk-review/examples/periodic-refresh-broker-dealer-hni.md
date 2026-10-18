# Example: periodic refresh on a high-net-worth individual at a regional broker-dealer

Public-source-derived. No named institution or named natural person. The shape mirrors a standing pattern in capital-markets CDD periodic-refresh work: a long-tenured high-net-worth customer with international wire activity whose source-of-wealth statement is stale and whose expected-activity profile predates a publicly known change in the customer's business circumstances.

## Input

- **Institution**: a regional broker-dealer; primary regulators FINRA / SEC; the broker-dealer is the institution of record for CIP and the operative SAR rule.
- **Customer**: high-net-worth individual; long-tenured; primary residence in the US; second residence and significant business activity in a non-US jurisdiction.
- **CDD file (as presented for QA)**:
  - CIP under `§1023.220`: complete. Documentary verification on file. ID-document refresh on the file's natural cycle.
  - Beneficial ownership: not applicable (individual customer).
  - Expected activity: documented at original onboarding 11 years ago. Profile: international wire activity to and from the named non-US jurisdiction; private-investment-vehicle holdings; expected wire counterparties named.
  - Source-of-wealth statement: customer-supplied at original onboarding 11 years ago; not refreshed; no independent corroboration on file.
  - Risk rating: "medium-high"; drivers: "international exposure", "high-net-worth", "single-jurisdiction concentration outside US".
  - Refresh cycle: per firm policy, 24 months for medium-high.
  - Monitoring scope: structuring, layering, wire-pattern-anomaly, sanctions-adjacent.
  - Trigger for this refresh: 24-month periodic cycle. Reviewer notes a publicly known change in the customer's business circumstances since the last refresh (acquisition or sale of a named business interest reported in trade press).
- **Engagement scope supplied**: institution = broker-dealer; primary regulator = FINRA / SEC; persona = second-line CDD QA reviewer; source posture = public-plus-firm-policy-plus-system-of-record-evidence; sector overlay = capital-markets; cross-cutting overlays = none.
- **Review type**: periodic_refresh.

## Output sketch

The skill produces a CDD review memo against the refresh file. Headlines:

- **Customer profile summary** — high-net-worth individual; long-tenured customer; US residence with significant non-US business and asset exposure.
- **CIP coverage (Pillar 1)** — `cip_status = sufficient`. ID-document refresh on the file's cycle; verification corroboration on file; no discrepancies.
- **Beneficial ownership (Pillar 2)** — `beneficial_ownership.applicable = false` (individual customer); pillar not applied.
- **Nature and purpose / expected activity (Pillar 3)** — `expected_activity_status = partial`. The expected-activity profile is specific at the original onboarding level but predates the publicly known change in the customer's business circumstances. The wire-counterparty list and the private-investment-holdings profile may no longer match the customer's current activity. The QA flags this as a material gap and recommends an updated profile.
- **Risk rating** — current "medium-high"; `rating_reasonableness = borderline`. The rating drivers are reasonable on the original profile; the publicly known change in business circumstances introduces possible new drivers (e.g., PEP-adjacent exposure if the change involves a regulated or government-adjacent role; new geographic exposure if the change involves a different jurisdiction). The QA flags the rating for re-evaluation but does not change it.
- **Ongoing monitoring (Pillar 4)** — `monitoring_scope_status = partial`. The monitoring scope is reasonable for the original profile; the threshold calibration may be misaligned if the customer's actual activity has shifted since the last refresh. The QA flags cross-reference to `aml-model-monitoring` for threshold review once the expected-activity profile is updated.
- **EDD escalation posture** — `edd_status = borderline`. The publicly known business change may carry PEP-adjacent or jurisdictional considerations that elevate to EDD. The QA recommends the EDD evaluation route through `edd-escalation-pack` and does not produce the EDD pack itself.
- **Material gaps**:
  - Updated expected-activity profile reflecting the post-change business circumstances (pillar = expected_activity; severity = material).
  - Refreshed source-of-wealth statement with independent corroboration (pillar = expected_activity; severity = material). The 11-year-old self-attestation is not corroboration.
  - Re-evaluation of risk-rating drivers in light of the publicly known change (pillar = risk_rating; severity = material).
  - EDD-trigger evaluation (pillar = edd; severity = moderate; routes to `edd-escalation-pack`).
- **Reviewer findings**:
  - `criterion = expected_activity_specificity`, severity material. Profile predates the publicly known change.
  - `criterion = rating_driver_evidence`, severity material. Drivers do not reflect post-change exposure.
  - `criterion = edd_trigger_application`, severity moderate. Trigger evaluation overdue given the change.
  - `criterion = refresh_cycle_adherence`, severity observation. Cycle was met; the gap is in the depth of the refresh on the source-of-wealth pillar specifically.
- **Recommended human-review gates and owner actions** — `recommendation = escalate_to_edd` with `recommendation_notes`: refresh expected-activity profile and source-of-wealth statement before the EDD pack is built; re-evaluate rating after the EDD evaluation. Cross-reference to `edd-escalation-pack` and `aml-model-monitoring`. The QA reviewer does not change the rating, set the EDD trigger directly, or route the customer to relationship exit; the BSA officer, the AML QA team lead, and the EDD committee decide.
- **Source trace** — anchors to `references/source-anchors.md` (CDD Final Rule, FFIEC CDD section, `§1023.220`), `references/sector-overlays/capital-markets.md` (source-of-wealth corroboration expectation; private-banking-adjacent EDD frame).
- **Confidence label** — `medium`. The findings are at high confidence on the file evidence; the EDD-trigger evaluation requires the EDD-pack work that this skill does not produce.

## Why this scenario matters

- **Stale source-of-wealth statements at periodic refresh on long-tenured high-net-worth customers** are the dominant defect in capital-markets CDD work. The skill's `criterion = expected_activity_specificity` and `rating_driver_evidence` carry this pattern.
- **Customer self-attestation is not corroboration**. The 11-year-old statement is the customer's claim; the file should evidence independent corroboration where the rating warrants.
- **Publicly known changes in customer circumstances are an event-driven trigger even mid-periodic-cycle**. The QA reads the publicly known change against the file; if the change is material to the rating drivers, the periodic refresh has more to do than the cycle alone implies.
- **The boundary with `edd-escalation-pack` is real**. The CDD QA flags the EDD evaluation; it does not build the EDD pack. The cross-reference is the handoff.
- **The QA does not direct the rating change**. A rating change is a firm-governance decision routed to the BSA officer and the rating-governance forum the firm uses.

## Anchors

- FinCEN Customer Due Diligence Final Rule (May 2016, compliance May 11, 2018).
- FFIEC BSA/AML Examination Manual — Customer Due Diligence section.
- 31 CFR §1023.220 — broker-dealer CIP.
- 31 CFR §1010.620 — enhanced due diligence for private-banking accounts (consulted for EDD-trigger framing where applicable).

See `references/source-anchors.md` for full citations and `references/sector-overlays/capital-markets.md` for the capital-markets-specific frame.
