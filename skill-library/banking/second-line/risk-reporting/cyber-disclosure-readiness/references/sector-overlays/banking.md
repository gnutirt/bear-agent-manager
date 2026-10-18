# Banking sector overlay for cyber-disclosure-readiness

When the scope names banking, the federal banking agencies' Computer-Security Incident Notification Rule (12 CFR Parts 53/225/304) runs on a 36-hour clock alongside the SEC 4-business-day clock; bank service providers face a 4-hour customer-notification trigger; and FFIEC IT-Handbook expectations underpin the Item 106(b) risk-management narrative.

Loaded by: `cyber-disclosure-readiness/SKILL.md` when `scope.sector_overlay_set` includes `banking`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- Federal banking agencies' Computer-Security Incident Notification Rule:
  - 12 CFR Part 53 (OCC; national banks and federal savings associations).
  - 12 CFR Part 225 Subpart N (FRB; state member banks and BHCs).
  - 12 CFR Part 304 Subpart C (FDIC; state nonmember banks and savings associations).
  Effective May 1, 2022.
- FFIEC IT Examination Handbook, Information Security booklet (September 2016) and Architecture, Infrastructure, and Operations booklet (June 2021) — Sections on incident response, third-party risk management, business continuity [verify section].
- OCC Heightened Standards (12 CFR Part 30 Appendix D) — risk-governance framework and risk-appetite-statement expectations cover cyber as part of the operational and reputational categories.
- FFIEC Cybersecurity Assessment Tool (CAT) — sunset; verify any successor or refreshed framework at draft time.
- Interagency Guidelines Establishing Information Security Standards (12 CFR Part 30 Appendix B for OCC; 12 CFR Part 208 Appendix D-2 for FRB; 12 CFR Part 364 Appendix B for FDIC) and the 2005 Interagency Guidance on Response Programs.
- OCC Bulletins on third-party risk and operational resilience that touch on cyber-incident expectations [verify current bulletin numbers at draft time].

## What changes for banking-flagged disclosure-readiness work

### 1. The 36-hour clock joins the parallel-clocks table

For banking organizations covered by 12 CFR Parts 53/225/304, the 36-hour clock from determination of a "notification incident" runs alongside the SEC 4-business-day clock. The two clocks resolve from different basis events:

- 36-hour clock: starts at determination that the computer-security incident materially disrupted or degraded (or is reasonably likely to materially disrupt or degrade) the bank's banking operations, customer-service delivery, business-line revenue or franchise value, or US financial stability.
- 4-business-day SEC clock: starts at materiality determination under the TSC standard.

A single incident can determine to be a "notification incident" before, simultaneously with, or after determining materiality for SEC purposes. The pack tracks both clocks and shows the basis events for each.

### 2. Bank service providers face a 4-hour customer-notification trigger

Where the registrant is a bank service provider (a vendor providing services to a banking organization), 12 CFR Parts 53/225/304 require notification to affected banking-organization customers as soon as possible after determining a computer-security incident has caused, or is reasonably likely to cause, a service disruption of four or more hours.

This trigger runs on the service-provider side, independent of the registrant-side 36-hour clock. The pack flags bank-service-provider status in the scope and surfaces the 4-hour trigger when applicable.

### 3. FFIEC IT-Handbook content underpins Item 106(b)

For bank-affiliated registrants, the Item 106(b)(1) processes-for-assessing-identifying-managing draft typically references the firm's information-security program in FFIEC-aligned terms (governance, risk-assessment, risk-mitigation, supervisory examination, board oversight). The FFIEC IT Handbook is the bank-supervisory frame; alignment of the firm's program to it is the standard banking-sector narrative.

Banks are not required to name FFIEC alignment in the Item 106 disclosure, but where the firm operates against FFIEC expectations, the disclosure benefits from internal consistency with the FFIEC-aligned program documentation.

### 4. Heightened Standards covered banks carry the additional cyber-governance lens

