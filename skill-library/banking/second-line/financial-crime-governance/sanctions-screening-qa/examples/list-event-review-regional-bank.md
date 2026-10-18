# Example: list-event review at a regional bank

Public-source-derived. No named institution. The shape mirrors a standing pattern at regional banks following a hypothetical week of significant new SDN designations: a customer-base full re-scan, a payment-rail re-scan, and the cross-rail consistency-and-cyber-overlay checks that often fall through.

## Input

- **Institution**: a regional bank with retail, commercial, correspondent, and trade-finance activity. Single-state footprint with a small set of correspondent respondents.
- **Engagement scope supplied**: institution = regional bank; primary regulators = OCC and FRB (per charter; assume OCC for this example); persona = second-line sanctions QA reviewer reporting to the BSA officer with the sanctions officer in the chain; source posture = public-plus-firm-policy-plus-system-of-record-evidence; sector overlays = banking; cross-cutting overlays = cyber (because a portion of the new designations are virtual-currency-adjacent typologies).
- **Review type**: `list_event_review`. Review window: 14 days after the OFAC publication date of the new SDN designations.
- **Evidence pulled**: list-update audit log; full-rescan completion log per system; trade-finance system feed-mapping configuration; cross-rail alert correlation extract; cyber-overlay assessment artifact (or lack thereof); sanctions officer post-event memo to the BSA officer.

## Output sketch

The skill produces a Word memo (rendered via the `docx` skill). The alert-disposition workbook is light because this is an event review, not a sample QA. Headlines:

- **Sanctions risk posture summary** — list set: OFAC SDN, OFAC SSI, EU Consolidated, UK OFSI Consolidated. Event scope: SDN sweep with 47 new designations including 9 virtual-currency-adjacent designations; effective on the OFAC publication date.
- **List management governance for the event** — full re-scan against new designations completed within 24 hours of OFAC publication for the customer base. One trade-finance system relied on a delta-update batch and did not include a flagged designation type for 36 hours due to a feed mapping gap (the system did not map the "Digital Currency Address" record type from the SDN List). Delta-vs-full reconciliation evidence is current for the deposit and wire systems; absent for the trade-finance system.
- **Screening configuration delta** — no configuration changes during the window. Match-logic and fuzzy thresholds unchanged. Exclusion list re-reviewed against new designations; no exclusion-list entries hit the new designations.
- **Alert disposition QA (event-window only)** — workbook of 23 alerts raised against the new designations across the window. 18 dispositioned as `false_positive_closed` with documented rationale tying to specific list source and identifier mismatch. 4 escalated to the sanctions officer; 1 still pending at the time of QA. Decision-maker independence holds. 50%-rule assessed = `yes` on the 4 escalated alerts; `not_applicable` on the 18 closed alerts; `unknown` on the pending alert (the QA flags this as a documentation gap to close at disposition).
- **50 Percent Rule and sectoral sanctions handling** — methodology in place at program level (signed by the sanctions officer 8 months ago); evidence basis is corporate-registry plus commercial-database; chain-ownership reads documented for the 4 escalated alerts.
- **List-update event reviews**:
  - Event date: [OFAC publication date]. Designation type: SDN-add (mixed natural-person and entity, including 9 virtual-currency-adjacent). Institution response: full re-scan on customer base (24 hours), delta processing on rails (within 6 hours for deposit and wire; 36 hours for trade-finance with the feed-mapping gap). Cross-rail consistency check documented for deposit and wire only; not documented for trade-finance and not documented for card. Cyber-overlay assessment: not performed (the QA finding).
- **Cyber-evasion exposure for the event** — virtual-currency exposure is limited at this institution (no on-ramp / off-ramp activity directly). The 9 virtual-currency-adjacent designations include digital-currency address records on the SDN List; the institution's screening engine does not ingest that record type. Address-level screening is `not-in-place`. Ransomware-payment exposure: limited (no incident-response payment paths in the window). Cyber-identity exposure: limited.
- **Material findings**:
  - `criterion = feed_mapping_completeness`, `framework_component = internal_controls`, severity material. Trade-finance system feed-mapping gap on the Digital Currency Address record type; 36-hour exposure on a flagged designation type.
  - `criterion = cross_rail_consistency`, `framework_component = testing_and_auditing`, severity moderate. Cross-rail consistency check documented for deposit and wire only; trade-finance and card not documented.
  - `criterion = cyber_evasion_exposure_assessment`, `framework_component = risk_assessment`, severity material. No standing cyber-overlay assessment as part of the list-event response process; the 9 virtual-currency-adjacent designations were not assessed for evasion-typology intersection.
  - `criterion = list_event_response_timing`, `framework_component = internal_controls`, severity moderate. Trade-finance 36-hour lag against OFAC publication.
- **Recommended gates**:
  - `feed-mapping-completeness-check-after-list-events` — required reviewer: sanctions officer with operations technology lead concurrence; stop condition: list-event sweep without a documented feed-mapping completeness check across all rails.
  - `cross-rail-consistency-check-artifact` — required reviewer: sanctions officer; stop condition: list-event response without cross-rail consistency artifact.
  - `designation-type-cyber-overlay-assessment` — required reviewer: sanctions officer with reference to `references/cross-cutting/cyber.md`; stop condition: list-event response without a designation-type cyber-overlay assessment when the event includes virtual-currency-adjacent designations.
- **Recommendation**: `process_change_recommendation` with detail covering the three gates above. Cross-references: `aml-model-monitoring` for the trade-finance feed-mapping technical follow-up; vendor-diligence in `third-party-operational-resilience/vendor-diligence` for the trade-finance system vendor read.
- **Source trace** — anchors to OFAC Framework May 2, 2019 (testing-and-auditing, internal controls, risk assessment), FFIEC OFAC section, OFAC Sanctions Compliance Guidance for the Virtual Currency Industry October 15, 2021 [verify date]. List citations carry date-as-of of the OFAC publication date.
- **Confidence label**: `high` for the documented findings (evidence is the institution's own audit log, completion logs, and feed configuration); `medium` on the cyber-overlay assessment finding because the institution may have an undocumented assessment that did not make it to the file the QA pulled.

## Why this scenario matters

- **OFAC publication date is the benchmark for response timing**, not the institution's internal publication date. The trade-finance 36-hour lag is measured against OFAC, not against the institution's own delta cycle.
- **Feed-mapping gaps are foundational findings**. A system that does not ingest a designation type from the list source is not just slow; it is silent. The QA reads feed-mapping completeness as a discrete control, not an inference from response time.
- **Cross-rail consistency is part of the post-event sweep**, not a routine control. A customer hit on wire and cleared on ACH within the same window without documentation is the failure mode the cross-rail check catches.
- **The cyber-overlay assessment as a standing list-event step** is the operative read on virtual-currency-adjacent designations. The overlay is not optional when the designation set includes such records.
- **Address-level screening capability is a distinct program element**. The SDN List's Digital Currency Address records require ingestion at the screening engine; name-only screening does not reach them.

## Anchors

- A Framework for OFAC Compliance Commitments (OFAC, May 2, 2019).
- FFIEC BSA/AML Examination Manual — Office of Foreign Assets Control section.
- OFAC Sanctions Compliance Guidance for the Virtual Currency Industry (October 15, 2021) [verify date].
- OFAC SDN List — Digital Currency Address identifier records.

See `references/source-anchors.md` for full citations, `references/sector-overlays/banking.md` for the bank-specific frame, and `references/cross-cutting/cyber.md` for the evasion-typology overlay and the address-level screening read.
