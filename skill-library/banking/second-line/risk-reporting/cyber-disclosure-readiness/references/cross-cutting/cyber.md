# Cyber cross-cutting overlay for cyber-disclosure-readiness

This skill is the cyber disclosure skill, and the cyber overlay is its core anchor set kept in references so SKILL.md remains a workflow rather than a regulatory primer. The overlay collects the cyber-specific anchors the three artifacts depend on, and notes what each contributes.

Loaded by: `cyber-disclosure-readiness/SKILL.md` always (this is the core anchor set, not optional). Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

Primary cyber anchors (this skill's spine):

- SEC Cybersecurity Risk Management, Strategy, Governance, and Incident Disclosure Final Rule, Release Nos. 33-11216 / 34-97989 (adopted July 26, 2023). Phased effective dates: Item 1.05 December 18, 2023 (non-SRC) and June 15, 2024 (SRC); Item 106 for fiscal years ending on or after December 15, 2023 (large filers) with phased SRC applicability.
- Form 8-K Item 1.05 — Material Cybersecurity Incidents (17 CFR §249.308). Four-business-day clock from materiality determination. Instruction 1 covers a series of related occurrences. Item 1.05(b) addresses material amendments. Item 1.05(c) provides the AG delay provision.
- Regulation S-K Item 106 — Cybersecurity Risk Management, Strategy, and Governance (17 CFR §229.106). Subitems 106(b) (risk management and strategy with five enumerated elements) and 106(c) (governance with board-oversight and management-role elements).
- Exchange Act Rule 13a-15 / 15d-15 — Disclosure controls and procedures. Defines DCP at Rule 13a-15(e); the cyber-disclosure trigger flow is the cyber cut of the firm's DCP framework.
- Form 6-K and Form 20-F Item 16K — Foreign private issuer treatment. FPIs are not subject to Form 8-K and report material cyber information on Form 6-K when otherwise public; Form 20-F Item 16K parallels Item 106 for the FPI annual disclosure.
- SEC Compliance and Disclosure Interpretations (C&DIs) for Form 8-K Item 1.05 and Regulation S-K Item 106. Post-adoption staff guidance on materiality determination process timing, delay-provision mechanics, voluntary Item 1.05 filings, ransomware-payment considerations, and aggregation under Instruction 1.

Materiality-standard anchors:

- TSC Industries, Inc. v. Northway, Inc., 426 U.S. 438 (1976) — substantial-likelihood standard.
- Basic Inc. v. Levinson, 485 U.S. 224 (1988) — applied TSC in the Section 10(b) / Rule 10b-5 context; probability-magnitude analysis for forward-looking or contingent events.

Parallel-clock anchors that surface in Artifact A's parallel-clocks table for in-scope registrants:

- Federal banking agencies' Computer-Security Incident Notification Rule (12 CFR Part 53 OCC; 12 CFR Part 225 Subpart N FRB; 12 CFR Part 304 Subpart C FDIC), effective May 1, 2022. 36-hour clock from determination of a notification incident; 4-hour bank-service-provider customer-notification trigger.
- NYDFS 23 NYCRR Part 500 §500.17(a) — 72-hour notice from determination of cybersecurity event meeting the rule's thresholds. §500.17(c) — 24-hour notice of extortion payment (Second Amendment).
- SEC Regulation S-P amendments (Release Nos. 34-100155 et al., May 16, 2024). Amends 17 CFR Part 248.30. 30-day customer-notification clock from awareness of unauthorized access to sensitive customer information.
- HIPAA Breach Notification Rule (45 CFR §§164.400-414) — 60-day individual-notice clock; concurrent HHS notice for 500-or-more-affected.
- GLBA Safeguards Rule (16 CFR Part 314, FTC) and Interagency Guidelines (12 CFR Part 30 Appendix B for OCC; 12 CFR Part 208 Appendix D-2 for FRB; 12 CFR Part 364 Appendix B for FDIC) plus the 2005 Interagency Guidance on Response Programs.
- State breach-notification laws (varies by state; multi-state firms map state-by-state).
- NAIC Insurance Data Security Model Law (Model #668) §6 — 72-hour notice for state-licensed insurers; state adoption varies.
- FINRA Rule 4530 — reporting requirements for FINRA-member broker-dealers; cyber events meeting 4530(a) or (d) thresholds.

Operational and supervisory frames:

- NIST Cybersecurity Framework 2.0 (CSWP 29, February 26, 2024) — Govern function maps to Item 106(c); Identify-Protect-Detect-Respond-Recover map to Item 106(b).
- **NIST SP 800-61 Rev. 3 — Incident Response Recommendations and Considerations for Cybersecurity Risk Management: A CSF 2.0 Community Profile (April 3, 2025)**, superseding Rev. 2 (Computer Security Incident Handling Guide, August 2012). Rev. 3 re-maps incident-response activities into CSF 2.0 functions (Govern, Identify, Protect, Detect, Respond, Recover) rather than the Rev. 2 four-phase lifecycle. Underpinning the timeline section in Artifact A; verify which revision the firm's IR function operates under.
- FFIEC IT Examination Handbook Information Security booklet (September 2016) — bank-supervisory expectations for incident response and cybersecurity governance.

## What changes for the workflow

### 1. The materiality-determination workpaper is the cyber-distinct artifact

Cyber-incident materiality is distinct from financial-statement materiality (the SAB 99 quantitative-qualitative composite) and from prior FD-driven materiality. The TSC standard is the rule-incorporated standard but the application to a cyber incident requires:

- A facts-as-known posture that distinguishes what is known from what is reasonably knowable as of the determination date. Cyber-incident facts develop quickly; the workpaper records the snapshot used for determination.
- A quantitative-and-qualitative composite. Quantified financial impact is often unknown or partial at the determination date; qualitative factors (reputation, regulatory consequence, strategic exposure, competitive position) frequently dominate.
- An aggregation analysis under Instruction 1 to Item 1.05. Related occurrences aggregate; the empty-array case is a stated determination, not an absence.

The workpaper is the evidence that the disclosure committee made the determination it did on the facts available; in any subsequent enforcement question, the workpaper is what gets read first.

### 2. The 4-business-day clock starts at materiality determination

The single most-cited error in early Item 1.05 filings is conflating the clock-start date with detection. The schema's `disclosure_clock_start` field equals `materiality_determination_date`, not `detection_date`. The DCP trace records the gap between detection and determination (as a process metric for time-to-determination); the gap is not a clock-violation question unless determination was unreasonably delayed.

"Without unreasonable delay" in determining materiality is the SEC's qualifier; the DCP's materiality time-box exists to evidence that determination was not unreasonably delayed.

### 3. Item 1.05 disclosure draft has four required elements and stops there

The four elements: nature, scope, timing, material impact (or reasonably likely material impact). Disclosure drafts that include forensic detail, IOCs, threat-actor identification, remediation specifics, or system-name detail go beyond the rule's requirements and frequently against Reg FD (selective-disclosure considerations) and against ongoing-investigation-prejudice posture.

The "to the extent known" framing is required where the determination is made before scope is fully understood; the rule contemplates this.

### 4. Item 106 governance disclosure is governance-content-loaded

The Item 106(c) board-oversight subsection names the specific board committee, the cadence, and the processes by which the board or committee is informed. "The appropriate management committee oversees cybersecurity risk on an ongoing basis" reads as boilerplate and is what reviewers flag.

The Item 106(c) management-role subsection names the positions / committees, the named expertise (CISO with credentials), and the reporting line. "The Company's cybersecurity organization is led by experienced professionals" reads as boilerplate.

### 5. Year-over-year diff on Item 106 is required practice

The Item 106 disclosure is annual; the underlying facts (board cadence, management positions, third-party engagements, material effects) change. Rolled-forward-unchanged Item 106 is a frequent finding from internal audit and from securities counsel review. The schema's `year_over_year_diff` array is where the analysis lives; "no substantive change — refreshed for currency" is an acceptable rationale, but the analysis is required.

### 6. The DCP map is the framework backbone

Artifact C is what an examiner asks for when the question is "how does an incident move through the firm to the materiality call". The map names:

- Trigger detection points with named owner roles and time-to-triage SLAs.
- Escalation paths first-line to second-line to GC office to disclosure committee.
- Materiality-determination protocol with named decision-makers, criteria framework, time-box, and tie-break.
- Documentation requirements per stage (the audit-evidence backbone for the DCP).
- Gaps and remediation with severity and target date.

The DCP map's existence and exercise is the evidence that DCP under Rule 13a-15 functioned for cyber. It is what 302 / 906 certifications reach for in the cyber cut.

### 7. Voluntary Item 1.05 filings carry a different posture

A registrant filing under Item 1.05 for a non-material incident receives reduced safe-harbor treatment per SEC staff C&DIs; voluntary filings are filed under Item 8.01 with a narrative that does not invoke Item 1.05's materiality assertion. Artifact A's `materiality_determination` field has a `not-material` enum value precisely so the workpaper records the determination, and the disclosure draft (where any) routes to Item 8.01 rather than Item 1.05.

## Common pitfalls

- Treating the materiality call as the cyber team's call. Materiality is a disclosure determination made by the disclosure committee with securities counsel input; the cyber team contributes facts and quantitative inputs.
- Conflating clock-start with detection. The 4-business-day clock starts at materiality determination.
- Over-disclosure of incident detail. The four required elements bound the Item 1.05 draft; forensic detail, IOCs, named threat actors, and remediation specifics do not appear.
- Missing aggregation analysis. Empty-array aggregation is a stated determination, not an absence.
- Stale Item 106 disclosure. Year-over-year diff and rationale is required.
- Foreign-private-issuer confusion. FPIs report on Form 6-K, not 8-K; Form 20-F Item 16K is the FPI annual disclosure.
- Treating "reasonably likely material impact" as speculative. The "or reasonably likely to materially affect" framing has substance and requires disclosure of reasonably foreseeable impact.
- Voluntary Item 1.05 filing. Non-material incidents file under Item 8.01, not Item 1.05; the safe-harbor treatment differs.
- Including the DCP map in the public disclosure. The DCP map is the firm-side evidence; Item 106(b) discloses the processes, not the map.
- Ignoring the federal banking agency's bank-service-provider 4-hour customer-notification trigger when the firm is a bank service provider. The 4-hour trigger runs from the service-provider side and is independent of the registrant-side 36-hour clock.
