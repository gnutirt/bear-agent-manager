# Insurance sector overlay for cyber-disclosure-readiness

When the scope names insurance, the NAIC Insurance Data Security Model Law (Model #668) §6 carries a 72-hour cyber-event-notification clock to the state insurance commissioner in adopting states; state DOI-specific cyber-event timelines apply on top of state breach-notification mosaic; and NAIC Bulletin December 2023 (third-party AI accountability) interacts where AI is in the cyber surface.

Loaded by: `cyber-disclosure-readiness/SKILL.md` when `scope.sector_overlay_set` includes `insurance`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- NAIC Insurance Data Security Model Law (Model #668), 2017. §4 (information security program); §6 (notification of cybersecurity event) — 72-hour clock to commissioner. State adoption varies; verify the specific state DOI's adoption status and any state-specific deviations at draft time.
- NYDFS 23 NYCRR Part 500 §500.17 — 72-hour notice of cybersecurity event for NYDFS-licensed entities (including NYDFS-licensed insurers).
- HIPAA Breach Notification Rule (45 CFR §§164.400-414) for health-insurance carriers and business associates.
- NAIC Insurance Information and Privacy Protection Model Act (Model #670) and Privacy of Consumer Financial and Health Information Regulation (Model #672) — privacy frameworks for state-licensed insurers; current adoption varies.
- NAIC Bulletin on the Use of Artificial Intelligence Systems by Insurers (Model Bulletin, December 2023) — third-party AI accountability and AIS Program elements; relevant where AI is in the cyber surface.
- State insurance department-specific cyber-event-notification orders and bulletins (varies by state; CA, NY, TX, IL, FL frequently have additional state-specific guidance) [verify state-specific orders at draft time].
- SEC 8-K Item 1.05 and Item 106 apply where the insurer is a public-company filer (a holding-company structure with the insurance entity as a subsidiary frequently has the holding company as the SEC registrant).

## What changes for insurance-flagged disclosure-readiness work

### 1. The NAIC Model #668 72-hour clock joins the parallel-clocks table

For state-licensed insurers in adopting states (NY, SC, OH, MS, AL, MI, DE, LA, NH, VA, IN, CT, TN, IA, ND, ME, WI, MN, KY, HI, FL, AK [verify current adopting states at draft time]), §6 of Model #668 requires notification to the commissioner as promptly as possible but in no event later than 72 hours after a determination that a cybersecurity event has occurred meeting the rule's thresholds.

Adopting states sometimes vary the threshold or the timeline. Verify the specific state DOI's text at draft time. Multi-state insurers map state-by-state.

### 2. NYDFS §500.17 for NYDFS-licensed insurers

NYDFS-licensed insurers (life, health, P&C in NY) are NYDFS-covered entities subject to 23 NYCRR Part 500. The §500.17(a) 72-hour clock and the §500.17(c) 24-hour extortion-payment clock apply alongside the Model #668 clock for insurers licensed in both NY and other adopting states.

### 3. HIPAA scope for health-insurance carriers

Health-insurance carriers are HIPAA-covered entities. The HIPAA Breach Notification Rule (60-day individual notice; concurrent HHS for 500+; annual log for under-500) applies in addition to NAIC Model #668 and NYDFS §500.17. The pack flags health-carrier status and carries the HIPAA clock in the parallel-clocks table.

Business-associate scope (insurers acting as TPAs, providing FNOL services to other carriers, processing PHI on behalf of healthcare-affiliated counterparties) brings the BAA-side HIPAA obligations.

### 4. NAIC Bulletin December 2023 — AI accountability

Where AI is in the cyber surface (the firm uses AI in underwriting, claims handling, FNOL triage, fraud detection, or customer-facing functions), the NAIC Bulletin on the Use of Artificial Intelligence Systems by Insurers (Model Bulletin, December 2023) sets expectations on:

- Senior management and board accountability for the AIS Program.
- Third-party AI vendor governance and the firm's accountability for vendor model failures.
- Testing and validation of AI systems.
- Documentation of AI-system development, deployment, and monitoring.

A cyber incident involving an AI system (model-poisoning, prompt-injection of an AI-driven customer service or claims-triage system, vendor LLM compromise) interacts with the Bulletin's expectations on AIS Program governance and third-party accountability. The pack carries the AIS-Program-aligned narrative where AI is implicated.

### 5. State DOI cyber-event notification specifics

State DOIs frequently issue additional guidance, orders, or bulletins on cyber-event notification beyond Model #668's 72-hour clock. Examples (illustrative; verify current state guidance at draft time):

- Some states require concurrent notification to the state attorney general or to specific consumer-protection authorities.
- Some states require additional content elements in the notification (root-cause summary, remediation status, affected-individual count by state).
- Some states require ongoing status updates beyond the initial 72-hour notice.

The pack tracks state-specific deviations.

### 6. Public-company holding-company structure

Many large insurers are organized as holding-company structures with the holding company as the SEC registrant and one or more state-licensed insurance subsidiaries. The SEC Item 1.05 8-K and Item 106 10-K disclosures apply at the holding-company level. The Model #668 §6 and NYDFS §500.17 obligations apply at the licensed-insurer-subsidiary level.

The pack handles the dual-reporting structure: the disclosure committee at the holding-company level, the insurance-subsidiary CISO and compliance function at the entity level, with information flowing up to the disclosure committee for the SEC determination and laterally to each state DOI for the state-licensed-insurer obligations.

### 7. Investment-and-insurance complex

Some insurers operate as part of a complex with broker-dealer, investment-adviser, and registered-fund affiliates (e.g., variable-annuity issuers with affiliated broker-dealers and registered separate accounts). For these, the capital-markets sector overlay's Reg S-P, FINRA Rule 4530, and Form N-CSR considerations apply on top of the insurance-specific obligations.

## Insurance-specific output additions

When insurance is in scope:

- Artifact A's parallel-clocks table includes the NAIC Model #668 72-hour row (per state adopting), the NYDFS §500.17 72-hour row if NYDFS-licensed, the HIPAA Breach Notification Rule rows for health-insurance carriers, and state DOI-specific deviations.
- Artifact A's facts-of-the-incident row characterizes whether AI is implicated (and if so, the AIS-Program-aligned narrative per NAIC Bulletin December 2023).
- Artifact B's Item 106(b) draft references the firm's information-security program in NAIC Model #668 §4-aligned terms where applicable.
- Artifact B's Item 106(c) draft for a holding-company registrant names the holding-company-level board committee with cyber oversight (typically the Risk Committee) and the information flow from insurance-subsidiary CISOs.
- Artifact C's DCP map documents the insurance-subsidiary-to-holding-company information flow and the state-DOI parallel reporting tracks.

## Common pitfalls

- Treating Model #668 as uniform across adopting states. State-specific deviations on threshold, timeline, and content matter.
- Missing the NAIC Bulletin December 2023 alignment when AI is in the cyber surface. AI-related cyber incidents have an AIS-Program governance dimension.
- Conflating the holding-company SEC determination with the insurance-subsidiary state-DOI obligations. The two run on different timelines and to different audiences.
- Omitting HIPAA Breach Notification Rule obligations for health-insurance carriers or for business associates of healthcare counterparties.
- Naming a generic "Risk Committee" in the Item 106(c) governance disclosure for an insurance holding company without distinguishing the holding-company committee from the insurance-subsidiary board governance, where the firm operates with separate insurance-subsidiary boards.
- Treating a cyber incident at an insurance subsidiary as a non-issue at the holding-company level when the subsidiary's operational disruption is material to the holding company's results.
- Failing to surface state DOI-specific orders or bulletins beyond Model #668 in the parallel-clocks table.
