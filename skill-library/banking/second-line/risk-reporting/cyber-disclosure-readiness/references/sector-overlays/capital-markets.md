# Capital-markets sector overlay for cyber-disclosure-readiness

When the scope names capital markets (broker-dealer, investment adviser, registered investment company, transfer agent), SEC Regulation S-P amendments (May 2024) add a 30-day customer-notification clock; FINRA Rule 4530 reporting may apply for FINRA-member broker-dealers; and registered-fund disclosure carries Form N-CSR / N-1A / N-2 considerations alongside the 10-K stream where applicable.

Loaded by: `cyber-disclosure-readiness/SKILL.md` when `scope.sector_overlay_set` includes `capital-markets`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- SEC Regulation S-P amendments, Release Nos. 34-100155, IA-6604, IC-35193 (final May 16, 2024). Amends 17 CFR Part 248.30 (Safeguards Rule). Covered institutions: broker-dealers, investment advisers (including those exempt from registration), registered investment companies, and transfer agents. Compliance dates phased: large entities 18 months from publication in the Federal Register; smaller entities 24 months [verify entity-type definitions and current compliance dates at draft time].
- FINRA Rule 4530 — Reporting Requirements [verify subsection labels at draft time]. 4530(a)(1) for statutory disqualification, customer complaints meeting specified criteria, regulatory actions; 4530(b) for internal conclusions of violations; 4530(d) for quarterly statistical and summary reports of customer complaints.
- SEC Investment Adviser Rules: Investment Advisers Act Rule 206(4)-7 (compliance program rule) for registered investment advisers; cyber-program failures have been the subject of SEC enforcement actions citing Rule 206(4)-7.
- SEC Investment Company Rules: 17 CFR §270.38a-1 (compliance program rule for registered investment companies).
- Form N-CSR (registered closed-end and open-end management investment companies) and Form N-1A / Form N-2 / Form N-CEN (registration and reporting forms for registered investment companies). Item 16K cybersecurity disclosure for registered investment companies on Form N-CSR pursuant to Release No. 33-11216 [verify form item references at draft time].
- SEC Risk Alerts on cybersecurity for broker-dealers and investment advisers (most recent Division of Examinations Risk Alerts).
- For transfer agents: 17 CFR §240.17Ad-22 transfer-agent rules, with cyber-program implications.

## What changes for capital-markets-flagged disclosure-readiness work

### 1. Reg S-P 30-day customer-notification clock joins the parallel-clocks table

The May 2024 amendments require covered institutions to:

- Maintain written policies and procedures for an incident-response program reasonably designed to detect, respond to, and recover from unauthorized access to or use of customer information.
- Notify each affected individual whose sensitive customer information was, or is reasonably likely to have been, accessed or used without authorization, as soon as practicable but not later than 30 days after the institution becomes aware that such access or use has occurred.

The 30-day clock starts at awareness of unauthorized access. This is a different basis event from the SEC 4-business-day Item 1.05 materiality-determination clock.

The customer-notice content requirements include the description of the incident, the type of sensitive customer information affected, and contact information. The notice content is distinct from the 8-K Item 1.05 disclosure; one does not satisfy the other.

### 2. Sensitive customer information posture

The Reg S-P amendments expanded the "customer information" definition. Sensitive customer information includes (per the rule): any combination of information that would permit a reasonable person to identify a customer of the institution and to conduct fraudulent or unauthorized transactions; or any combination of components that, together, allow access to a customer's account at the institution. The pack carries the determination of what categories of sensitive customer information were accessed or used.

The 30-day clock applies only when sensitive customer information is accessed or used. For other customer information, the institution still has incident-response program obligations but the 30-day customer-notice clock does not run on the same basis.

### 3. FINRA Rule 4530 for FINRA-member broker-dealers

Cybersecurity events that result in customer complaints meeting the 4530(d) threshold or that constitute a 4530(b) internal conclusion of violation are reportable to FINRA. FINRA Rule 4530(a) reporting is event-driven (typically within 30 days of awareness); 4530(d) is quarterly statistical reporting.

The pack's parallel-clocks table for a FINRA-member registrant carries the 4530(a) and 4530(d) rows alongside the SEC and Reg S-P rows.

### 4. Investment Advisers Act and Investment Company Act compliance program rules

