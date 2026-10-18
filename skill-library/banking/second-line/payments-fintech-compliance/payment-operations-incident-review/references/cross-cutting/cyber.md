# Cross-cutting overlay — cyber

Required-on for any payments-operations incident with a cyber leg, and for the substantively-all-of-them case where the incident chain runs through processor / ledger / fraud-decision / sanctions-screening / KYC vendor exposure with cyber-incident potential. The overlay carries the parallel cyber-clock detail for the **regulatory notification triggers** block, the sponsor-bank prudential cyber-notification cascade for the **sponsor-bank reporting** block, and the vendor-stack cyber posture for the **root cause** block.

The overlay does not substitute for the disclosure-track artifact in `risk-reporting/cyber-disclosure-readiness` (where the firm or its sponsor bank is a public registrant) or for the firm's own incident-response runbook. The pack flags the cyber leg, surfaces the parallel clocks, and points to the disclosure-track artifact for the public-disclosure leg.

## Anchor frame

- **NYDFS 23 NYCRR Part 500** including **§500.17(a)** cybersecurity-event notification clock — 72 hours from the determination that a cybersecurity event has occurred at the Covered Entity. Applies to firms that are NYDFS Covered Entities; applies to many fintechs by virtue of NY footprint.
- **Federal banking agencies' Computer-Security Incident Notification Rule** — 12 CFR Part 53 (OCC), 12 CFR Part 225 Subpart N (FRB), 12 CFR Part 304 Subpart E (FDIC), effective May 1, 2022. Sponsor bank must notify its primary federal regulator within 36 hours of determining that a notification incident has occurred. The program operator's notification posture must time against this 36-hour clock; the contractual program-agreement clock is typically tighter.
- **GLBA Safeguards Rule, 16 CFR Part 314** as amended (FTC, December 2021 amendments effective 2023). **§314.4(h)** incident-response posture; **§314.4(f)** service-provider obligations. Notification of the firm's primary regulator under the FTC's Safeguards Rule notification amendments where the firm is FTC-supervised and the incident meets the affected-customer threshold (verify current threshold).
- **SEC cybersecurity disclosure** — Item 1.05 of Form 8-K and Reg S-K Item 106 (Release 33-11216 / 34-97989, effective 2023; SRC phase-in to June 15, 2024 — verify exact compliance dates by registrant size). Materiality determination drives the four-business-day clock; the clock starts at the materiality determination, not at detection. Cross-link to `risk-reporting/cyber-disclosure-readiness` for the disclosure-track artifact.
- **State breach-notification statutes** — state-by-state; verify per state in the geographic footprint. Each carries its own notification trigger (acquisition standard vs access standard), timing window (often 30 to 60 days, varies), AG-notification thresholds, and content requirements.
- **FFIEC IT Examination Handbook — Information Security booklet** [verify current edition and section]. Sets the supervisory expectation for the firm's incident-response programme.
- **FFIEC Authentication and Access to Financial Institution Services and Systems Guidance** (August 11, 2021). Sets the supervisory expectation for the firm's authentication posture.

## Parallel cyber-clocks for the notification triggers block

The artifact's **regulatory notification triggers** block carries one row per applicable cyber-clock when the cyber leg is present. Each row carries regulator, basis (e.g., "72 hours from determination of cybersecurity event"), due (ISO datetime), status (not-started / in-progress / submitted / not-applicable), and filer (sponsor bank, program operator, securities counsel).

Common rows for a payments-operator cyber leg:

- **NYDFS 23 NYCRR Part 500 §500.17(a)** — 72 hours from determination, where the firm is a Covered Entity. Filer: program operator or sponsor bank, depending on which entity is the Covered Entity for the affected systems.
- **Federal banking agencies' 36-hour rule** — 36 hours from determination of a notification incident, filed by the sponsor bank to its primary federal regulator. The program operator's clock to the sponsor bank under the program-agreement notification clause is the input to this; the artifact tracks both.
- **SEC Form 8-K Item 1.05** — four business days from materiality determination, where the firm or its sponsor bank is a public registrant. Materiality is a disclosure determination made by the disclosure committee with securities counsel input; the cyber team contributes facts. Cross-link to `risk-reporting/cyber-disclosure-readiness`.
- **State breach-notification statutes** — one row per state where customer information was implicated and the state's notification trigger is met. Timing windows vary; the artifact records each state's clock separately.
- **GLBA Safeguards Rule notification (FTC-supervised)** — where the firm is FTC-supervised and the incident meets the affected-customer threshold (verify current threshold). Filer: program operator.
- **HIPAA Breach Notification Rule** — uncommon in payments but applies in healthcare-payment niches.

