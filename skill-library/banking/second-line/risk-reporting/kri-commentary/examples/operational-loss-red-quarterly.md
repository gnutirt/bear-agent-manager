# Example: RED operational-loss KRI commentary for the quarterly committee pack

Public-source-derived. No named institution. Framing patterns from BCBS 239 (January 2013) Principles 7 and 9, the Basel revised principles for the sound management of operational risk (March 2021), and OCC Heightened Standards (12 CFR Part 30 Appendix D) Section III on the risk appetite statement.

## Input

- Institution: large covered bank under OCC Heightened Standards. Operational risk is the firm's largest non-credit risk type by economic capital and by management attention.
- Engagement scope supplied: primary regulators OCC and FRB; persona = head of operational-risk reporting, second line, reporting to the CRO; sector overlay = banking; cross-cutting overlay = none for this block (cyber and climate not relevant to this KRI); source posture = public-plus-firm-policy-plus-system-of-record-evidence.
- KRI: `OPS-001 / Operational loss events > $1m`. Threshold structure: limit = $10m gross loss in quarter, trigger = $7.5m, tolerance = $5m. Current value = $14.8m. Prior quarter = $9.2m (AMBER). Two consecutive periods at trigger or breach.
- First-line ORM has produced a draft commentary attributing the breach to "elevated external fraud activity". Second-line is rewriting.
- Linked feeds: the firm's loss-event log for the period, the post-event reviews on the three discrete loss events that drove the movement, the issue log, and the most recent BCBS 239 self-assessment (no known limitations bearing on this metric).

## Output sketch

The skill emits a per-KRI block plus the wrapper headers. Headlines for this block:

- **Header table** — risk type = operational; subtype = external-fraud; current = $14.8m gross; prior = $9.2m; direction = deteriorating; RAG current / prior = RED / AMBER; breach status = breach; breach age = 2 periods; linked RAS metric = RAS-OP-EXT-FRAUD; owner = head of operational-risk reporting (role, not name).
- **Root cause (named)** — three discrete loss events drove $11.2m of the $14.8m: (i) account-takeover fraud on the digital channel, single event $6.4m, in May; (ii) check-kiting ring, single event $3.1m, in June; (iii) wire-fraud impersonation on a corporate-banking customer, single event $1.7m, in June. The remaining $3.6m sits across a long tail of smaller events consistent with the prior-period mix.
- **Contributing factors** — `control-failure` (digital-channel step-up authentication did not trigger for two of the account-takeover sub-events; documented in the post-event review of event (i)); `external-driver` (industry-wide uptick in check-kiting reported by the federal financial-crime intelligence body covering the period); `vendor` (the third-party fraud-screening service had a 14-hour outage during the wire-fraud event window, see Material Event ME-2025-Q2-003).
- **Action taken in period** — digital-channel step-up authentication policy revised and deployed (Owner: CISO; Completed: July 11; Evidence: change-management ticket CHG-44218). Wire-fraud impersonation control retraining for corporate-banking RMs (Owner: head of corporate banking; Completed: July 22; Evidence: training-completion record).
- **Action planned** — review of the third-party fraud-screening service exit plan and dual-vendor architecture (Owner: head of vendor management; Target: end of Q3; Dependencies: ISS-2025-0723). Update of the operational-risk RAS metric on external-fraud loss tolerance (Owner: CRO; Target: presentation at the next risk committee).
- **Residual-risk view** — Expected RAG next quarter: AMBER, not GREEN. Rationale: three months is insufficient to establish trend; the check-kiting external driver persists per current threat intelligence; the dual-vendor architecture is not yet in place.
- **Linked items** — Issues: ISS-2025-0712 (digital-channel control-design issue), ISS-2025-0723 (vendor outage issue). Material events: ME-2025-Q2-003.
- **Second-line challenge note** — first-line attribution of "elevated external fraud activity" understates the control-failure component (specifically the digital-channel step-up authentication gap). The second-line view is that the breach is materially driven by control failure, not external environment alone; the RAS-recalibration request must reflect this.
- **Threshold recalibration request** — none from the second line; the first-line proposal to widen the trigger from $7.5m to $9m is being challenged on the same grounds as the root-cause attribution.
- **Data confidence note** — none; the loss-event evidence is well-documented at source.
- **Source trace** — every material claim mapped to its source (loss-event log, post-event reviews, change-management ticket, training-completion record, vendor incident report). Confidence: high across the block.
- **Confidence label** — high. The loss-event evidence is well-documented; the control-failure root cause is supported by the post-event review.

The wrapper aggregate counts and the cross-KRI correlations sit alongside the other KRI blocks for the period; for this set the operational-loss KRI is one of three RED blocks and shares no cross-KRI correlation.

## Why this scenario matters

- Multi-period breach with named root cause. The skill rejects "investigation ongoing" for breach age > 1; this block resolves to three discrete events with named drivers.
- Second-line challenge is explicit. First-line attribution to "elevated external fraud activity" is weak; the second-line view names the control-failure component and the threshold-recalibration challenge.
- Action plans carry owners (roles, not names) and target dates. Action items missing owner or target date are rejected by the schema.
- Residual-risk view is grounded. Expected RAG = AMBER, not GREEN, because the action plan has not yet completed and the external driver persists.
- Linked issues and material events are populated by foreign key. Downstream the committee pack consumes these references.

## Anchors

- BCBS 239 (January 2013), Principles 7 (accuracy of the loss attribution) and 9 (clarity and usefulness; the prior commentary was not actionable).
- Basel Committee, Revisions to the Principles for the Sound Management of Operational Risk (March 2021), KRI taxonomy in operational risk.
- 12 CFR Part 30 Appendix D Section III (Risk Appetite Statement), the linkage between the KRI breach and the RAS metric carried in the committee pack.
- COSO ERM (June 2017), Performance component, the residual-risk view framing.

See `references/source-anchors.md` for full citations and verification flags.
