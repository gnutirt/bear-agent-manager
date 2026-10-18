# Cross-cutting overlay — cyber

Default-on for substantively every payments program. The sponsor bank carries a 36-hour prudential cyber-notification clock and pushes a tighter contractual clock down to the program operator; the operator's cyber posture is therefore inspectable through the sponsor bank's TPRM file. The overlay carries the cyber-row content for the inventory and the sponsor-bank-cyber-notification-chain detail for the program-agreement control map.

The overlay does not substitute for the deep-dive in `risk-reporting/cyber-disclosure-readiness` (with the payments-fintech overlay where the firm or its sponsor bank is a public registrant) or for the incident workflow in `payment-operations-incident-review`. The pack raises the flag and points to the deep-dive.

## Anchor frame — the sponsor bank's cyber expectations

- **Computer-Security Incident Notification Rule** — 12 CFR Part 53 (OCC), 12 CFR Part 225 Subpart N (FRB), 12 CFR Part 304 Subpart E (FDIC), effective May 1, 2022. The sponsor bank must notify its primary federal regulator within 36 hours of determining that a notification incident has occurred. The program operator's incident-detection and notification posture is timed against this 36-hour window — the sponsor bank cannot meet its 36-hour clock if the operator does not deliver the determination in time. The program-agreement clause set typically pushes a tighter contractual notification clock onto the operator (often 24 hours or less). The pack confirms the contractual clock and the operational capability to meet it.
- **NYDFS 23 NYCRR Part 500** including §500.17(a) cybersecurity-event notification clock (72 hours). Applies to NYDFS Covered Entities. Many fintechs are Covered Entities by virtue of NY footprint; many sponsor banks are Covered Entities and require equivalent posture from the operator through the program agreement.
- **GLBA Safeguards Rule, 16 CFR Part 314** as amended (FTC, December 2021 amendments effective 2023). §314.4(f) service-provider obligations — the sponsor bank passes its GLBA obligation through to the operator under the program agreement. §314.4(h) incident-response.
- **GLBA Privacy Rule / Reg P, 12 CFR Part 1016**.
- **FFIEC IT Examination Handbook — Information Security booklet** (verify current edition and section). The sponsor bank's IT examiners read against this booklet; the operator's posture must be inspectable on the same terms.
- **FFIEC Authentication and Access to Financial Institution Services and Systems Guidance** (August 11, 2021) [verify section].
- **SEC cybersecurity disclosure** — Item 1.05 of Form 8-K and Reg S-K Item 106 (effective 2023 — verify exact compliance dates by registrant size). Applies where the firm or its sponsor bank is a public registrant.
- **State breach-notification statutes** — state-by-state; verify per state in the geographic footprint.

## Sponsor-bank cyber-notification chain

This is the operative control on the operator side.

The sponsor bank's 36-hour clock starts at "determination that a notification incident has occurred". The operator's contractual clock to the sponsor bank typically starts at "detection" or "reasonable basis to believe". The operator's controls inventory carries:

- The contractual notification clock named (often 24 hours or less to the sponsor bank's incident-management contact).
- The operational capability to meet that clock — incident-classification playbook with sponsor-bank-notification trigger criteria; out-of-hours escalation; primary and backup contacts at the sponsor bank.
- The reconciliation between the operator's NYDFS clock (where applicable), the operator's state-breach clocks, and the sponsor-bank contractual clock — the sponsor-bank clock is typically the first to fire and drives the cascade.
- Tabletop-exercise cadence with the sponsor bank, evidenced by the most-recent exercise log.

## What the overlay puts into the inventory

In the **cyber and resilience controls** row of the inventory: cyber-notification-clock control (with the contractual clock as the threshold and the most-recent test as the evidence); BCP / DR coverage control (with the most-recent tabletop log as the evidence); third-party / fourth-party register control (with the current vendor-inventory file as the evidence); vendor-stack SOC 2 currency control (with the most-recent SOC 2 report per critical vendor as the evidence).

In the **subcontractor and fourth-party register**: each material vendor's most-recent SOC 2 Type II report, audit period, qualified opinion or exceptions, and remediation status. The sponsor bank's TPRM team treats these as fourth parties to its relationship with the operator.

In the **sponsor-bank reporting cadence**: cyber posture report (monthly) and incident-history summary (rolling 12 months) feed the sponsor-bank operating committee and the sponsor bank's CISO function.

## What evidence the sponsor bank's TPRM team will request

A short list, drawn from the sponsor-bank TPRM intake patterns observed in 2023-26:

- The operator's most-recent SOC 2 Type II report (audit period, opinion, exceptions, remediation status). Where the operator does not yet have a SOC 2, the equivalent third-party assurance report.
- The operator's vendor-stack SOC 2 currency map (each critical vendor's most-recent report).
- The operator's incident-response plan with the sponsor-bank-notification playbook attached.
- The operator's most-recent tabletop-exercise log including exercises run jointly with the sponsor bank.
- The operator's vulnerability-management cadence and the most-recent penetration-test report.
- The operator's customer-managed key posture and the encryption-in-transit and encryption-at-rest evidence.

Read SOC 2 as a baseline, not a substitute for evidence on incident-response cooperation terms or the operator's own customer-managed key posture; the sponsor bank's CISO function will ask for both.

## Common pitfalls

- Reading cyber as a vendor-stack tickbox rather than as an operational-resilience and sponsor-bank-notification posture.
- Missing the 36-hour sponsor-bank prudential clock and the implied contractual-clock-on-the-program-operator. The pack must name both.
- Treating SOC 2 Type II as a substitute for the firm's own evidence on customer-managed key posture, vulnerability-management cadence, or incident-response cooperation terms.
- Omitting the public-registrant disclosure leg where the sponsor bank is a public registrant subject to SEC Item 1.05.
- Naming a contractual clock that the operator's incident-classification playbook cannot meet. The capability evidence is the operative control, not the clock written in the agreement.