Surfacing every applicable clock is the operative discipline. Treating the SEC clock as the only clock is the failure mode for sponsor-bank programs and for NYDFS-licensed entities. Treating the federal banking agencies' 36-hour rule as the program operator's clock is the inverse failure mode (the rule binds the sponsor bank; the program operator's clock is contractual).

## Sponsor-bank prudential cyber-notification cascade

The federal banking agencies' Computer-Security Incident Notification Rule (12 CFR Parts 53 / 225 / 304, effective May 1, 2022) requires the sponsor bank to notify its primary federal regulator within 36 hours of determining that a notification incident has occurred. The program-agreement clause set typically pushes a tighter contractual notification clock onto the program operator (often 24 hours or less; some clauses run shorter for cyber). The artifact's **sponsor-bank reporting** block records:

- The contractual clock and the clock-start basis for cyber events specifically (often "detection of any cybersecurity event reasonably likely to be a notification incident at the sponsor bank").
- The notification sent (channel, addressee role, timestamp).
- The supporting evidence package sent (incident-response status, scoping artefact, customer-impact preliminary count).
- The follow-on cadence (operating-committee read-out, post-incident review report, remediation-tracker update).

The sponsor bank cannot meet its 36-hour clock if the program operator does not deliver the determination in time. The artifact records the operational capability to meet the contractual clock; if the capability is not in place, that is a finding, not an open item.

## Vendor-stack cyber posture for the root cause block

Where the incident chain runs through a vendor (processor, ledger provider, fraud-decision vendor, sanctions-screening vendor, KYC vendor), the **root cause** block records:

- The vendor's incident-response cooperation posture (timely incident report, log access, cooperative scoping, shared post-incident review).
- The vendor's cyber-incident notification clock under the firm-vendor contract (often 24 hours or less; some contracts run shorter for cyber).
- The vendor's most-recent SOC 2 Type II report status (current, expired, qualified opinion, exception with management response) and the vendor-managed-key posture for any encryption layers the vendor controls.
- The fourth-party exposure (the vendor's own subcontractors with relevant access) — the Interagency Guidance on Third-Party Relationships (June 2023) sets the risk-based fourth-party expectation; the artifact records the firm's visibility.

Treating SOC 2 Type II as a substitute for the firm's own incident-response evidence is a common failure mode. The artifact records SOC 2 status as one input among several.

## Tabletop and recovery posture

Cyber tabletop cadence is the operative test for whether the program operator and the sponsor bank can run a coordinated incident response. The artifact records:

- The most-recent sponsor-bank-coordinated tabletop date and outcome.
- The most-recent processor / ledger / fraud-decision vendor tabletop date (where the firm runs vendor-coordinated tabletops).
- Open actions from prior tabletops that remain unclosed.

Where the tabletop cadence is overdue or the prior actions remain open, the **lessons learned** block carries forward-control updates against the cyber row of the firm's `payments-risk-assessment`.

## Common pitfalls

- Treating the SEC four-business-day clock as the only public-disclosure clock; missing the NYDFS 72-hour clock or the state breach-notification clocks.
- Treating the federal banking agencies' 36-hour rule as the program operator's clock rather than the sponsor bank's.
- Conflating detection with materiality determination on the SEC clock (the clock starts at determination, not at detection).
- Treating SOC 2 Type II as a substitute for the firm's own evidence on vendor-managed key posture, vulnerability-management cadence, or incident-response cooperation terms.
- Omitting the public-registrant disclosure leg where the sponsor bank is a public registrant subject to SEC Item 1.05 even though the program operator is not.
- Drafting the cyber leg as a parallel artifact rather than as a flagged row that hands off to the disclosure-track artifact in `risk-reporting/cyber-disclosure-readiness`.
