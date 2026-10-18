# Cyber cross-cutting overlay — bank-fintech-partnership-review

When the scope flags `cyber` for a bank-fintech partnership review, this overlay sits as the load-bearing companion to the bank-sector lens. Bank-fintech relationships concentrate ICT and cyber risk: the fintech (and any middleware platform it relies on) is a bank service provider whose security posture maps onto the bank's regulator-notification windows, the bank's third-party-risk program, and the BHC's public-disclosure surface where the BHC is a public registrant.

Loaded by: `bank-fintech-partnership-review/SKILL.md` when the scope's `cross_cutting_overlay_set` includes `cyber`. For BaaS sponsor programs, embedded-lending relationships, KYC / fraud service partners, and any fintech that handles customer NPI or sits in the money-flow path, this overlay should be considered the default. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- NYDFS 23 NYCRR Part 500, especially §500.11 (third-party service-provider security policy and contractual protections including notification, due diligence, encryption, access controls, and minimum cybersecurity practices), §500.6 (audit trail), §500.9 (risk assessment), §500.16 (incident-response and BCDR plan), §500.17(a) (72-hour notice to superintendent on cybersecurity events meeting the rule's criteria), for state-chartered partner banks supervised by NYDFS and for fintechs operating in the NY footprint.
- 12 CFR Part 53 (OCC) / Part 225 (FRB) / Part 304 (FDIC) — Computer-Security Incident Notification rule, 36-hour notification to primary federal regulator for "notification incidents". The fintech as a bank service provider triggers the rule at the bank's level; the contract clause that obliges the fintech to notify the bank within a window that allows the bank to meet the 36-hour clock is the load-bearing addition.
- FFIEC IT Examination Handbook — Information Security and Outsourcing Technology Services booklets, applied to the fintech's serving environment, change controls, access controls, and incident-response integration with the bank's IR programme.
- GLBA Safeguards Rule (16 CFR §314.4 with December 2021 amendments) flowed down to the fintech contractually; the bank carries program-level responsibility.
- SEC Cybersecurity Risk Management, Strategy, Governance, and Incident Disclosure rule (effective December 18, 2023): 8-K Item 1.05 (material cyber incident disclosure within four business days of materiality determination) and Item 106 of Reg S-K (annual cyber risk-management and governance disclosure). For the partner bank's BHC where the BHC is a public registrant; a cyber event at the fintech that materially affects the bank can roll into a BHC disclosure obligation.

## What changes when cyber is flagged

### Service description and risk classification gain a cyber-impact framing

The criticality classification picks up a cyber lens: a fintech that holds customer NPI, sits in the authentication or fraud-decision path, or has write access into the bank's systems carries elevated cyber-driven criticality independent of money-flow position. The middleware-platform layer (where present) is named explicitly as a fourth-party with its own cyber-risk profile, and the partnership pack carries the middleware platform as a sub-row inside the service description.

### Risk-based diligence picks up the cyber control families

The information-security and management-of-information-systems diligence categories from the June 2023 Interagency Guidance read against the FFIEC IT Handbook spine, against NYDFS §500.11 (where applicable), and against GLBA §314.4. The diligence inventory carries the most recent SOC 2 Type II report (or equivalent) with date and scope, the most recent penetration-testing record at the fintech's serving environment, the encryption-at-rest and in-transit posture, the access-control and least-privilege evidence, and the change-control evidence. Vendor self-attestation is the lowest-confidence input; an independent assessor's report is the bank's evidence. A SOC report older than 12 months is a finding; a SOC report whose scope does not cover the services the fintech delivers to the bank is a finding regardless of recency.

### Contract gaps section adds cyber-specific clauses

Each clause is read against a regulator-notification window the bank has to meet:

