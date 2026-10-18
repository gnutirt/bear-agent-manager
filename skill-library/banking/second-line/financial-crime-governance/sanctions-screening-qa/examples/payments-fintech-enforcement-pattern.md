# Example: payments-fintech enforcement-pattern QA

Public-source-derived. No named institution. The shape mirrors a standing pattern in resolved OFAC enforcement matters against payments and fintech firms: list-update lag, generic FP rationale documentation, and 50 Percent Rule oversight gaps. The QA reads the firm's program against the OFAC Framework five components and the FFIEC OFAC section; it does not redo the enforcement matter.

## Input

- **Institution**: a payments fintech operating under a sponsor-bank model with a card program, a wire and ACH rail, and a stablecoin on-ramp / off-ramp.
- **Engagement scope supplied**: institution = fintech (sponsor-bank); primary regulators = OFAC and the sponsor bank's primary federal regulator (FDIC for this example); persona = second-line sanctions QA reviewer; source posture = public-plus-firm-policy-plus-system-of-record-evidence; sector overlays = payments-fintech; cross-cutting overlays = cyber.
- **Review type**: periodic sample QA over a 12-month window across two payment rails (wire, ACH) and the on-ramp / off-ramp activity. Sample of 100 alert dispositions stratified by rail and list source.
- **Evidence pulled**: list-management runbook; list-update audit log against OFAC publication dates; screening-engine configuration export; fuzzy-threshold calibration memo; alert-disposition workpapers; 50 Percent Rule methodology document (or lack thereof); blockchain-analytics vendor evidence; sponsor-bank handoff package and re-attestation log.

## Output sketch

The skill produces a Word memo (rendered via the `docx` skill) plus an Excel alert-disposition workbook (rendered via the `xlsx` skill) for the 100-alert sample. Headlines:

- **Sanctions risk posture summary** — list set: OFAC SDN, OFAC SSI, EU Consolidated, UK OFSI Consolidated; on-ramp / off-ramp activity carries virtual-currency exposure; sponsor-bank program agreement allocates screening responsibility (fintech detects; sponsor bank reviews and decides).
- **List management governance** — documented update cadence is "intra-day on OFAC publication". Audit log evidence shows lag of 2 to 5 business days for delta updates against OFAC publication date in 12% of in-window updates. Delta-vs-full reconciliation evidence is partial; full re-scans run weekly with no documented control preventing dropped designations between full cycles. Feed-mapping completeness: gap_identified — virtual-currency address designations from the SDN List's identifier records are not ingested into the screening engine.
- **Screening configuration** — match-logic summary: vendor edit-distance algorithm with phonetic supplement; fuzzy threshold set at 0.75 (vendor recommendation, last calibrated 18 months ago); exclusion list has 137 entries with no documented owner, refresh cadence, or re-review evidence.
- **Alert disposition QA (alert-by-alert)** — workbook of 100 alerts. FP-rationale documentation is generic ("reviewed, not a match"; "false positive") in 30 of 100 sampled dispositions. Decision-maker independence holds (relationship owners do not dispose). 50%-rule assessed = `no` on 18 alerts where the alert touched ownership / control of a designated person.
- **50 Percent Rule and sectoral sanctions handling** — aggregation methodology not documented at program level; aggregation handled case-by-case at analyst discretion. SSI handling collapsed into SDN-style blocking for 6 of 7 sampled SSI hits; directive-specific tenor logic not applied.
- **List-update event reviews** — three material events in the window (an SDN sweep, an SSI directive change, a virtual-currency mixer designation). Response-timing-vs-OFAC-publication: 24 hours, 36 hours, 9 days respectively. Cross-rail consistency check documented for the first event only. Cyber-overlay assessment performed for the mixer designation but not for the SDN sweep.
- **Cyber-evasion exposure** — virtual-currency exposure: material. Address-level screening not in place against OFAC-designated addresses; analytics-vendor outputs run in a parallel pipeline and feed disposition narrative but do not generate alerts. Ransomware-payment exposure: limited (no documented incident-response payment paths); pre-payment OFAC analysis playbook exists but is policy-only with no test evidence. Cyber-identity exposure: limited; IDV-to-screening pipeline carries name-and-DOB only with no anomaly-or-confidence signal.
- **Material findings**:
  - `criterion = list_update_timeliness`, `framework_component = internal_controls`, severity material. Lag of 2 to 5 business days against OFAC publication in 12% of in-window updates; the OFAC publication date is the benchmark.
  - `criterion = feed_mapping_completeness`, `framework_component = internal_controls`, severity material. Virtual-currency address-level designations not ingested.
  - `criterion = fp_rationale_documentation`, `framework_component = testing_and_auditing`, severity material. 30% of sampled dispositions carry generic rationale; tuning evidence becomes impossible.
  - `criterion = fifty_percent_rule_methodology`, `framework_component = internal_controls`, severity material. No program-level methodology; analyst-discretion handling.
  - `criterion = ssi_distinct_handling`, `framework_component = internal_controls`, severity moderate. Sectoral collapsed into SDN-style; directive-specific tenor logic missing.
  - `criterion = address_level_screening` (cyber overlay → `cyber_evasion_exposure_assessment`), `framework_component = internal_controls`, severity material. Mixer-address designations not screened.
  - `criterion = exclusion_list_governance`, `framework_component = internal_controls`, severity moderate. 137-entry exclusion list with no documented owner, refresh cadence, or re-review evidence.
