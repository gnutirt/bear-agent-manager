# Cyber cross-cutting overlay for kri-commentary

When the scope record flags `cyber`, this overlay sets the cyber-specific content for KRI-commentary blocks where the KRI is in the cyber population.

Loaded by: `kri-commentary/SKILL.md` when `scope.cross_cutting_overlay_set` includes `cyber`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- FFIEC IT Examination Handbook, Information Security and Cybersecurity sections, for KRI examples (security-awareness, patching cadence, MTTD / MTTR, vulnerability ageing, third-party cyber posture, identity and access exception KRIs).
- NIST Cybersecurity Framework 2.0 (February 2024), Govern function for KRI roll-up to board oversight; Identify, Protect, Detect, Respond, Recover for KRI taxonomy.
- NYDFS 23 NYCRR Part 500, especially §500.4(b) (CISO annual written report) and §500.17 (cybersecurity-event notification). Cyber-KRI commentary feeds the CISO report.
- SEC cyber disclosure rule (Release Nos. 33-11216, 34-97989, July 2023), Form 8-K Item 1.05 (material cybersecurity incident disclosure) and Regulation S-K Item 106 (cybersecurity risk management, strategy, governance). Sustained cyber-KRI deterioration is a leading indicator for the firm's disclosure-controls discipline.
- SEC Regulation S-P amendments (May 2024) for BDs, IAs, registered funds, transfer agents; customer-information-incident KRIs for in-scope entities.

## What changes for cyber-flagged KRI commentary

### 1. Disclosure-controls leading-indicator referral

For SEC registrants, sustained AMBER or RED on a cyber KRI for two or more consecutive periods triggers a disclosure-controls leading-indicator referral. The block:

- Cross-references `cyber-disclosure-readiness` Artifact C (DCP readiness map).
- Names the disclosure-process owner (typically the disclosure committee chair or general counsel).
- Carries the referral status (referred / under review / disposition documented).

The block does not make the disclosure call; it routes the leading-indicator signal to the process that owns it.

### 2. NYDFS §500.17 notification flag

For NYDFS-licensed entities, a cyber KRI block whose movement is materially driven by a cybersecurity event that meets the §500.17(a) notification threshold carries an explicit notification-status flag (notified / not-yet-notified-within-72-hours / disposition documented). The block does not assess notification materiality; the CISO and counsel own that. The block flags the event-to-KRI linkage so the committee secretary and the auditor can trace it.

### 3. CISO-report integration

For NYDFS-covered entities, the annual CISO report under §500.4(b) consumes the cyber KRI commentary set as the running record of program performance. The wrapper carries a "feeds CISO report" tag where applicable; the source-trace discipline binds the same way.

### 4. KRI taxonomy aligned to NIST CSF 2.0 functions

Where the firm's cyber KRI taxonomy aligns to NIST CSF 2.0, the block's `risk_subtype` picks up the function (Identify / Protect / Detect / Respond / Recover / Govern). This makes cross-firm benchmarking and committee-pack roll-up more legible.

### 5. AI-related cyber KRIs

For firms with material GenAI deployments, AI-cyber KRIs (prompt-injection attempt rate, AI-output safety-evaluation failure rate, AI-supply-chain incident rate) are increasingly common. The block's `contributing_factors` picks up `model-driver` where the metric movement is materially driven by AI-system behavior. Cross-reference `ai-governance-model-risk` for the deeper material.

### 6. Vendor / third-party cyber KRIs

Vendor cyber posture KRIs (top-N vendor attestation status, vendor-incident rate, vendor SLA compliance for incident notification) belong here when the scope flags both `cyber` and `third-party-operational-resilience`. The block carries the vendor-side root cause where the metric movement is vendor-driven; `contributing_factors` picks up `vendor`.

## Cyber-specific output additions

- `disclosure_controls_referral` (object): present when sustained AMBER or RED triggers the leading-indicator referral; carries `referral_status`, `disclosure_process_owner_role`, `cross_reference`.
- `nydfs_500_17_notification_flag` (string or null): present where the metric movement is materially driven by an event that may meet the notification threshold.
- `feeds_ciso_report` (boolean): set true where the wrapper feeds the annual CISO report under §500.4(b).
- `risk_subtype` aligned to NIST CSF 2.0 function names where the firm taxonomy supports it.

## Common pitfalls in cyber-flagged KRI commentary

- Sustained AMBER or RED cyber KRI without the disclosure-controls referral. SEC registrants need the leading-indicator signal to flow to the disclosure process.
- Cyber KRI block treating the metric movement and the underlying event as the same thing. The metric is the symptom; the event (or the test-design change) is the cause; the block separates them.
- NYDFS §500.17 notification-relevant events surfaced only in the material-events log and not in the cyber KRI block that captures the metric impact. The cross-link runs both ways.
- AI-cyber KRIs buried in the model-risk section with no cyber-overlay treatment. For firms with material AI deployments, the cyber block names the AI threat surface explicitly.
