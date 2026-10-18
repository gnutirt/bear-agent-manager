# Capital-markets sector overlay for management-response

When the scope record names `capital-markets` for a management-response engagement, this overlay sets markets-supervisor and self-regulatory-organisation conventions for the response artifact.

Loaded by: `management-response/SKILL.md` when `scope.sector_overlay_set` includes `capital-markets`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- SEC Division of Examinations protocol: deficiency letters issued at the conclusion of broker-dealer, investment-adviser, registered-fund, and transfer-agent examinations, with the firm's response appended to the deficiency letter file.
- FINRA examination protocol: deficiency letters issued by FINRA at the conclusion of broker-dealer examinations under FINRA Rule 9000 series; FINRA Rule 4530 (reporting requirements) for related event reporting.
- CFTC examination conventions for futures commission merchants and swap dealers, under CFTC Regulation 1.10 series and the National Futures Association's parallel examination framework.
- Investment Advisers Act Rule 206(4)-7 (compliance program rule) and Investment Company Act Rule 38a-1 (fund compliance program rule) — the underlying obligations frequently cited in adviser and fund examination findings.
- Exchange Act Rules 15c3-1 (net capital) and 15c3-3 (customer protection) — frequently cited in broker-dealer examination findings.

## What changes for capital-markets-flagged management responses

### 1. Addressee conventions

- **SEC EXAMS deficiency letters**: addressee is the SEC examination office identified in the deficiency letter (the regional office or the home-office division). The response form follows the SEC's deficiency-letter protocol; the response is typically due within 30 days of the deficiency letter date unless the SEC specifies otherwise.
- **FINRA examination findings**: addressee is the FINRA examination office identified in the deficiency letter. The response form follows FINRA's protocol; typical response window is 30 days.
- **CFTC and NFA findings**: addressee is the CFTC division office or the NFA examination office, per the communication. CFTC findings on registered FCMs and SDs are coordinated with NFA where NFA conducts the examination.
- **Disclosure Effectiveness Initiative comments and other SEC Corporation Finance comments**: separate workflow; not in scope for this overlay (those go through securities counsel, not through the management-response artifact).

### 2. Severity convention

SEC EXAMS and FINRA examination findings use a different severity convention from the federal-banking-agency MRA / MRIA distinction:

- **Deficiencies** — formal findings of non-compliance or weakness; the firm is expected to respond with a remediation plan. The deficiency-letter cover identifies whether the SEC or FINRA may make a referral to enforcement.
- **Risk Alerts and observations** — informal findings that the firm may consider but is not required to remediate; the response (where the firm chooses to file one) is shorter.
- **Enforcement referral indicators** — language in the deficiency letter that signals possible enforcement consideration; the response is typically reviewed by securities counsel before submission and may not follow the standard management-response form (counsel may direct a different posture, including silence pending counsel-led engagement with the staff).

### 3. Response window and form

- **SEC EXAMS**: 30-day response window typical; the response is a written letter from the firm (commonly signed by the CCO of the registered entity, or by the CEO for material deficiencies). The response is appended to the deficiency-letter file and read at the next examination cycle.
- **FINRA**: 30-day response window typical; the response is a written letter signed by the responding role at the broker-dealer (commonly the CCO or the CEO for material deficiencies). Material deficiencies may also trigger a Wells process; counsel-led if so.
- **Item 1.05 / 8-K interaction**: where the underlying event is a cybersecurity incident that may also trigger 8-K Item 1.05 disclosure obligations on the public-company parent, the management response and the disclosure decision are separate workflows. The response carries cross-link to `cyber-disclosure-readiness` for the disclosure-process referral.

### 4. Linkage to compliance program rules

For investment advisers, findings frequently cite Rule 206(4)-7 (the compliance program rule); the response identifies which element of the compliance program (written policies and procedures; annual review; chief compliance officer designation) the finding implicates.

For registered funds, findings frequently cite Rule 38a-1 (the fund compliance program rule); the response identifies the implicated element including fund-board oversight where applicable.

For broker-dealers, findings frequently cite supervisory rules (FINRA Rule 3110 supervision; FINRA Rule 3120 supervisory control system); the response identifies the implicated element of the supervisory system.

### 5. Adviser-firm vs fund-board scope

Where the finding touches a registered fund as well as the adviser, the response distinguishes adviser-firm scope from fund-board scope:

- Adviser-firm response is filed by the adviser to the SEC; addressed to the SEC examination office.
- Fund-board response is filed separately by the fund (signed by an officer of the fund or by an independent director of the fund board); addressed to the SEC examination office.
- Where the same finding affects both, the two responses cross-reference; the substantive remediation may be common, but the responding entities and signatories are different.

### 6. Cross-link to other capability skills

- Underlying issue write-up: `risk-compliance-core/skills/issue-writeup`.
- Standing committee pack carrying the finding ageing: `risk-reporting/skills/risk-committee-pack` (issues-and-remediation-status section); for advisers and BDs, this is the firm-level enterprise risk committee pack.
- Cyber-disclosure interactions: `risk-reporting/skills/cyber-disclosure-readiness` (8-K Item 1.05 and Item 106 mechanics for the public parent).
- Consumer-conduct findings: `references/cross-cutting/conduct.md` for findings touching retail-investor protection.

## Capital-markets-specific output additions

Added to the response (mapped to schema where present):

- `addressee.addressee_name` — markets-supervisor convention names the SEC examination office, the FINRA office, or the CFTC / NFA office. Personal names are not used.
- `reporting_cadence.frequency` — typically event-driven for SEC and FINRA deficiency-letter responses (the firm reports on completion of milestones rather than on a fixed cadence), unless the staff specifies otherwise.
- `firm_level_signatory_role` — populated for material deficiencies (typically CCO of the registered entity or CEO for the most material findings); typically the CCO for routine deficiencies.
- `linked_finding_ids` — capital-markets responses commonly cross-link to fund-board responses on the same finding for adviser-fund matters.

## Common pitfalls in capital-markets-flagged management responses

- Treating an SEC EXAMS deficiency letter as a banking-style MRA. The conventions are different; the response form, the response window, and the severity language follow the SEC's protocol.
- Missing the 30-day response window. SEC and FINRA deficiency letters typically specify 30 days; the action-plan section must reflect the response-window constraint, with milestones inside the window where possible and longer-horizon milestones flagged.
- Adviser-firm response collapsing fund-board scope. Where the finding affects a registered fund, the fund's response is filed separately by the fund; collapsing the two creates governance confusion.
- Securities-counsel review missing on enforcement-referral-indicator language. Where the deficiency letter signals possible enforcement consideration, counsel should review the response before submission; the skill flags this and stops if the responding role has not engaged counsel.
- Compliance program rule linkage missing. Findings citing Rule 206(4)-7, Rule 38a-1, or the FINRA supervision rules should identify the implicated element of the compliance or supervisory program.
- Personal names in the addressee or signatory blocks. SEC and FINRA convention is offices and roles, not personal names.