SEC enforcement actions against registered investment advisers for cybersecurity failures have frequently cited Rule 206(4)-7 (compliance program rule) where the firm's policies and procedures for cyber were inadequate or were not followed in practice. The Item 106(b) disclosure for an RIA registrant typically references the firm's compliance program under Rule 206(4)-7 and the CCO's role in cyber-program oversight.

For registered investment companies, Rule 38a-1 carries similar implications, with the fund's CCO role in cyber-program oversight surfaced in the disclosure.

### 5. Form N-CSR Item 16K for registered investment companies

The SEC Final Rule (Release No. 33-11216) added cybersecurity disclosure obligations for registered investment companies on Form N-CSR. The disclosure parallels Item 106 of Regulation S-K with adaptations for the fund context. The pack handles registered-fund disclosure as a parallel work-stream to the 10-K Item 106 disclosure, with shared content where the same management oversees both (typical for a fund-and-adviser complex) [verify form item references at draft time].

### 6. Adviser-and-fund disclosure overlap

Many capital-markets registrants are part of a complex with both adviser-side disclosures (10-K or Form ADV / Part 2 / Form CRS / Risk Alerts) and fund-side disclosures (Form N-CSR / N-1A / N-2 / N-CEN). A cyber incident affecting the adviser's systems can affect the funds advised by the adviser; the disclosure committee considers both venues.

Adviser-side disclosure runs through the 10-K (or 20-F for FPI advisers) under Item 106. Fund-side disclosure runs through Form N-CSR (annual and semi-annual). The two are independent but related; the pack tracks both.

### 7. Examination-cycle frame

SEC Division of Examinations has identified cybersecurity as a recurring examination priority for advisers, broker-dealers, and registered funds. Risk Alerts published by the Division have set expectations on cyber-program elements; the Item 106(b) narrative typically references the firm's program in language consistent with the Risk Alerts' expectations.

Examination findings on cyber typically result in deficiency letters; material findings can result in enforcement referrals. The DCP map documents the firm's information flow between examination findings and the disclosure committee.

## Capital-markets-specific output additions

When capital markets is in scope:

- Artifact A's parallel-clocks table includes the Reg S-P 30-day row and (where applicable) FINRA Rule 4530(a) / 4530(d) rows.
- Artifact A's facts-of-the-incident row characterizes whether sensitive customer information was accessed or used (per Reg S-P) and whether customer complaints meeting 4530 thresholds resulted.
- Artifact A's DCP trace includes the Reg S-P customer-notification stage alongside the SEC-disclosure stage.
- Artifact B's Item 106(b) draft references the firm's compliance program under Rule 206(4)-7 (RIA) or Rule 38a-1 (RIC) and the CCO's role in cyber-program oversight where applicable.
- Artifact B carries a Form N-CSR Item 16K cross-link for registered investment companies in the complex [verify form item references at draft time].
- Artifact C's DCP map documents the Reg S-P customer-notification escalation path and the FINRA-reporting feedback loop where applicable.

## Common pitfalls

- Conflating the Reg S-P 30-day clock with the SEC 4-business-day clock. The two run on different basis events and on different content.
- Treating the 8-K Item 1.05 filing as a substitute for the Reg S-P customer notice. Different audiences, different content.
- Using a single 10-K Item 106 disclosure for an adviser-and-fund complex without considering Form N-CSR Item 16K obligations on the fund side.
- Missing the FINRA Rule 4530(d) quarterly statistical reporting trigger for cyber-related customer complaints.
- Naming a generic "compliance function" in the Item 106(b) disclosure for a registered adviser where Rule 206(4)-7 expects the CCO's role to be discrete and named.
- Inconsistency between the firm's compliance program documentation under Rule 206(4)-7 / Rule 38a-1 and the Item 106(b) disclosure narrative on processes, oversight, and accountability.
- Treating SEC Risk Alerts on cybersecurity as background reading rather than as content that lands in the Item 106(b) draft and the DCP map's gap-analysis row.
- For complex registrants (banks with broker-dealer or investment-adviser subsidiaries), missing the multi-regulator clock interactions: the 36-hour federal banking agency clock + the 30-day Reg S-P clock + the 4-business-day SEC clock + the NYDFS 72-hour clock can all run on the same incident.
