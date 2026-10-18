# Banking sector overlay for kri-commentary

When the scope record flags `banking`, this overlay sets the KRI-commentary content for banks. It does not replace the SKILL.md workflow; it loads on top of it.

Loaded by: `kri-commentary/SKILL.md` when `scope.sector_overlay_set` includes `banking`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- 12 CFR Part 30 Appendix D (OCC Heightened Standards), Section III (Risk Appetite Statement). The KRI commentary is the running record of how the firm tracks against the RAS; `linked_ras_metric_id` is the load-bearing link.
- FRB SR 12-17 (Consolidated Supervision Framework for Large Financial Institutions, December 2012) and FRB SR 19-3 (Large Financial Institution Rating System); the KRI population the committee sees should reflect the rated-component frame.
- FRB SR 95-51 (Rating the Adequacy of Risk Management Processes), four-element framing (board oversight, policies and limits, risk monitoring and MIS, internal controls). The KRI commentary implicitly demonstrates the third element.
- FFIEC IT Examination Handbook (Information Security; Cybersecurity; Operations) for KRI examples in cyber and operational risk.
- For CCAR / DFAST cycle work: FRB SR 15-18 (capital planning) and the CCAR / DFAST instructions for the cycle. KRI commentary during a stress-test cycle carries forward the projected drift on key metrics.

## What changes for banking-flagged KRI commentary

### 1. RAS linkage is required, not optional

For Heightened Standards covered banks, every KRI block carries `linked_ras_metric_id` as required, not optional. A KRI without a RAS linkage (or with an explicit "no-link" rationale) is unfinished; the committee pack carries the RAS-status table that consumes this linkage. The link goes both ways: the KRI block names the RAS metric; the committee-pack RAS-status row points back to the KRI block.

### 2. Operational-risk KRIs dominate the population

Most committee-pack KRI populations at banks are operational-risk-heavy: external fraud, internal fraud, execution-and-process loss events, business disruption, employment-practices, clients-products-business-practices, damage to physical assets. The Basel revised principles for the sound management of operational risk (March 2021) sets the taxonomy that `risk_subtype` should align to. The commentary on operational KRIs is the bulk of the block-writing time.

### 3. CCAR / DFAST cycle posture

During a stress-test cycle, the KRI population the committee sees often includes the projected stress-driven drift on key metrics. Block commentary in a stress-test cycle:

- Names the stress scenario (severely adverse, alternative severe, firm-developed) where the KRI is being projected.
- Carries the projected breach trajectory and the assumed management actions (or absence thereof).
- Carries a `data_confidence_note` for KRIs where the stress projection rests on model output rather than realized data.

### 4. Cyber and AI KRIs

For NYDFS-licensed bank subsidiaries, cyber KRIs commonly include security-awareness (phishing-test click-through rate), patching cadence, mean time to detect / respond, and CISO-program-maturity self-rating. The cyber overlay (`references/cross-cutting/cyber.md`) loads alongside the banking overlay when the scope flags both.

For AI-enabled processes, model-risk KRIs (model performance drift, fairness metrics, override rates, governance approvals overdue) are increasingly common. The deeper model-risk material lives in `ai-governance-model-risk`; the KRI commentary carries the metric-level commentary and references the upstream owner.

### 5. Issue-log linkage

For banks under Heightened Standards or under FRB consolidated supervision, KRIs often share root causes with open MRAs, MRIAs, audit findings, or regulatory exam findings. The block's `linked_issue_ids` array picks up these foreign keys; the committee pack's issues section consumes the same IDs. Restating issue text in the block fails the no-repetition discipline.

## Banking-specific output additions

- `linked_ras_metric_id` upgraded to required (not optional).
- `risk_subtype` populated against the firm's operational-risk taxonomy aligned to the Basel revised principles (March 2021).
- `data_confidence_note` populated for stress-cycle projections where the KRI value rests on model output.

## Common pitfalls in banking-flagged KRI commentary

- KRI block omitting the `linked_ras_metric_id`. For Heightened Standards covered banks the linkage is required.
- Operational-risk KRI commentary that conflates loss events with control failures. The Basel taxonomy distinguishes the two; the commentary should follow.
- Stress-cycle KRI projection treated as a realized value. Projected metrics carry the stress-scenario tag and a data-confidence note; the committee pack must read the projection as a projection, not as outturn.
- Issue-log items restated in the KRI block. The block uses the foreign key; the issue text lives in the issue log and the committee-pack issues section.
