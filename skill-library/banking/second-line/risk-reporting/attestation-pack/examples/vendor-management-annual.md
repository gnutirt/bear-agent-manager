# Example: annual vendor-management attestation pack for a critical fraud-screening vendor

Public-source-derived. No named institution. Vendor named "Vendor V" only. Framing patterns from the U.S. interagency third-party risk management guidance (June 2023), AICPA SSAE 18 / SOC 2 management assertion, and the COSO 2013 Internal Control framework. Source-anchor verification flags carried forward per the source-anchors discipline.

## Input

- Institution: large national bank, OCC-supervised, with a Heightened Standards-covered subsidiary; the attestation supports the firm's third-party reporting to the Risk Committee and feeds the OCC continuous-monitoring discussion.
- Engagement scope supplied: primary regulator OCC; persona = Head of Vendor Management, second line, reporting to Head of Operational Risk; sector overlay = banking; cross-cutting overlays = cyber (vendor-cyber posture is in scope), privacy (customer-data flow); source posture = public-plus-firm-policy-plus-evidence.
- Attestation period: prior calendar year. Annual cadence.
- Vendor V: critical third-party fraud-screening service used in real-time card-transaction screening. Service classified as critical under the firm's third-party criticality tiering.
- Upstream artifacts on file: third-party-risk control matrix (14 controls organised by lifecycle stage); the vendor's most recent SOC 2 Type II report; quarterly KRI reviews; ongoing-monitoring meeting minutes; contract amendments; exit-test record; financial-condition reviews; regulatory-watch updates; the firm's third-party-risk policy; prior-period attestation pack with three closed exceptions and one open at year-end.

## Output sketch

The skill emits a markdown pack and a structured record. Headlines:

- **Cover** — attestation period, scope (Vendor V; real-time card-transaction fraud screening; integration points named; legal-entity perimeter), attesting role = Head of Vendor Management, attestation type = vendor-management, assertion-language version 4.2, source posture, scope ID linked.
- **Executive summary** — five bullets in attesting role's voice. Headline: vendor relationship operating effectively in all material respects subject to two named exceptions; one in active remediation, one pending architecture review next quarter.
- **Scope statement** — names the vendor (anonymised as "Vendor V"), the service, the system integration points (real-time API at the card-transaction-authorisation layer, batch reconciliation feed to fraud-data warehouse), the legal-entity perimeter (top-tier bank and subsidiary), and the time period.
- **Source criteria** — interagency third-party risk management guidance (June 2023); AICPA SSAE 18 AT-C 320 for the vendor SOC 2 reliance; firm third-party-risk policy v3.1; firm vendor-management framework v2.4.
- **Control inventory** — 14 controls from the upstream control matrix, organised by lifecycle stage (planning / due diligence / contract / ongoing monitoring / termination). Each row carries owner role, framework component, design and operating effectiveness ratings, linked evidence IDs, and linked exception IDs where relevant.
- **Evidence index** — 31 rows. Most recent SOC 2 Type II report (with carve-outs flagged); CUEC-evidence rows for each user-entity control the SOC report identifies; quarterly KRI reviews; contract amendments executed in the period; ongoing-monitoring meeting minutes (12 entries); exit-test record from the annual exercise; quarterly financial-condition reviews; regulatory-watch updates from the third-party-risk team. Each row names producer role, system of record, period covered, and linked control IDs.
- **Exceptions** — two open exceptions. Exception 1 (severity high): the most recent SOC 2 Type II carries a control gap on logical access reviews; compensating control = the firm's quarterly access-recertification overlay run by IAM, evidenced by the recertification logs in the system-of-record IAM tool, status = open, linked issue ID. Exception 2 (severity high): vendor outage in Q2 demonstrated insufficient resilience; compensating control narrative carries the dual-vendor architecture in-flight review, status = pending-review, target remediation date = end of Q3, linked issue ID. Both exceptions are reflected as a carve-out in the assertion text.
- **Prior-period remediation status** — three prior-period exceptions, all remediated; evidence pointers cite the closure memos in the issue-management system. One prior-period exception that was open at prior year-end (vendor financial-deterioration alert) is carried forward as remediated with the closure-memo evidence pointer.
- **Sub-certification chain** — the Head of Vendor Management's sub-certification feeds the Head of Operational Risk's roll-up sub-certification, which feeds the CRO's roll-up to the Risk Committee. The chain is named in `sub_certification_chain[]`.
- **Reviewer questions** — five questions anticipating OCC continuous-monitoring posture: dual-vendor architecture timeline, exit-plan testing cadence, contingency for sustained vendor outage, CUEC-control coverage of the SOC 2 carve-out, financial-condition trigger thresholds.
- **Assertion text** — firm vendor-management attestation language, version 4.2, with the two named carve-outs surfaced in the qualification clause.
- **Sign-off block** — Head of Vendor Management (signature blank), Head of Operational Risk (witness role, signature blank), General Counsel (legal review role, signature blank). Date fields blank until signed.
- **Confidence label** — medium. Two open exceptions with one in active remediation and one pending; full evidence-index coverage of in-scope controls supports medium rather than low.

The pack stops at draft. The attesting officer signs after legal review and after the Head of Operational Risk reviews the carve-outs.

## Why this scenario matters

- Two open exceptions named with specifics rather than concealed in narrative. The qualified attestation reads cleanly to the OCC and the external assessor.
- SOC report is supplemented by CUEC-level evidence at the user firm, not taken at face value.
- Compensating controls are named and evidenced; the dual-vendor pending-review case is treated as `pending-review` not `remediated`.
- Sub-certification chain is explicit; the pack is the function-head sub-certification, not the executive certification.
- Confidence label is medium because exceptions are open; not "high" with carve-outs concealed.

## Anchors

- Interagency third-party risk management guidance (June 2023), Section III.D ongoing monitoring.
- AICPA SSAE 18 / AT-C 320 (SOC 1) and AT-C 105 / 205 (SOC 2).
- COSO Internal Control — Integrated Framework (2013).
- OCC Heightened Standards (12 CFR Part 30 Appendix D).

See `references/source-anchors.md` for full citations and verification flags.
