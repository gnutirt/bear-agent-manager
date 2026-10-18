# Cyber cross-cutting overlay for management-response

When the scope record flags `cyber` for a management-response engagement, this overlay sets the cyber-specific evidence-of-effectiveness expectations, the response-to-disclosure-process linkage, and the cyber-program reporting cadence.

Loaded by: `management-response/SKILL.md` when `scope.cross_cutting_overlay_set` includes `cyber`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- NYDFS 23 NYCRR Part 500, especially §500.04(b) (CISO report to senior governing body), §500.04(d) (board oversight), §500.17(a) (cybersecurity-event notification within 72 hours), and §500.17(b) (annual CISO certification, Form B). Current text reflects Second Amendment effective November 1, 2023, with phased compliance dates.
- SEC cyber disclosure rules: Regulation S-K Item 106 (cybersecurity risk management, strategy, and governance) for public-company issuers; Form 8-K Item 1.05 (material cybersecurity incident disclosure). Final rule July 2023; compliance dates phased.
- SEC Regulation S-P amendments (May 2024) for BDs, IAs, registered funds, and transfer agents: customer-information-safeguarding and breach-notice elements.
- Federal banking agencies' Computer-Security Incident Notification Rule (12 CFR 53 / 225 / 304), effective May 1, 2022, with the 36-hour notification clock running from determination of a notification incident.
- FFIEC IT Examination Handbook, Information Security and Cybersecurity sections.
- NIST Cybersecurity Framework 2.0 (February 2024) for governance and risk-management framing.

## What changes for cyber-flagged management responses

### 1. Evidence-of-effectiveness expectations

Cyber findings frequently turn on whether a control redesign has actually reduced the residual risk, not just whether the control was reissued. The evidence-of-effectiveness plan section must distinguish:

- **Control-completion evidence** — the redesigned control is in place (control documentation, change-management record, training-completion record).
- **Residual-risk-reduction evidence** — the redesigned control has actually reduced the underlying risk (KRI trend showing reduction in incident rate, mean-time-to-detect, mean-time-to-respond, or relevant cyber metric; control-test results showing the control operating as designed; threat-emulation or red-team results showing the control resists realistic attack patterns).

The evidence-of-effectiveness method commonly used for cyber findings:

- **KRI trend** — two consecutive quarters of GREEN on the relevant cyber KRI (phishing-click rate, MTTR, patch-cadence compliance, vulnerability remediation cycle).
- **Control test** — independent re-test by the firm's testing function or an external party, with documented evidence of the control operating as designed.
- **External validation** — third-party assessment (penetration test, red-team engagement, control attestation) by a qualified party post-remediation.
- **Supervisor walk-through** — for findings from a supervisor who routinely conducts walk-throughs (NYDFS, OCC IT examination, FRB IT examination), a post-remediation walk-through demonstrating the control in operation.

A cyber response with an evidence-of-effectiveness method limited to "training completed" or "policy updated" is a control-completion claim, not a residual-risk-reduction claim; the response template flags this gap.

### 2. Linkage to event-notification clocks

For cyber findings where the underlying event also triggered a regulatory notification clock, the response carries explicit linkage to:

- NYDFS Part 500 §500.17 72-hour notification (where applicable; current text reflects post-Second-Amendment requirements).
- Federal banking agencies' Computer-Security Incident Notification Rule (12 CFR 53 / 225 / 304) 36-hour notification.
- SEC Form 8-K Item 1.05 4-business-day disclosure clock for material cybersecurity incidents on public-company issuers (verify current effectiveness and any post-adoption staff guidance at write time).
- SEC Regulation S-P 30-day customer notice for individuals reasonably likely to have been affected (verify compliance dates by entity type and size at write time).
- State breach-notification laws — 50-state landscape, varies by jurisdiction.

The response identifies which notifications were made, when, and where the response's action plan addresses any notification-process deficiencies the supervisor identified.

### 3. Linkage to disclosure process

For cyber findings on public-company issuers where the underlying event may have triggered or may trigger Form 8-K Item 1.05 disclosure, the response cross-links to the disclosure committee referral and to `cyber-disclosure-readiness`. The response does not make the disclosure decision; the disclosure committee owns that. The response flags:

