# Cross-cutting overlay — cyber

Default-on for substantively every payments program. The rails depend on processors, ledger providers, fraud-decision vendors, sanctions-screening vendors, and KYC vendors with cyber-incident exposure. The sponsor-bank construct adds a notification chain. The overlay carries the cyber-row content for the matrix and the sponsor-bank-cyber-notification-chain detail for the operational-resilience cross-cutting row.

The overlay does not substitute for the deep-dive in `risk-reporting/cyber-disclosure-readiness` (with the payments-fintech overlay where the firm or its sponsor bank is a public registrant) or for the incident workflow in `payment-operations-incident-review`. The assessment raises the flag and points to the deep-dive.

## Anchor frame

- **NYDFS 23 NYCRR Part 500** including §500.17(a) cybersecurity-event notification clock (72 hours). Applies to firms that are NYDFS Covered Entities; applies to many fintechs by virtue of NY footprint.
- **GLBA Safeguards Rule, 16 CFR Part 314** as amended (FTC, December 2021 amendments effective 2023). §314.4(f) service-provider obligations; §314.4(h) incident-response.
- **GLBA Privacy Rule / Reg P, 12 CFR Part 1016**.
- **FFIEC IT Examination Handbook — Information Security booklet** (verify current edition and section).
- **FFIEC Authentication and Access to Financial Institution Services and Systems Guidance** (August 11, 2021).
- **SEC cybersecurity disclosure** — Item 1.05 of Form 8-K and Reg S-K Item 106 (effective 2023 — verify exact compliance dates by registrant size). Applies where the firm or its sponsor bank is a public registrant.
- **State breach-notification statutes** — state-by-state; verify per state in the geographic footprint.
- **FFIEC Cybersecurity Assessment Tool (CAT)** [verify current state — CAT was sunset in August 2024 per FFIEC announcement; verify the current FFIEC cyber assessment guidance and its applicability date].

## Sponsor-bank cyber-notification chain

The sponsor bank's prudential cyber-notification clock under the **Computer-Security Incident Notification Rule** (12 CFR Part 53 for OCC, 12 CFR Part 225 Subpart N for FRB, 12 CFR Part 304 Subpart E for FDIC, effective May 1, 2022) requires the sponsor bank to notify its primary federal regulator within 36 hours of determining that a notification incident has occurred. The program operator's incident-detection and notification posture must be timed against this 36-hour window — the sponsor bank cannot meet its 36-hour clock if the program operator does not deliver the determination in time.

The program-agreement clause set typically pushes a tighter contractual notification clock onto the program operator (often 24 hours or less). The assessment confirms the contractual clock and the operational capability to meet it.

## What the overlay puts into the matrix

In the **cross-cutting risks** layer: cyber row with risk owner (CISO or head of information security), top three KRIs (incident-detection MTTD, incident-notification SLA breach rate, vendor-cyber-incident exposure rate), and the deep-dive skill reference (`risk-reporting/cyber-disclosure-readiness` for the disclosure leg; `payment-operations-incident-review` for the incident workflow).

In the **operational-resilience** sub-view of the cross-cutting risks: vendor-stack cyber posture (processor SOC 2 Type II current, fraud-decision vendor SOC 2 current, sanctions-screening vendor SOC 2 current, KYC vendor SOC 2 current); sponsor-bank cyber-notification SLA against the contractual clock; tabletop-exercise cadence for the sponsor-bank-coordinated incident-response.

In the **risk-appetite posture**: red conditions for any cell where the vendor-stack cyber posture has a critical SOC 2 exception open beyond firm appetite, where the incident-notification SLA breach rate exceeds appetite, or where the sponsor-bank-coordinated tabletop is overdue. Where firm appetite is not on file, mark `[evidence needed]`.

## Common pitfalls

- Reading cyber as a vendor-stack tickbox rather than as an operational-resilience and sponsor-bank-notification posture.
- Missing the 36-hour sponsor-bank prudential clock and the implied contractual-clock-on-the-program-operator.
- Treating SOC 2 Type II as a substitute for the firm's own evidence on customer-managed key posture, vulnerability-management cadence, or incident-response cooperation terms.
- Omitting the public-registrant disclosure leg where the sponsor bank is a public registrant subject to SEC Item 1.05.
