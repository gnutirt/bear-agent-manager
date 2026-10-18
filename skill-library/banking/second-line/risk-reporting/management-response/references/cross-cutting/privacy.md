# Privacy cross-cutting overlay for management-response

When the scope record flags `privacy` for a management-response engagement, this overlay sets privacy-specific evidence-of-effectiveness expectations and the linkage to customer-notification clocks for findings touching customer-information safeguarding, breach-notice procedures, and consumer-financial-data handling.

Loaded by: `management-response/SKILL.md` when `scope.cross_cutting_overlay_set` includes `privacy`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- Gramm-Leach-Bliley Act Safeguards Rule (FTC, 16 CFR Part 314), revised December 2021 with phased compliance dates including the June 2023 amendments adding the breach-notice provision (16 CFR §314.5).
- Regulation P (Privacy of Consumer Financial Information), 12 CFR Part 1016 (CFPB) and 12 CFR Part 332 (FDIC) and parallel federal banking agency rules.
- SEC Regulation S-P (17 CFR §248.30), as amended May 2024, with customer-information-safeguarding, breach-notice, and 30-day customer-notice requirements; phased compliance dates by registrant type and size.
- FTC Health Breach Notification Rule (16 CFR Part 318) for non-HIPAA-covered health-related entities including some fintech firms.
- State privacy laws including California Consumer Privacy Act / California Privacy Rights Act (CCPA / CPRA), and state breach-notification statutes (50-state landscape).
- HIPAA Privacy Rule, Security Rule, and Breach Notification Rule (45 CFR Parts 160, 162, 164) for HIPAA-covered entities (including some fintech firms operating in health-adjacent products).

## What changes for privacy-flagged management responses

### 1. Customer-notification clock reconciliation

Privacy findings frequently relate to events that also triggered customer-notification clocks. The response carries explicit linkage to:

- SEC Regulation S-P 30-day customer notice for individuals reasonably likely to have been affected (verify compliance dates by entity type and size at write time).
- GLBA Safeguards Rule notification provisions (16 CFR §314.5) requiring notification to the FTC within 30 days of discovery for security events involving the unauthorized acquisition of unencrypted customer information of 500 or more consumers.
- State breach-notification clocks (varies by state; many require notice "without unreasonable delay" or within specified day counts; some require simultaneous notice to state attorneys general or other state regulators).
- HIPAA Breach Notification Rule (60-day clock for HHS notice for breaches affecting fewer than 500 individuals; without unreasonable delay for breaches affecting 500 or more, plus media notice).

The action plan dates must reconcile with the customer-notification clock; a milestone for notice that lands after the regulatory clock has run is itself a finding the supervisor will surface.

### 2. Customer-remediation strand

For privacy findings where customers were affected, the response carries the customer-remediation strand alongside the control-redesign strand:

- Customer-notification methodology (how the affected customer population is identified; what notice form is used; how notice is delivered).
- Customer-protection offerings (credit monitoring, identity-protection services, where applicable; the form, duration, and cost-to-firm).
- Customer-remediation reporting (how the firm reports customer-remediation completion to the supervisor, separately from control-redesign reporting).

### 3. Evidence-of-effectiveness expectations

Privacy findings turn on whether the safeguarding gap has been closed, not just whether the policy was updated. The evidence-of-effectiveness plan section must distinguish:

- **Policy-completion evidence** — the safeguarding policy is updated, training is delivered, attestations are collected.
- **Control-effectiveness evidence** — the safeguarding control is operating as designed (access-review run with documented exception count and resolution; data-loss-prevention rule operating with documented detection-and-response evidence; vendor-information-handling attestation collected with documented evidence).

The evidence-of-effectiveness method commonly used for privacy findings:

- **Control test** — independent re-test by the firm's testing function, with documented evidence of the safeguarding control operating as designed.
- **KRI trend** — two consecutive periods of GREEN on the relevant privacy KRI (data-loss-prevention exception count, access-review exception count, vendor information-handling attestation completion).
- **External validation** — third-party assessment for higher-severity findings or where the supervisor specifies.

### 4. Linkage to GLBA / Safeguards Rule program

For Safeguards Rule-covered entities, the management response links to:

- The qualified-individual designation (16 CFR §314.4(a)) and whether the finding implicates the qualified individual's program oversight.
- The risk-assessment requirement (16 CFR §314.4(b)) and whether the finding implicates the risk-assessment process or content.
- The continuous-monitoring requirement (16 CFR §314.4(c)) and whether the finding implicates monitoring effectiveness.
- The annual report to the board or governing body (16 CFR §314.4(i)) and whether the next report will reflect the remediation.

### 5. Linkage to Reg P / Reg S-P privacy program

For Regulation P-covered entities (banks) and Regulation S-P-covered entities (BDs, IAs, registered funds, transfer agents), the response links to the privacy notice and the opt-out mechanism, where the finding implicates either.

### 6. Cross-link to other capability skills

- Underlying issue write-up: `risk-compliance-core/skills/issue-writeup`.
- Standing committee pack: `risk-reporting/skills/risk-committee-pack`.
- Cyber overlay where the finding overlaps with cyber: `references/cross-cutting/cyber.md`.
- Conduct overlay where the finding overlaps with consumer conduct: `references/cross-cutting/conduct.md`.

## Privacy-specific output additions

Added to the response (mapped to schema where present):

- `interim_mitigation` — privacy responses commonly carry the customer-notification step itself as an interim mitigation (where notification occurred before the full remediation was complete).
- `action_plan_milestones[].evidence_of_completion_expected` — for milestones touching customer notification, evidence is the notification log with delivery confirmation, not just the policy approval.
- `evidence_of_effectiveness_plan.evidence_method` — for privacy findings, commonly control-test or KRI-trend rather than external-validation alone (external validation is more commonly used for cyber).
- `linked_finding_ids` — privacy responses commonly cross-link to cyber findings on the same event and to consumer-conduct findings where the affected population is consumer-financial.

## Common pitfalls in privacy-flagged management responses

- Action-plan dates that miss the customer-notification clock. The notification clock is set by statute or rule; the action plan must reconcile, with notice within the clock and the deeper remediation following.
- Customer-remediation strand omitted on findings where customers were affected. Privacy findings frequently turn on customer remediation; the response carries this strand alongside the control strand.
- Evidence-of-effectiveness method limited to "policy updated and training delivered". This is policy-completion evidence, not control-effectiveness evidence; the response must distinguish.
- GLBA / Safeguards Rule program linkage missing for Safeguards-covered entities. Findings should reference the qualified individual, the risk assessment, the continuous monitoring, and the annual report as applicable.
- Reg P / Reg S-P program linkage missing for entities subject to those rules. Privacy findings touching the privacy notice or opt-out mechanism should reference the rule.
- 50-state breach-notification landscape ignored. For events affecting consumers in multiple states, the response identifies the state-by-state notification posture, especially where state clocks differ from the federal clock.
