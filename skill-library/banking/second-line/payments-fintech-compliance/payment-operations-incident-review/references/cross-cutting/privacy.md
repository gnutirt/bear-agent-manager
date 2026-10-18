# Cross-cutting overlay — privacy

Required-on where the incident touched personal data — payment instructions tied to consumer accounts, KYC artefacts, dispute-claim contents, fraud-monitoring features, or developer-interface tokens. Most payments-operations incidents at a fintech with a vendor stack touch personal data once a processor-side or KYC-vendor-side leg is in scope. The overlay carries the personal-data leg of the **regulatory notification triggers** block, the customer-notification posture for the **customer-facing posture** block, and the §1033 status note where authorisation flows are involved.

The overlay does not substitute for a state-by-state privacy-law inventory or for a §1033 controls-inventory artifact. The pack carries the state-by-state breach-notification triggers, the named GLBA Safeguards incident-response posture, and the §1033 cross-link; deeper privacy work flows to `open-banking-data-controls` (for the §1033 leg) or to a privacy-counsel-led review.

## Anchor frame

- **GLBA Safeguards Rule, 16 CFR Part 314** as amended (FTC, December 2021 amendments effective 2023). **§314.4(h)** incident-response posture; **§314.4(f)** service-provider obligations; FTC notification-amendment requirements where the firm is FTC-supervised and the affected-customer threshold is met (verify current threshold).
- **GLBA Privacy Rule / Reg P, 12 CFR Part 1016**. Consumer-information privacy notice; sharing limits; opt-out mechanics. Where the incident requires re-papered customer-facing privacy disclosures, the rule frames the customer-notification text.
- **CFPB Personal Financial Data Rights Final Rule under §1033** (October 22, 2024 — verify Federal Register citation, exact citation, implementation tier dates, and current docket status). Where the incident touched authorisation flows, developer-interface tokens, or data-recipient feeds, §1033 obligations include consent-revocation paths, secondary-use limits, and retention-and-deletion duties. Cross-link to `open-banking-data-controls`.
- **State breach-notification statutes** — state-by-state; verify per state in the geographic footprint. Active comprehensive privacy laws include (incomplete; verify currency on the analysis date) California (CCPA / CPRA), Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Utah (UCPA), Texas (TDPSA), Oregon (OCPA), Montana (MTCDPA), and others. Each carries its own notification trigger (acquisition standard vs access standard), timing window (often 30 to 60 days, varies), AG-notification thresholds, and content requirements.
- **CCPA / CPRA — Cal. Civ. Code §1798.100 et seq.** Consumer rights to know, delete, correct, opt-out of sale and sharing; sensitive-personal-information limits; data-breach private right of action under specific conditions.
- **HIPAA Privacy Rule (45 CFR Parts 160, 164 Subpart E) and Security Rule (45 CFR Parts 160, 164 Subpart C)** — applies only where the program touches PHI (uncommon in payments but possible in healthcare-payment niches).
- **NYDFS 23 NYCRR Part 500** — privacy and security overlap; the cyber overlay carries the cybersecurity-event notification clock detail.

## Personal-data rows for the notification triggers block

The artifact's **regulatory notification triggers** block carries one row per applicable state breach-notification statute when the incident touched personal data and the state's notification trigger is met. Each row carries state, basis (the state's notification-trigger standard), affected-resident count, due (timing window from the state's clock-start basis), AG-notification threshold posture, and filer.

Common rows for a payments-operator personal-data leg:

- **State breach-notification rows** — one row per state where the affected-customer count meets the state's threshold. Some states have flat thresholds (any affected resident); some have graduated thresholds (e.g., AG notification required above a count). The artifact records each state separately; rolling them into a single "state breach" line is a frequent finding.
- **CCPA / CPRA private-action exposure** — California sets a private right of action for unauthorised access and exfiltration of certain categories of personal information, subject to specific conditions. The row is informational not procedural; it sits in the **regulator-facing posture** block as an exposure flag that drives the customer-notification text and class-action litigation posture.
- **GLBA Safeguards Rule notification (FTC-supervised entities)** — where the firm is FTC-supervised and the incident meets the affected-customer threshold (verify current threshold). Filer: program operator.
- **§1033 implications row** — where the incident touched authorisation flows or developer-interface tokens, the row records the §1033 status note and the cross-link to `open-banking-data-controls`. The row is not a notification trigger in itself; it flags the obligations that flow downstream.

## Customer-notification posture

The **customer-facing posture** block records the customer-notification language drafted, the channel, the population covered, the date, and the status. For privacy-leg notifications:

- Notification content tracks the state's content requirements (date of incident, nature of personal information involved, steps taken, advice on what the resident can do, contact information). Some states require specific language (e.g., on credit-monitoring offers).
- Channel tracks the state's channel requirements (substitute notice when direct notice is impracticable; specific direct-notice methods). Email is permitted in many states but not all.
- The named GLBA Safeguards §314.4(h) incident-response posture frames the customer-notification text where the firm is GLBA-supervised; the state-track requirements layer on top.

Vague language ("we are addressing a security matter") is a finding in this lane; state AG offices have pursued under-disclosed customer notifications.

## Vendor data-processing posture

Where the personal-data leg of the incident sits with a vendor (processor, KYC vendor, fraud-decision vendor, sanctions-screening vendor), the **root cause** block records:

- The vendor's data-processing agreement (DPA) coverage of the affected data category and the secondary-use scope (model-improvement, benchmarking, anonymous-aggregate use).
- The vendor's notification clock under the DPA and the vendor's actual notification posture for this incident.
- DPA-vs-actual reconciliation (the contractual baseline against the operational fact).

Treating DPA coverage as evidence of operational compliance is a frequent failure mode; DPA coverage is contractual baseline, and DPA-vs-actual reconciliation is the operative test.

## §1033 status note

Repeat where the incident touched authorisation flows, developer-interface tokens, or data-recipient feeds. The CFPB Personal Financial Data Rights Final Rule under §1033 of the Dodd-Frank Act was finalised October 22, 2024 (verify Federal Register publication date and exact citation). The docket has been active; tier dates and any compliance-date relief may have shifted (verify current docket status and the firm's tier on the analysis date). Where the program operator is a data provider, the artifact names the data-provider obligations affected (consent-revocation paths, secondary-use limits, retention and deletion duties) and the implementation tier date for the firm. Where the program operator is a data recipient, the cross-link is to `open-banking-data-controls`. Date-stamp the citation.

## Common pitfalls

- Treating GLBA as the only privacy frame and missing the state regimes in CA, VA, CO, CT, UT, TX, OR, MT, and other states where the firm meets the threshold.
- Rolling the state breach-notification rows into a single "state breach" line; states behave differently and the artifact must keep them separate.
- Drafting customer-notification text against a single state's content requirements when the affected population spans multiple states.
- Treating DPA coverage as evidence of operational compliance rather than as contractual baseline.
- Defaulting the §1033 status note to "we will be ready" without naming the firm's tier and implementation-date posture.
- Missing the §1033 cross-link where the incident touched authorisation flows or developer-interface tokens.
- Treating the personal-data leg as out-of-scope on a payments-operations incident because "the rails worked"; the data leg runs on its own clocks and triggers regardless of the payments-operational status.
