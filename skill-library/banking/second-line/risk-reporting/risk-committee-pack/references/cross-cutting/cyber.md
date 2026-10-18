# Cyber cross-cutting overlay for risk-committee-pack

When the scope record flags `cyber` for the committee pack, this overlay sets the cyber-risk content for named pack sections. The committee pack carries the enterprise-level cyber slice; deeper material on disclosure decisions, 8-K Item 1.05 trigger analysis, and CISO-program reporting lives elsewhere.

Loaded by: `risk-committee-pack/SKILL.md` when `scope.cross_cutting_set` includes `cyber`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- NYDFS 23 NYCRR Part 500, especially §500.4(b) (CISO annual written report to senior governing body) and §500.4(d) (board oversight including approval of cybersecurity policy). Current text reflects Second Amendment (effective November 1, 2023) with phased compliance dates.
- SEC cyber disclosure rules: Regulation S-K Item 106 (cybersecurity risk management, strategy, and governance) for public-company issuers; Form 8-K Item 1.05 (material cybersecurity incident disclosure). Final rule July 2023; compliance dates phased.
- SEC Regulation S-P amendments (May 2024) for BDs, IAs, registered funds, and transfer agents: customer-information-safeguarding and breach-notice elements; 30-day customer notice. Verify current compliance dates by entity type and size at pack-write time.
- FFIEC IT Examination Handbook, Information Security and Cybersecurity sections, and the FFIEC Cybersecurity Assessment Tool (CAT; verify whether the FFIEC has formally retired or refreshed CAT at pack-write time).
- NIST Cybersecurity Framework 2.0 (February 2024) for governance and risk-management framing; NIST AI 600-1 (Generative AI Profile, July 2024) for AI-cyber considerations.
- NAIC Insurance Data Security Model Law (Model #668) for state-licensed insurers; adoption status state-by-state.
- Sector-specific overlays where applicable: PCI DSS for card-handling entities; HIPAA Security Rule for health-information-handling entities.

## What changes for cyber-flagged committee packs

### 1. Heat-map placement and rating drivers

Cyber is a standalone heat-map cell in the enterprise pack. Cell rating drivers the committee should see:

- Material cybersecurity events in the period (incident severity, customer or operational impact, regulatory-notification status, public-disclosure status).
- Threat-environment posture (targeted-threat actor activity against the firm's sector, geography, technology stack).
- Control-program maturity status (FFIEC IT-Handbook-aligned or NIST CSF-aligned, with the firm's current self-assessment or independent-assessment rating).
- Third-party / vendor cyber exposure (the cyber surface includes the firm's critical vendors; this is a recurring committee topic and a cell-rating driver).
- Open cyber MRA / MRIA-equivalent supervisory items (NYDFS Part 500 examination findings; OCC, FRB, FDIC IT-exam findings; SEC and FINRA cyber-exam findings).

Cyber rating "stable" while material events occurred in the period is an inconsistency the chair will pull on; the cell-rating commentary explains.

### 2. CISO report integration

For NYDFS-covered entities, §500.4(b) requires the CISO to report at least annually in writing to the senior governing body on the cybersecurity program. The committee pack's cyber section typically:

- References the most recent CISO report and any items requiring committee attention or decision.
- Names the standing CISO update cadence (annual at minimum; many firms run quarterly briefings to the risk committee or to a committee subgroup).
- Carries a brief on the CISO function's independence and resourcing posture; structural changes belong here.

For non-NYDFS-covered entities, the parallel content references the firm's CISO reporting cadence under the firm's information-security policy and the relevant regulator's expectations (e.g., FFIEC for banks, SEC for advisers and BDs under Regulation S-P).

### 3. Material cybersecurity events

The pack's material risk events section carries cyber events meeting the firm's materiality threshold for committee reporting (typically lower than the SEC 8-K Item 1.05 materiality standard). Each event:

- Date, event type (intrusion, data exposure, ransomware, business-email-compromise, vendor-driven event), affected systems and data, customer impact.
- Initial assessment of materiality; current assessment; any change.
- Regulatory-notification status (NYDFS Part 500 §500.17 72-hour notice; HHS Breach Notification Rule for HIPAA-covered entities; state breach-notification laws; sector-regulator notifications including SEC Reg S-P 30-day customer notice for in-scope entities).
- Public-disclosure status (SEC 8-K Item 1.05 for public-company issuers; firm's public communications posture).
- Remediation status; post-incident review status; any committee decisions taken or requested.

The pack does not make the disclosure decision; the disclosure committee or equivalent process owns that. The pack flags the event and the disclosure-process referral.

### 4. Cyber-related regulatory horizon

The forward-looking commentary's cyber component covers:

- NYDFS Part 500 amendment effective dates (Second Amendment phased compliance dates carry through 2025; verify current state at pack-write time).
- SEC Regulation S-P compliance phase-in for in-scope entities.
- Sector-specific frames where applicable (NAIC #668 state adoption changes; HIPAA Security Rule potential rulemaking).
- Threat-environment forward view (sector-specific intelligence, regulator-issued advisories).

### 5. Vendor and third-party cyber roll-up

Cyber risk on the firm's surface includes the vendor surface. The pack carries:

- Critical-vendor cyber posture summary (top-N vendors by criticality with current cyber-attestation status, recent incident or breach status, contract terms on incident notification and cooperation).
- Concentration on shared infrastructure (hyperscaler concentration, shared SaaS providers, shared identity / authentication providers); a vendor-side incident affects multiple firm activities, and the committee owns the concentration view.
- Vendor-driven cyber events in the period.

Cross-link to `third-party-operational-resilience/skills/concentration-risk-review` for the deeper vendor-concentration view.

### 6. AI-related cyber considerations

For firms with material AI use cases, the cyber section adds:

- AI-related threat surface (prompt-injection threat surface for GenAI deployments; model-supply-chain attack surface; AI-enabled social-engineering and deepfake threats).
- AI-related cyber events in the period.
- Cross-link to NYDFS Industry Letter on Cybersecurity Risks Arising from Artificial Intelligence (October 2024) for NY-licensed entities.

Detail of the AI cyber posture for individual use cases lives in the model-card cyber overlays (`ai-governance-model-risk/skills/model-card-builder/references/cross-cutting/cyber.md`); the committee pack carries the enterprise rollup.

### 7. Cross-link to other capability skills

- Cyber-disclosure decision and 8-K Item 1.05 trigger analysis: `risk-reporting/skills/cyber-disclosure-readiness`.
- Vendor-concentration view: `third-party-operational-resilience/skills/concentration-risk-review`.
- AI-specific committee pack: `ai-governance-model-risk/skills/board-ai-risk-pack`.
- KRI commentary for cyber KRIs (phishing-click rate, patching cadence, MTTR breaches): `risk-reporting/skills/kri-commentary`.

## Cyber-specific output template additions

Added to the pack (mapped to schema where present):

- `cyber_section.ciso_report_reference` — string, reference to the most recent CISO written report and any items requiring committee attention.
- `cyber_section.material_events_summary` — array, cyber-tagged entries from `material_events[]` with the disclosure-process referral status.
- `cyber_section.regulatory_notifications` — array of regulatory notifications made in the period (NYDFS §500.17, state breach-notification, SEC Reg S-P customer notice, HIPAA Breach Notification, sector-regulator notifications).
- `cyber_section.public_disclosure_referrals` — array of events referred to the disclosure committee for 8-K Item 1.05 or other public-disclosure consideration.
- `cyber_section.vendor_cyber_summary` — object with critical-vendor posture summary and shared-infrastructure concentration.
- `cyber_section.ai_cyber_considerations` — object for firms with material AI use cases, with cross-link to the AI committee pack.
- `heat_map[]` — cyber-cell commentary names the cell-rating drivers explicitly.
- `forward_looking.regulatory_horizon[]` — cyber-tagged items (NYDFS Part 500 phased dates, SEC Reg S-P compliance, NAIC #668 adoption changes).

## Common pitfalls in cyber-flagged committee packs

- Carrying the CISO report verbatim into the committee pack. The pack is committee-audience material; the CISO report is the source. The pack references the report and surfaces what requires committee attention.
- Reporting cyber events without the regulatory-notification posture and the public-disclosure-referral status. Examiners and counsel both read for these by name.
- Treating cyber materiality for the committee as the same as 8-K Item 1.05 materiality. The committee threshold is typically lower; events that do not meet the 8-K threshold can still warrant committee attention.
- Cyber rating "stable" or "improving" while material events occurred in the period without cell-rating commentary that explains the apparent inconsistency. The chair will pull on this.
- Vendor cyber treated as the vendor-management committee's problem. The committee owns the enterprise risk view; vendor cyber is a heat-map driver.
- AI-related cyber considerations buried in the model-risk section. For firms with material AI use cases, the cyber section names the AI threat surface explicitly.
- Including a multi-page CISO-report extract in the pack body. The audience is the committee; the source is the CISO report; the pack carries the brief and the linkage.
- Omitting the disclosure-process referral status when an event was reviewed by the disclosure committee. The committee's question is whether the disclosure-process gate was respected, not what the disclosure decision was.