- Incident-notification timeline from the fintech to the bank, sized to the bank's 36-hour clock under 12 CFR Part 53 / Part 225 / Part 304. A 24-hour notification clause typically does not give the bank enough time to determine notification-incident applicability and meet the 36-hour clock; the partnership pack flags clauses above 4 hours as a finding for the recordkeeping bank.
- §500.17(a) compatibility for NYDFS-covered partner banks: the fintech's contractual notification window plus the bank's internal materiality-assessment window must fit inside 72 hours.
- 8-K Item 1.05 compatibility for the BHC where the BHC is a public registrant: the bank's materiality-determination process and the fintech's contractual notification window must allow the BHC to meet the four-business-day disclosure clock.
- Subcontractor (fourth-party) governance: notice-and-consent on subcontractor changes, flow-down of bank-required cyber controls to subcontractors, and subcontractor cyber-incident notification flowing back to the bank.
- Data return and destruction on termination: format, timeline, attestation, and verification rights. A clause that says "data will be returned" without naming format and timeline is a control statement, not a control.
- Encryption-key custody: who holds the keys, how they are rotated, what happens to encrypted data on termination if the fintech holds the keys.
- Right-to-audit and right-to-test: the bank's right to conduct or commission cyber-side testing at the fintech's serving environment, including penetration testing and red-team engagements, on agreed cadence.
- Insurance: cyber-insurance scope, named-insured and additional-insured posture, sub-limits for incident-response and notification costs, notification-of-claim cooperation.

### Customer-facing controls section picks up the SEC and disclosure overlay

For the BHC where it is a public registrant, the partnership pack notes which incident classes at the fintech could meet 8-K Item 1.05 materiality and which would require Item 106 disclosure refresh. The bank's materiality-assessment SOP is referenced; the fintech is named in the Item 106 narrative where the disclosure-controls regime requires it.

### Termination and wind-down readiness picks up cyber-specific triggers

Cyber-deterioration triggers join the financial-deterioration and BSA / AML-deterioration triggers in the named-trigger list:

- A material cyber incident at the fintech that meets a regulator-notification threshold at the bank.
- A material change in the fintech's cyber-risk posture (loss of SOC 2 attestation, loss of cyber insurance, change of control).
- A material change in the fintech's subcontractor stack (new middleware platform, change in cloud-hosting region, change in encryption-at-rest provider).

The wind-down sequence carries the cyber-side steps: revocation of the fintech's access into the bank's systems, audit-trail extraction and retention before the fintech's environment is decommissioned, encryption-key handover or destruction, customer-NPI return or destruction with attestation.

### Recommended owner actions add cyber-specific items

- Head of information security (or CISO) review of the fintech's most recent SOC 2 Type II and penetration-testing records on the partnership-refresh cadence.
- Cyber-tabletop exercise that includes an incident at the fintech and tests the bank's 36-hour notification process under 12 CFR Part 53 / Part 225 / Part 304 (and NYDFS §500.17(a) where applicable) end-to-end.
- For the BHC where it is a public registrant, materiality-determination rehearsal for an incident at the fintech that could meet 8-K Item 1.05.
- §500.11 contractual-protection refresh on the partnership-refresh cadence for NYDFS-covered banks.
- Middleware-platform diligence refresh where the fintech relies on a middleware platform; the bank reviews the middleware platform as a fourth-party.

## Cyber-specific output additions

In the partnership pack:

- Service description carries the middleware-platform sub-row where applicable.
- Risk-based diligence summary carries the SOC 2 / penetration-testing / encryption / access-control rows under information security and management of information systems.
- Contract gaps carries the incident-notification timeline analysis sized to the 36-hour rule, the §500.17(a) compatibility analysis, the 8-K Item 1.05 compatibility analysis, and the subcontractor cyber-governance row.
- Termination and wind-down carries the cyber-deterioration trigger list and the cyber-side wind-down sequence.
- Recommended owner actions carries the named-role CISO actions.

## Common pitfalls in cyber-flagged partnership reviews

- Treating the cyber team as a downstream consumer of the partnership pack rather than a co-reviewer. The CISO function co-reviews on cyber-flagged partnerships and co-decides on residual-risk acceptance.
- Accepting a fintech's vendor self-attestation as evidence when an independent assessor's report is available. SOC 2 Type II with a scope statement covering the services delivered to the bank is the baseline; the bank's own testing is the next layer up.
- Sizing the incident-notification clause to a number-out-of-the-air rather than to the 36-hour clock the bank has to meet. The clause length is a function of the bank's downstream regulator-notification timeline.
- Treating subcontractor (middleware-platform) cyber risk as out-of-scope because the fintech is the bank's contractual counterparty. The middleware platform is a fourth-party; the bank's program covers it.
- Omitting the 8-K Item 1.05 materiality rehearsal for incidents originating at the fintech where the BHC is a public registrant.
- Treating data-return clauses as evidence of wind-down readiness without naming format, timeline, attestation, and verification rights.