- **Recommended gates**:
  - `list-update-SLA-evidence` — required reviewer: sanctions officer; stop condition: list deployed without delta-vs-full reconciliation evidence.
  - `fp-rationale-documentation-standard` — required reviewer: sanctions officer; stop condition: disposition closed without rationale category from the documented taxonomy.
  - `fifty-percent-rule-methodology-program-level` — required reviewer: sanctions officer with sanctions-counsel concurrence.
  - `address-level-screening-implementation` — required reviewer: sanctions officer with model-risk reviewer concurrence (cross-reference `aml-model-monitoring`).
  - `exclusion-list-attestation` — required reviewer: sanctions officer; refresh cadence and re-review evidence required.
- **Recommendation**: `escalate_to_sanctions_officer` with detail covering list-management remediation, FP-rationale taxonomy, 50 Percent Rule methodology, and address-level screening capability. The QA does not direct match-or-no-match decisions on any specific alert, and does not direct the sanctions officer's filing of blocking or rejection reports on the at-issue alerts.
- **Source trace** — anchors to OFAC Framework May 2, 2019 (five components), 50 Percent Rule guidance August 13, 2014 [verify date], FFIEC OFAC section, OFAC Sanctions Compliance Guidance for the Virtual Currency Industry October 15, 2021 [verify date]. List citations carry date-as-of.
- **Confidence label**: `high` for the documented findings (evidence is the firm's own audit log, configuration export, disposition workpapers); `medium` on the cyber-evasion typology read because parts of the analytics-vendor evidence are vendor outputs.

## Why this scenario matters

- **The QA tests program evidence, not match decisions**. The findings are about list-management timeliness, configuration documentation, FP-rationale taxonomy, and methodology gaps. The QA does not propose that any specific at-issue alert should have closed differently or that the sanctions officer should have filed differently. That separation is what the skill enforces.
- **OFAC publication date is the benchmark for list timeliness**, not the institution's internal publication date. This is the most-common misframe.
- **Generic FP rationale documentation is itself a finding**. Without a rationale taxonomy, tuning evidence is impossible and the program cannot show its work to an examiner.
- **50 Percent Rule oversight gaps are program-level**. Analyst-discretion handling of multi-owner aggregation does not satisfy the rule; the program-level methodology has to be documented and signed.
- **The cyber overlay is sanctions-evasion-specific**, not generic cyber controls. Address-level screening against OFAC-designated wallet addresses is a discrete and citable obligation.

## Anchors

- A Framework for OFAC Compliance Commitments (OFAC, May 2, 2019) — five components.
- OFAC 50 Percent Rule Revised Guidance (August 13, 2014) [verify date].
- FFIEC BSA/AML Examination Manual — Office of Foreign Assets Control section.
- OFAC Sanctions Compliance Guidance for the Virtual Currency Industry (October 15, 2021) [verify date].
- OFAC Updated Advisory on Potential Sanctions Risks for Facilitating Ransomware Payments (September 21, 2021) [verify date].

See `references/source-anchors.md` for full citations, `references/sector-overlays/payments-fintech.md` for the rail-specific reads, and `references/cross-cutting/cyber.md` for the evasion-typology overlay.