- Whether the underlying event was referred to the disclosure committee.
- The disclosure-committee outcome (disclosed under Item 1.05; not material; deferred pending further information).
- Whether the response's action plan addresses any disclosure-process deficiencies (e.g., a finding that the firm's materiality determination process did not run on the timeline the rule requires; a finding that disclosure controls and procedures did not surface the event to the disclosure committee in time).

### 4. Linkage to CISO program reporting

For NYDFS-covered entities under §500.04(b), the management response links to the CISO's annual written report to the senior governing body. The response identifies:

- Whether the finding was surfaced in the most recent CISO report; if not, why not.
- Whether the next CISO report will reflect the remediation; the cadence of CISO reporting on the response progress.
- Whether the finding implicates the §500.17(b) Form B annual CISO certification (the CISO certifies compliance with Part 500); a finding identifying a Part 500 compliance gap may affect the next certification.

### 5. AI-related cyber findings

For findings touching AI-related cyber risk (prompt-injection on GenAI deployments, model-supply-chain attack surface, AI-enabled social engineering), the response references:

- The firm's AI risk management framework (NIST AI RMF 1.0; NIST AI 600-1 GenAI Profile).
- The cross-link to the AI committee pack (`ai-governance-model-risk/skills/board-ai-risk-pack`) where the AI-related cyber posture is reported at enterprise level.
- For NY-licensed entities, the NYDFS Industry Letter on Cybersecurity Risks Arising from Artificial Intelligence (October 2024).

### 6. Cross-link to other capability skills

- Cyber-disclosure decision and 8-K Item 1.05 trigger analysis: `risk-reporting/skills/cyber-disclosure-readiness`.
- Standing committee pack carrying the cyber slice: `risk-reporting/skills/risk-committee-pack` (cyber heat-map cell and material-events section).
- Vendor cyber findings: `third-party-operational-resilience/skills/concentration-risk-review`.
- AI-specific cyber findings: `ai-governance-model-risk/skills/board-ai-risk-pack`.

## Cyber-specific output additions

Added to the response (mapped to schema where present):

- `evidence_of_effectiveness_plan.evidence_method` — for cyber findings, commonly KRI-trend or external-validation rather than control-test alone.
- `evidence_of_effectiveness_plan.evidence_period_post_remediation` — typically two consecutive quarters of GREEN on the relevant cyber KRI, or external validation by a named qualified party.
- `linked_finding_ids` — cyber responses commonly cross-link to disclosure-process referrals and to other cyber findings sharing root cause (e.g., shared identity-and-access-management gap surfacing across multiple cyber findings).
- `interim_mitigation` — cyber responses typically carry compensating controls in place pending full remediation (enhanced monitoring on affected systems; manual review of high-risk transactions; restricted access pending IAM redesign).

## Common pitfalls in cyber-flagged management responses

- Evidence-of-effectiveness method limited to "training completed" or "policy updated". This is control-completion evidence, not residual-risk-reduction evidence. Cyber findings turn on whether the redesign actually reduced the risk; the evidence plan must reflect that.
- Disclosure-process referral status missing on findings touching events that may have triggered 8-K Item 1.05. The supervisor reads for whether the disclosure-process gate was respected; the response surfaces the referral status explicitly.
- Notification-clock linkage missing on findings where the underlying event triggered a regulatory notification. The supervisor reads for whether the firm's notification process performed as designed; the response surfaces the notification record.
- CISO-program linkage missing for NYDFS-covered entities. The §500.04(b) report and the §500.17(b) certification are the formal CISO-program touchpoints; findings should cross-link.
- AI-related cyber findings buried in general cyber response. For findings touching AI deployment, the response identifies the AI-specific element and cross-links to the firm's AI risk-management framework.
- SEC climate/cyber rule current effectiveness over-claimed. The SEC cyber disclosure rule final compliance dates are phased; verify by entity type and size at write time. Reg S-P amendments compliance dates are phased; verify at write time.
