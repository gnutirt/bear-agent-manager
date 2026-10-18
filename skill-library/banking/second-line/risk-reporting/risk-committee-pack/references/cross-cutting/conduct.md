# Conduct cross-cutting overlay for risk-committee-pack

When the scope record flags `conduct` for the committee pack, this overlay sets the conduct-risk content for named pack sections. Conduct risk in second-line vocabulary is the customer-outcome and market-integrity lens, the named-manager accountability lens, and the regulatory-engagement lens; it is not the same as compliance risk and not the same as fairness as a model property. The committee pack carries the enterprise conduct-risk slice; deeper material on individual conduct events, fair-lending findings, suitability matters, and SMCR responsibility maps lives in the relevant capability or sector skills.

Loaded by: `risk-committee-pack/SKILL.md` when `scope.cross_cutting_set` includes `conduct`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- FCA Senior Managers and Certification Regime (SMCR) for UK-licensed entities, including the Senior Manager Conduct Rules and the prescribed-responsibilities map. For PRA-designated firms, the joint FCA / PRA SMCR applies.
- FCA Consumer Duty (Principle 12 and PRIN 2A, in force July 31, 2023 for new and existing products; July 31, 2024 for closed products) for in-scope FCA-regulated entities.
- US conduct-risk drivers: CFPB UDAAP authority under Dodd-Frank §1031 / §1036; ECOA / Reg B and the CFPB Circulars on AI in adverse-action notices; SEC Reg BI and the IA fiduciary duty; FINRA Rule 2010 (standards of commercial honor) and FINRA Rule 3110 (supervision); state UDAP statutes; NAIC Model #880 (Unfair Trade Practices Act).
- Conduct risk taxonomy as commonly framed by second-line conduct functions: customer outcomes, market integrity, employee conduct, regulatory engagement, financial-crime adjacency. Firm-specific taxonomy lives in `references/firm-overlay.md` when present.
- Product-governance frames: FCA PROD for in-scope UK firms; NAIC Suitability in Annuity Transactions Model Regulation (#275, with 2020 best-interest amendment) for annuity sales; FINRA Rule 2111 (suitability) and Reg BI for BD recommendations.

## What changes for conduct-flagged committee packs

### 1. Heat-map placement and rating drivers

Conduct is reported either as a standalone heat-map cell or mapped under operational with documented rationale. The choice depends on the firm's risk taxonomy:

- **Standalone cell**: typical for FCA-regulated firms where conduct is a primary regulator focus, for firms with material consumer-facing activity, and for firms where the conduct framework is mature enough to support a dedicated rating.
- **Mapped under operational or compliance**: typical for firms in early-stage conduct integration or firms with limited consumer-facing activity. The cell commentary names the conduct component explicitly.

Cell-rating drivers the committee should see:

- Customer-outcome metrics (complaint rate and complaint themes, complaint-resolution timeliness, root-cause findings on customer harm).
- Conduct-related events in the period (UDAAP exam findings, fair-lending findings, suitability matters, sales-practice issues, market-conduct findings).
- SMCR / accountability-framework status for in-scope firms (any prescribed-responsibility transition, any conduct-rule referral, any senior-manager certification issue).
- Regulatory-engagement events (CFPB inquiry, FCA Section 166 review, NAIC market-conduct exam finding, state DOI inquiry, SEC enforcement engagement on a conduct-flavored matter).

### 2. Customer-outcome view

The conduct section's customer-outcome content carries:

- Complaint-volume trend and complaint-theme analysis for the period; the firm's complaint-handling timeliness against internal SLA and regulatory expectations (Reg E §1005.11 timing, FCA DISP timing, state-specific timing).
- Customer-outcome disparity metrics where the firm tracks them: not only protected-class disparity (which sits in fair-lending reporting) but also policy-relevant-segment outcome disparity (rural, low-balance, digital-only, English-as-second-language cohorts where lawful to consider). The pack vocabulary distinguishes the two lenses.
- Material customer-harm events in the period; remediation status; restitution posture.
- Complaint-driven product or process changes implemented or contemplated in the period.

### 3. Market integrity and conduct events

For firms with material trading, sales, or market-facing activity, the pack carries:

- Surveillance-program output summary (insider-trading, market-manipulation, front-running, layering / spoofing, off-channel-communications) and any material alerts or matters in the period.
- Conduct-related disciplinary actions on employees in the period (without naming individuals); aggregate counts by category and by business unit.
- Whistleblower-line activity summary (volume, themes, material matters); whistleblower-program status posture.

### 4. SMCR and accountability-framework content for in-scope firms

For UK-licensed firms in SMCR scope, the pack carries:

- Prescribed-responsibilities map status; any change in the period; any prescribed-responsibility currently uncovered or in transition.
- Conduct-rule referrals in the period; SMR-individual conduct matters; certification-regime issues including any failed certifications.
- Section 166 review status (if any active); FCA / PRA supervisory-engagement status.

For non-SMCR firms with an internal accountability framework, the parallel content references the firm's named-accountability map and any framework changes in the period.

### 5. Regulatory-engagement view

The conduct section's regulatory-engagement content covers:

- Open inquiries from regulators with a conduct flavor (CFPB, FCA, FINRA, SEC enforcement, NAIC market-conduct, state DOI).
- Public enforcement actions against the firm in the period, with the action type, the regulator, the issue summary, and the firm's response posture.
- Industry-wide enforcement themes the firm is monitoring (e.g., off-channel-communications enforcement, AI-in-adverse-action enforcement, dark-pattern enforcement); the firm's posture against each.

### 6. Forward-looking commentary

The conduct component of forward-looking commentary covers:

- Regulatory horizon: FCA Consumer Duty implementation milestones for UK firms; CFPB rulemaking in active stages with conduct implications; SEC and FINRA conduct-related rulemaking; NAIC model-law amendments with conduct implications; state-level UDAP and AI-disclosure activity.
- Firm-level milestones: conduct-framework refresh; complaint-program redesign; surveillance-program upgrade; SMCR responsibility-map change; product-governance review.

### 7. Cross-link to other capability skills and to sector skills

- KRI commentary for individual RAG-breached conduct KRIs (complaint rate, complaint-resolution timeliness, surveillance-alert backlog): `risk-reporting/skills/kri-commentary`.
- Open-issue write-ups for conduct findings: `risk-compliance-core/skills/issue-writeup`.
- Fair-lending capability skills (fair-lending-test-plan, adverse-action-review): `consumer-compliance-fair-lending/`.
- UDAAP review: `consumer-compliance-fair-lending/skills/udaap-risk-review` (where present).
- Insurance market-conduct content: `insurance-risk-compliance/` overlays.

## Conduct-specific output template additions

Added to the pack (mapped to schema where present):

- `conduct_section.complaint_summary` — object with volume, theme analysis, timeliness, and material customer-harm events.
- `conduct_section.market_integrity_summary` — object with surveillance-program output, conduct-related disciplinary actions (aggregate counts), and whistleblower-line activity.
- `conduct_section.smcr_status` — object for UK-licensed firms with prescribed-responsibilities map status, conduct-rule referrals, and Section 166 status.
- `conduct_section.regulatory_engagement` — object with open inquiries, public enforcement actions, and industry-theme posture.
- `heat_map[]` — conduct-cell commentary names the cell-rating drivers explicitly; customer-outcome lens distinguished from protected-class lens.
- `forward_looking.regulatory_horizon[]` — conduct-tagged items (Consumer Duty, CFPB rulemaking, FINRA rulemaking, NAIC amendments, state-level activity).

## Common pitfalls in conduct-flagged committee packs

- Conflating conduct risk with compliance risk. Compliance risk is the rule-following surface; conduct risk is the customer-outcome and market-integrity lens. The two overlap; they are not the same. The pack carries each distinctly.
- Reporting customer-outcome metrics only as protected-class disparity. Protected-class disparity is the fair-lending lens; policy-relevant-segment outcome disparity is the conduct lens. Both belong, distinctly framed.
- Treating SMCR as a UK-only compliance overhead. For UK-licensed firms (including US-headquartered groups with UK subsidiaries), SMCR drives committee-relevant accountability content; the committee owns the framework, not the compliance team.
- Surveillance and market-integrity content reported as a counter (alerts opened, alerts closed) rather than as a substantive brief. The committee's question is whether the surveillance program is fit for purpose; the brief addresses that.
- Conduct-related disciplinary actions reported with individual names. The pack carries aggregate counts; individual-employee detail belongs in HR / Legal channels, not in committee material.
- Whistleblower-line activity summarized only as volume. Themes and material-matter status are the committee-relevant content.
- Industry-theme regulatory-engagement content reported as a generic warning (e.g., "off-channel-communications enforcement is a focus"). The committee-level brief names the firm's posture against each theme.
- Consumer Duty implementation status (for UK firms) reported only at first-line level. The committee owns the foreseeable-harm and customer-outcome assessment; the pack carries that ownership.