For OCC Heightened Standards covered banks (12 CFR Part 30 Appendix D, Section II's risk-governance framework), cyber risk is part of the operational and reputational risk categories named in the framework. The Item 106(c) governance disclosure for a Heightened Standards covered bank typically:

- Names the Risk Committee of the Board (the named-by-rule independent risk committee under Section IV) as the committee with cyber oversight.
- References the risk-governance framework and the risk-appetite statement's coverage of cyber.
- Names the CISO's reporting line and the CRO's role in cyber-risk oversight (consistent with the three-lines model articulated in Section V's roles-and-responsibilities expectations).

### 5. OCC, FRB, and FDIC supervisory examination findings

Cyber-related supervisory findings (MRAs, MRIAs from FRB; MRAs from OCC; MRBAs and MRAs from FDIC) typically run alongside the SEC disclosure work. Where a finding relates to a recent material incident, the disclosure committee considers whether the finding itself requires Item 106 update or 8-K disclosure on its own merits (typically not, but the analysis is recorded).

The DCP map (Artifact C) documents the firm's information flow between the cyber MRA / MRIA process and the disclosure process so that the disclosure committee receives material supervisory-finding context.

### 6. Banking-specific parallel-clock interactions

The pack's parallel-clocks table for a covered banking organization typically includes:

- 36-hour clock to primary federal regulator (OCC for nationals, FRB for state members and BHCs, FDIC for state nonmembers).
- 4-hour bank-service-provider customer-notification trigger if the entity is a bank service provider to other banking organizations.
- NYDFS §500.17 72-hour clock if the entity is NYDFS-licensed (many banking organizations are).
- 2005 Interagency Guidance customer-notice obligations for banking-agency-supervised entities on unauthorized access to sensitive customer information.
- State breach-notification clocks where customer information is implicated.
- SEC Reg S-P 30-day clock if the banking organization includes a registered broker-dealer or registered investment adviser arm (many BHCs do).
- SEC 4-business-day Item 1.05 clock if the registrant is a 1934-Act-registered issuer (most BHCs are).

The senior reviewer's job is to resolve all clocks in parallel, with the materiality-determination workpaper as the central evidence record.

## Banking-specific output additions

When banking is in scope:

- Artifact A's parallel-clocks table includes the federal banking agency 36-hour row and (where applicable) the bank-service-provider 4-hour row.
- Artifact A's DCP trace includes the regulatory-notification stage feeding the 36-hour clock alongside the SEC-disclosure stage feeding the 4-business-day clock.
- Artifact B's Item 106(b)(1) draft references the firm's FFIEC-aligned information-security program in language consistent with bank examination findings and supervisory letters.
- Artifact B's Item 106(c) draft for Heightened Standards covered banks names the Risk Committee of the Board (the Section IV independent risk committee), the cadence, and the CISO and CRO roles consistent with Section V's roles-and-responsibilities expectations.
- Artifact C's DCP map documents the federal banking agency notification stage and the supervisory-examination-finding feedback loop.

## Common pitfalls

- Treating the SEC 4-business-day clock as the only or the dominant clock. For covered banking organizations, the 36-hour clock is faster and runs from a different basis event.
- Conflating "notification incident" determination (12 CFR 53/225/304) with "material cybersecurity incident" determination (Item 1.05). The two standards are different; an incident can be one without being the other.
- Missing the 4-hour bank-service-provider customer-notification trigger when the firm is a service provider to other banks.
- Naming a generic "management committee" in the Item 106(c) governance disclosure for a Heightened Standards covered bank where the rule names the Risk Committee of the Board.
- Inconsistency between the firm's FFIEC-aligned information-security program documentation and the Item 106(b) disclosure narrative.
- Failing to surface OCC, FRB, or FDIC cyber-supervisory findings in the DCP map's information flow into the disclosure committee.
- Treating cyber as a stand-alone risk in the banking context rather than as part of the operational and reputational risk categories named in 12 CFR Part 30 Appendix D Section II.
