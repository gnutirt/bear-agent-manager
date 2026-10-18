# Example: annual second-line monitoring memo, mid-size US bank

## Scenario

Mid-size US national bank, total assets in the $20-50B band, AML transaction-monitoring system covers retail deposit, commercial deposit, ACH, wire, and check products. Engagement is the annual second-line monitoring memo for the trailing twelve-month review window. Sponsor is the CRO; audience is the AML governance committee with the BSA officer and head of model risk attending. Source posture is public-plus-firm-policy-plus-evidence; the engagement has access to the firm's monitoring documentation, the model inventory, the validation report from the prior cycle, the change-governance log, and segmentation refresh artifacts.

Engagement scope flags banking sector overlay. Cyber cross-cutting overlay is not flagged at the program level for this engagement.

## Output sketch

The memo opens with program review framing: the system is in scope as a model under the named model-risk supervisory guidance, and the review is read against that frame, not as a "rules" review. Material findings:

- **Segmentation refresh overdue.** Last refresh was fourteen months ago against firm policy of twelve-month maximum cadence. Two retail and one small-business segment are affected. Recommendation routes to the AML governance committee for tuning-cycle sequencing decision; the next tuning cycle should not run on a stale segmentation base.
- **BTL testing coverage gap.** Below-the-line testing was performed for two of seven scenarios in the window; the five untested scenarios include rapid-movement-of-funds and structuring, both of which carry material productivity exposure. No documented rationale for the coverage gap. Recommendation routes to the head of model risk for BTL coverage planning before the next validation cycle.
- **Productivity decline without tuning hypothesis.** Alert productivity for the unusual-pattern-against-expected-activity scenario has declined four consecutive quarters without a documented tuning hypothesis or remediation plan on file. Recommendation routes to the BSA officer and the scenario owner for either a tuning hypothesis with documented baseline or a productivity-stabilisation plan.
- **Data-quality issue outstanding.** A deprecated wire-feed identifier issue was documented in the prior validation as a finding; remediation target dates have slipped through two cycles. Recommendation routes to the BSA officer for cross-functional escalation; data-quality issues outstanding past two cycles read as a governance gap, not a technical gap.
- **Threshold-change governance pattern observation.** Six threshold changes in the window; five carry approval evidence dated before the change effective date; one carries approval evidence dated after. Recommendation: align change-governance procedure to require pre-effective-date approval evidence on file at the change record.

The recommended human-review gates section names: segmentation refresh before next tuning cycle (gated by AML governance committee); BTL coverage plan before next validation (gated by head of model risk); productivity-decline scenarios reviewed at next monthly tuning forum (gated by BSA officer). The memo does not propose the new thresholds, the new segmentation cuts, the BTL sample sizes, or the validation scope itself; those are the change-governance machinery's calls.

The structured artifact (memo body) carries the BTL stats, productivity tables, threshold-change governance log summary, and segmentation drift indicators in named sections. The memo as a whole is the practitioner-natural Word output.

## Why this scenario matters

This is the canonical annual review and exercises the four most-cited monitoring-governance failure modes: segmentation drift overdue, BTL coverage gaps, productivity decline without tuning hypothesis, and threshold-change governance discipline. The example shows the skill staying in review-artifact scope (it surfaces gaps and routes to gates) and not crossing into approval-of-change scope. The model-risk frame at the open is the load-bearing call: the same memo without that frame would land as a "rules check" and the model-risk supervisory expectations would not enter the analysis.
