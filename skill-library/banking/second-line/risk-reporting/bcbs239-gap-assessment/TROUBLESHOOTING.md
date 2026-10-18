# Troubleshooting: bcbs239-gap-assessment

Recurring failure modes when a BCBS 239 gap assessment looks complete but is not. The reviewer pass should catch these; the builder pass should preempt them.

## Rating without testing

Symptom: principle ratings draw on document review and interviews only. No reconciliation tests, no system tracing, no recent ad-hoc-aggregation evidence. Confidence label set to `high` regardless.

Why it happens: testing is expensive and the engagement timeline is short. Rating from documentation feels close enough.

Fix: at least one reconciliation test or system tracing per principle in Group B (Principles 3-6) and Group C (Principles 7-11). Methodology section names the lines of evidence per principle. The `high` confidence label requires multi-line evidence (document plus system plus reconciliation) on those groups; a single-line methodology fails the confidence-label gate.

## Principle 6 lip service

Symptom: Principle 6 (adaptability) rated `largely-compliant` or above with no recent ad-hoc-aggregation evidence. The gap commentary is generic.

Why it happens: ad-hoc and stress-scenario aggregation runs are rare events; the engagement window may not include one.

Fix: any rating above `materially-non-compliant` on Principle 6 requires evidence of recent ad-hoc and stress-scenario aggregation runs within the required timeframe. Where no recent run is evidenced, the rating defaults to `materially-non-compliant` and the engagement carries an action to schedule and run an ad-hoc aggregation as part of the remediation plan. The BCBS thematic-finding pattern is clear; supervisors probe Principle 6 first.

## Manual workarounds invisible

Symptom: Principle 2 (data architecture) and Principle 3 (accuracy) rated cleanly with no manual-workaround inventory. The risk-data layer is implicitly described as fully automated.

Why it happens: manual workarounds (Excel-based aggregations, off-system reconciliations, RPA bridging) live in operations and are rarely surfaced to the formal data-architecture inventory.

Fix: the methodology section requires an explicit manual-workaround inventory. An empty inventory at a large bank is implausible and triggers a reviewer question. The inventory names the workaround, the risk type and reporting it serves, the owner, and the remediation status.

## Confusing risk reporting with financial reporting

Symptom: SOX 404 evidence cited as Principle 3 or Principle 7 evidence; financial-statement data-quality controls treated as risk-data controls.

Why it happens: the controls vocabulary overlaps and the same data warehouses sometimes serve both regimes.

Fix: BCBS 239 is risk-data-anchored. SOX 404 is financial-statement-anchored. The doctrines do not substitute. The assessment cites SOX 404 evidence only where the risk-data layer shares infrastructure with the financial-reporting layer, and even then the evidence is labelled as the financial-reporting view, not as Principle 3 or Principle 7 evidence on the risk side.

## Open MRAs not linked

Symptom: Principle 13 (Remedial actions) reads as a generic statement of remediation discipline. Open MRAs, MRIAs, and 4(m) actions on the risk-data layer are not named.

Why it happens: the issue register lives in a separate system from the assessment workpapers; the linkage is left for later.

Fix: Principle 13 entries link to open supervisory findings on risk data by issue-register ID. The assessment's `linked_open_issues[]` field carries the named findings. An empty Principle 13 finding-set at a large bank is not credible; supervisors expect linkage to the firm's open-finding population on the risk-data layer.

## Cross-border ratings averaged

Symptom: a multi-entity G-SIB or FBO assessment carries a single set of ratings across all legal entities. Per-entity variation is not visible.

Why it happens: aggregation is easier than per-entity assessment, and the consolidated frame is the headline.

Fix: per-entity ratings where the entities differ materially. The aggregation rationale is part of the methodology section. For an FBO with a US IHC, the IHC carries its own ratings independent of the parent group; the assessment surfaces both.

## Climate-data lineage out of scope

Symptom: a firm reporting climate risk to the committee carries no climate-data section in the assessment. Vendor-supplied climate-scenario data is treated as background.

Why it happens: climate is a newer reporting domain and the BCBS 239 assessment template does not natively prompt for it.

Fix: where the firm reports climate to the committee, climate-data lineage is in scope under Principles 3 and 6. The cross-cutting climate overlay (where loaded) supplies the criteria. Vendor-supplied scenario data is named, the lineage is traced, and the adaptability of the data layer to ad-hoc climate stress requests is evidenced.

## Confidence label inflation

Symptom: confidence label set to `high` on an assessment with thin methodology (document review only, no reconciliation, no recent ad-hoc-aggregation evidence).

Why it happens: confidence-label setting is treated as a finding-quality statement rather than as a methodology-quality statement. A clean rating feels like high confidence.

Fix: the confidence label is methodology-anchored, not finding-anchored. `high` requires multi-line evidence (document plus system plus reconciliation) per principle in Groups B and C. `medium` is the default where the methodology is solid but one line of evidence is thin. `low` is the default where the engagement was scoped to desk review only. The label is set against the methodology, not against the rating.

## Aggregate rating set before per-principle ratings settle

Symptom: the executive summary leads with an overall rating that does not reconcile to the per-principle ratings in the body. Group-level aggregations do not match the principle entries.

Why it happens: the executive summary is drafted first from a holistic read; the body is drafted later from the evidence; the two are never reconciled.

Fix: the aggregate ratings (per group and overall) are computed from the per-principle ratings, not asserted independently. The methodology section names the aggregation rule (e.g., a `materially-non-compliant` rating on any one principle drives the group rating to at least `materially-non-compliant`; or whatever rule the firm uses). The executive summary is reconciled against the body before sign-off.

## Supervisory-context block too generic

Symptom: the supervisory-context block names the regulators (FRB, OCC, ECB) but does not name the operative letter or guide (SR 12-17, 12 CFR Part 30 Appendix D, ECB Guide May 2024). The reviewer cannot tell which expectations are operative.

Why it happens: the regulator-naming feels sufficient and the source-anchors file carries the detail.

Fix: the supervisory-context block names the operative letter or guide for each regulator in scope. The detail lives in `references/source-anchors.md`; the block names which anchor applies to this engagement and why.

## ECB Guide overlay mixed into BCBS 239 baseline

Symptom: an ECB-supervised entity's assessment cites ECB Guide expectations as if they were BCBS 239 baseline. A reader cannot distinguish what BCBS 239 requires from what the ECB Guide adds.

Why it happens: the ECB Guide builds on BCBS 239 and the language overlaps.

Fix: the assessment distinguishes BCBS 239 baseline from ECB Guide overlay within each affected principle (typically Principles 1, 2, 3, 6, and 11). The principle entry carries a baseline statement and an ECB-overlay statement where the overlay applies. A reviewer reading the assessment from either supervisor's lens sees the relevant content.

## Sector overlay loaded but ignored

Symptom: the assessment is on an OCC-supervised covered bank but Principle 1 and Principle 2 entries do not name the OCC Heightened Standards §II reach. Or the assessment is on an insurance group but the principles do not map to ORSA / ICP analogues.

Why it happens: the overlay file exists in references/ but the assessment-writer treated it as background reading.

Fix: when the scope names a sector, the matching `references/sector-overlays/<sector>.md` content lands as named items in the assessment. For banking, the OCC Heightened Standards §II reach lands in Principles 1, 2, and 11 where applicable. For insurance, the ORSA / ICP analogues land in the mapped principles. If the overlay is loaded but the assessment has no overlay-specific content, the loader did not run; rerun with the overlay reference in scope.
