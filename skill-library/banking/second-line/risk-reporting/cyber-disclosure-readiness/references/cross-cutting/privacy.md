# Privacy cross-cutting overlay for cyber-disclosure-readiness

When customer financial information, health information, or other regulated personal information is implicated in a cyber incident, privacy-notification clocks run alongside the SEC Item 1.05 clock. The pack must surface every privacy clock applicable to the registrant; missing one is a frequent regulator finding.

Loaded by: `cyber-disclosure-readiness/SKILL.md` when `scope.cross_cutting_set` includes `privacy`, when the scope flags customer financial information / PHI / sensitive customer information in scope, or when Artifact A's incident facts implicate any covered information type. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- GLBA Title V and the FTC Safeguards Rule (16 CFR Part 314), current text reflecting December 2021 amendments and October 2023 amendments adding the FTC notification trigger for breaches affecting 500 or more consumers.
- Banking-agency Interagency Guidelines Establishing Information Security Standards (12 CFR Part 30 Appendix B for OCC; 12 CFR Part 208 Appendix D-2 for FRB; 12 CFR Part 364 Appendix B for FDIC) and the 2005 Interagency Guidance on Response Programs for Unauthorized Access to Customer Information and Customer Notice (Federal Register, March 29, 2005).
- SEC Regulation S-P amendments (Release Nos. 34-100155 et al., May 16, 2024). Amends 17 CFR Part 248.30. Covered institutions: broker-dealers, investment advisers, registered investment companies, transfer agents. 30-day customer-notification clock from awareness of unauthorized access to sensitive customer information.
- HIPAA Breach Notification Rule (45 CFR §§164.400-414). 60-day individual-notice clock. Concurrent HHS notice for 500-or-more-affected breaches; annual log for under-500-affected.
- State breach-notification laws (50-state mosaic; CA, NY, TX, IL, MA carry the most-cited specifics; CCPA / CPRA in California carries additional consumer rights). Verify state-specific timelines and trigger thresholds at draft time.
- NAIC Insurance Data Security Model Law (Model #668), §6 (notification of cybersecurity event) — 72-hour notice to commissioner for state-licensed insurers in adopting states.

## What changes for privacy-flagged disclosure-readiness work

### 1. Privacy notification clocks join the parallel-clocks table

Each clock applicable to the registrant has a row. The clocks frequently start from different basis events:

| Regulator | Clock basis | Typical clock |
|---|---|---|
| SEC (Item 1.05) | materiality determination | 4 business days |
| FTC Safeguards Rule (16 CFR Part 314) | breach affecting 500+ consumers | as soon as possible, no later than 30 days from discovery |
| Banking-agency Interagency Guidance | unauthorized access to sensitive customer information | as soon as possible (typically within days) |
| SEC Reg S-P (17 CFR Part 248.30) | awareness of unauthorized access | 30 days (covered institutions) |
| HIPAA Breach Notification Rule | discovery of breach of unsecured PHI | 60 days individual notice; concurrent HHS for 500+ |
| State breach-notification | awareness or determination, varies by state | varies by state (typically 30-90 days) |
| NAIC Model #668 §6 (state-licensed insurers) | determination of cybersecurity event | 72 hours |
| CCPA / CPRA (California) | breach affecting CA residents' nonencrypted personal information | "in the most expedient time possible and without unreasonable delay" |

The SEC Item 1.05 clock is the disclosure-side clock. The privacy clocks run independently and on different bases. A single incident can simultaneously trigger several.

### 2. Sensitive-customer-information posture drives Reg S-P

The SEC Reg S-P amendments define "sensitive customer information" (broader than the prior Safeguards Rule scope) and the 30-day clock runs on awareness of unauthorized access to that category, not on the broader cyber-incident materiality determination. The pack surfaces the Reg S-P determination separately from the Item 1.05 determination; the two are independent inquiries.

The Reg S-P customer-notification content requirements are distinct from the Item 1.05 disclosure content. The customer notice describes the incident, the type of sensitive customer information affected, and the contact information; it is not a substitute for, and is not substituted by, the 8-K Item 1.05 filing.

### 3. State breach-notification mosaic

Multi-state firms map state-by-state. The pack does not enumerate all 50 states by default; the scope identifies the states where customer information is implicated, and the parallel-clocks table carries one row per state with the trigger threshold and the clock.

CA, NY, TX, IL, and MA carry the most-cited specifics; CCPA / CPRA adds consumer-rights obligations on top of the breach-notification obligations. The Massachusetts standard for "personal information" is broader than many other states. The pack flags state-specific deviations.

### 4. HIPAA scope for in-scope financial-services entities

Most financial-services firms are not HIPAA-covered entities. Some are business associates under BAAs (e.g., FNOL handling for health insurers, claims processing for healthcare-affiliated counterparties). Where a financial-services firm is a business associate, the HIPAA 60-day individual-notice clock and the concurrent-HHS-notice for 500-or-more-affected obligations apply.

The pack flags the BAA posture and the resulting HIPAA-clock applicability when relevant.

### 5. Privacy-notification content overlap with Item 1.05

The Item 1.05 disclosure (nature, scope, timing, material impact) does not duplicate the privacy-notification content. The two notifications run on different audiences (investors versus affected individuals), different timing, and different content rules. The pack tracks both as parallel obligations.

A single incident may result in: the 8-K Item 1.05 filing (investors); the Reg S-P customer notice (affected individuals); state breach-notification letters (affected residents in scope); the federal banking agency notification (regulator); the NYDFS §500.17 notification (regulator); the FTC Safeguards Rule notification (regulator, for 500+ affected).

### 6. Sanctions and ransomware-payment due diligence

Where ransomware is in scope, the Treasury OFAC advisory on ransomware payments and the requirements that some payments to sanctioned actors are prohibited apply. NYDFS §500.17(c) (Second Amendment) requires a 24-hour notice of an extortion payment and within 30 days a written description including sanctions due-diligence performed.

The pack flags the ransomware-payment posture and the sanctions due-diligence record where applicable; this content interacts with privacy-notification content but is a separate analytical thread.

## Privacy-specific output additions

When privacy is in scope:

- Parallel-clocks table carries one row per privacy clock applicable to the registrant.
- Artifact A's `materiality_basis_quantitative.customer_impact_count` field is populated with named segments (financial customers, healthcare counterparties' patients, employees, others); the count drives several privacy clocks.
- Artifact A's facts-of-the-incident row carries the type of information accessed or used (sensitive customer information per Reg S-P; unsecured PHI per HIPAA; nonencrypted personal information per state laws); the type drives clock applicability.
- Source trace carries the privacy-side citations alongside the SEC citation.

## Common pitfalls

- Treating privacy clocks as out-of-scope because the work is SEC-anchored. The parallel-clocks table is multi-regulator by design.
- Substituting the 8-K Item 1.05 filing for the Reg S-P customer notice or for state breach-notification letters. The notifications run on different audiences and different content rules; one does not satisfy the other.
- Using a single state's breach-notification timeline as a proxy for all states. State-specific timelines vary; the parallel-clocks table is state-by-state for multi-state incidents.
- Missing the BAA posture when the firm is a HIPAA business associate. BAA status pulls the firm into the HIPAA Breach Notification Rule timeline.
- Omitting the FTC Safeguards Rule trigger for non-bank financial institutions affected by a 500+ consumer breach. The FTC trigger is on top of the SEC and the banking-agency triggers.
- Conflating Reg S-P sensitive-customer-information awareness with materiality determination. The Reg S-P 30-day clock starts at awareness of unauthorized access; the SEC 4-business-day clock starts at materiality determination. Different basis events.
- Treating the NYDFS §500.17(c) extortion-payment notice as a private matter. The 24-hour and 30-day notices are NYDFS obligations; the sanctions due-diligence record is part of the 30-day written description.
