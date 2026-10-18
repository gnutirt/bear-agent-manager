# Example: post-tuning review of a structuring-scenario threshold change

## Scenario

Regional bank, total assets in the $5-10B band. The structuring scenario was tuned in the prior quarter; the threshold was tightened from the prior baseline (the specific values are firm-confidential and do not appear in the memo). The engagement is a focused post-tuning review of the change evidence, not an annual review. Sponsor is the BSA officer; audience is the AML model risk subcommittee. Source posture is public-plus-firm-policy-plus-evidence with access to the tuning workpapers, the BTL sample, the change record in the change-governance log, the approver list, and the post-change alert volume and productivity data.

Engagement scope flags banking sector overlay. Cyber overlay not flagged.

## Output sketch

The memo opens with the model-risk frame and the change-specific scope: this review is bounded to the structuring threshold change and the evidence supporting it. Findings:

- **BTL evidence at the prior threshold is on file.** Sample size is statistically defensible against the population in the BTL window. Escalation rate and sign-off are documented; the BTL reviewer is named and is independent of the tuning team. This is a clean line; the memo records it as a strength.
- **Productivity uplift hypothesis is stated and quantified.** The tuning workpaper sets out the productivity-uplift expectation against the prior baseline with a defined denominator. The denominator definition is consistent with the firm's program-level productivity definition.
- **Reproducibility gap.** The reviewer cannot independently reproduce the productivity calculation from the artifacts on file because the calculation script is not version-controlled. The numbers may be right; the evidence chain that supports them is incomplete. Recommendation routes to the head of model risk for a calculation-reproducibility evidence gate to be added to the standard tuning workflow.
- **Approver-independence documentation gap.** The change is approved and the approval is recorded; the approver's independence from the tuning team is not documented at the change record. Recommendation: add approver-independence documentation to the standard change-record template; the gap on this specific change can be remediated by a back-fill attestation if the approver was in fact independent.
- **Post-implementation review at 90 days recommended.** Standard practice; the memo names the gate and the criteria the post-implementation review will read against (productivity at the new threshold, false-positive rate trend, SAR conversion rate trend, BTL re-test at the new threshold).

The recommended human-review gates section names: post-implementation review at 90 days (gated by AML model risk subcommittee); calculation reproducibility evidence (gated by head of model risk); approver-independence documentation gate added to standard tuning workflow (gated by BSA officer and head of model risk jointly).

## Why this scenario matters

This exercises the change-governance discipline the skill carries hardest. Tuning changes are the most-cited model-risk-touched activity in AML monitoring; the QA reads not whether the threshold is right (it is not in scope) but whether the evidence chain supporting the change is complete and the change-governance machinery functioned as designed. The reproducibility gap and the approver-independence gap are both common findings in real review work and both route to programmatic remediation, not to the specific change being un-done.
