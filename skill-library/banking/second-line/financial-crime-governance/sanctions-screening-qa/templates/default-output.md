# Sanctions screening QA memo

**Program ID**: [program identifier; placeholder for sample]
**Institution type**: [bank | broker-dealer | mutual fund | covered-product life insurer | FCM/IB | MSB | fintech (sponsor-bank) | covered investment adviser | other]
**Engagement ID**: [pointer to scope record, or "none — scope not formalised"]
**Review type**: [periodic_sample_qa | pre_validation_review | exam_readiness_review | list_event_review | cyber_evasion_targeted_review]
**Review window**: [start_date] to [end_date]
**As of**: [date the QA was last revised]
**Owner (role)**: [e.g., second-line sanctions QA reviewer]
**Approver (role)**: [sanctions officer | head of financial-crime QA | BSA officer]
**Confidence label**: [high | medium | low | unknown]

## Sanctions risk posture summary

- List set in use: [OFAC SDN; OFAC SSI; OFAC FSE; OFAC NS-PLC; other OFAC programs; non-OFAC: UN, EU, UK OFSI, jurisdictional]. Date-as-of every list citation in the source trace.
- Jurisdictions and corridors in scope.
- Product / customer / counterparty population that drives the program's risk concentration.
- Recent OFAC enforcement themes the program reads against (pattern reference; no name-drop unless public consent-order defendant).

## List management governance

- List sources: [primary feeds; secondary feeds; manual lists].
- Update cadence: [documented and observed; lag against OFAC publication date is the benchmark].
- Last verified update: [date].
- Delta-vs-full reconciliation: [evidence; what stops a designation from being dropped between deltas].
- Feed-mapping completeness: [complete | partial | gap_identified | unknown] — and the designation types that flow through the feed to the screening engine.
- Open list-management findings: [list].

## Screening configuration

- **Customer screening rules**: onboarding screen, rescreen cycle (delta vs full), event-driven rescreen triggers.
- **Transaction screening rails**: [wire | ACH | card | faster-payments | trade-finance message | securities settlement | beneficiary-at-claim | other]; real-time vs near-real-time vs batch.
- **Match-logic summary**: algorithm class (exact, phonetic, edit-distance, vendor-specific). Vendor model risk sits in `aml-model-monitoring`; cross-reference here.
- **Fuzzy-threshold setting**: documented threshold, basis (BTL testing, vendor recommendation, calibration analysis), last calibration date.
- **Exclusion lists / good-guy lists**: documented? owner? refresh cadence? re-review evidence? An undocumented exclusion list is a material finding.
- `screening_configuration_status`: [sufficient | partial | missing].

## Alert disposition QA (alert-by-alert)

> The QA reviews each sampled alert's documentation. It does not re-decide match-or-no-match; the sanctions officer owns that.

| Alert ID | Date | Rail | List source | Match score / threshold | Disposition | FP rationale category | Decision-maker role | 50%-rule assessed | Evidence pointer | Findings |
|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | false_positive_closed / true_match_blocked / true_match_rejected / true_match_reported / escalated_pending / released_with_rationale | name-only-match / dob-mismatch / geography-mismatch / identifier-mismatch / role-mismatch / common-name / prior-cleared-counterparty / generic-or-boilerplate / other | | yes / no / not_applicable / unknown | | |

Sample basis: [risk-based, stratified, random; size; rationale]. Generic-or-boilerplate FP rationale ("reviewed, not a match"; "false positive") is itself a `fp_rationale_documentation` finding.

## 50 Percent Rule and sectoral sanctions handling

- Aggregation methodology documented at program level: [yes / no]. If yes, signed by [sanctions officer | other].
- Methodology summary: how multi-owner aggregation, chain ownership, indirect ownership, and beneficial-ownership conflicts are resolved.
- Evidence basis for ownership reads: [corporate registry | BO certification | commercial database | vendor analytics]. Database-only reads on offshore structures are a known gap.
- Edge-case routing: [sanctions counsel | OFAC FAQ reference | OFAC licensing route].
- SSI handling distinct from SDN: [yes / no]. Directive-specific logic applied where applicable: [debt / equity tenor restrictions; other].
- Secondary-sanctions posture (where the program has non-US activity touching US-sanctioned parties): [note].

## List-update event reviews

| Event date | Designation type | Institution response evidence | Response timing vs OFAC publication | Cross-rail consistency checked | Cyber overlay assessed |
|---|---|---|---|---|---|
| | | full re-scan / delta processing / customer-base sweep / payment-rail re-scan | | yes / no | yes / no |

The OFAC publication date is the benchmark for response timing, not the institution's internal publication.

## Cyber-evasion exposure (cross-cutting overlay)

> Loaded when the scope flags cyber. See `references/cross-cutting/cyber.md`.

- **Virtual-currency exposure**: [material | limited | none | unknown]. Controls evidence: [blockchain-analytics vendor; address screening; attribution governance]. Vendor outputs are vendor outputs; cite the vendor and route vendor-diligence findings to `third-party-operational-resilience/vendor-diligence`.
- **Ransomware-payment exposure**: [material | limited | none | unknown]. Controls evidence aligned to OFAC ransomware advisories and FinCEN ransomware advisories: pre-payment OFAC analysis, voluntary self-disclosure posture, sanctions-officer routing for incident-response, cyber-insurance, and remediation-vendor payment paths.
- **Cyber-enabled identity exposure**: [material | limited | none | unknown]. Controls evidence: identity-verification vendor governance, biometric checks, anomaly detection, integration with the screening pipeline.
- **Decentralized-finance / bridge / mixer-adjacent exposure**: [material | limited | none | unknown].

## Material findings

| ID | Finding | Criterion | OFAC Framework component (or FFIEC OFAC section) | Severity | Evidence pointer |
|---|---|---|---|---|---|
| 1 | | list_update_timeliness / feed_mapping_completeness / delta_vs_full_reconciliation / match_logic_documentation / fuzzy_threshold_calibration / exclusion_list_governance / fp_rationale_documentation / fp_rationale_taxonomy / decision_maker_independence / escalation_path_evidence / fifty_percent_rule_methodology / fifty_percent_rule_evidence_basis / ssi_distinct_handling / directive_specific_logic / list_event_response_timing / cross_rail_consistency / cyber_evasion_exposure_assessment / virtual_currency_controls / ransomware_advisory_alignment / cyber_identity_controls / vendor_model_risk_coverage / training_evidence / sanctions_officer_signoff / other | management_commitment / risk_assessment / internal_controls / testing_and_auditing / training / ffiec_ofac_section / other | material / moderate / minor / observation | |

The criterion is named, not implied.

## Material gaps and evidence-needed items

| Gap | Criterion | Evidence needed |
|---|---|---|
| | | |

Each gap stays `[evidence needed]` until resolved by the relationship owner, the sanctions function, or the BSA program.

## Recommended human-review gates and owner actions

- **Recommendation**: [no_further_action | evidence_request_to_first_line | tuning_review_via_aml_model_monitoring | list_management_remediation | fifty_percent_rule_methodology_remediation | training_feedback | process_change_recommendation | escalate_to_sanctions_officer | other].
- **Recommended gates** (where added or tightened):

| Gate | Criterion | Required reviewer | Stop condition |
|---|---|---|---|
| | | sanctions officer / BSA officer / sanctions counsel / model-risk reviewer | |

- **Owner action**: [named role; what they do next].
- **Review gates this memo must clear**: [scope, evidence, authority, impact, decision].
- **Cross-references**: [`aml-model-monitoring` ticket where match-logic / threshold tuning is implicated; `cdd-risk-review` record where ownership-and-control evidence is implicated; `sar-decision-qa` linkage where a sanctions-adjacent SAR alert intersects].
- The memo does not approve list configuration, tune match logic, file blocking or rejection reports, or close alerts. The sanctions officer (and the firm's escalation chain) decides.

## Source trace

| Claim | Source | Section | Date as-of | URL or file ref | Confidence |
|---|---|---|---|---|---|
| | | | | | high / medium / low / unknown |

Cite `references/source-anchors.md` for canonical citations. OFAC list citations carry a date-as-of (lists move). Use `[verify section]` if the section reference is unknown; do not invent.

---

*Memo depth scales to review type and audience.* A periodic sample QA reads tighter with patterns rolled up across alerts; a pre-exam readiness pass reads long and formal; a list-event review goes deep on response-timing and cross-rail consistency; a cyber-evasion targeted review goes deep on the cross-cutting overlay.

*Audience shapes the memo.* A sanctions officer reads for material defensibility issues and program-level patterns. A QA team reads for criterion-by-criterion calibration. A BSA officer reads for governance signal and committee escalation. An examiner-response file reads formal and full source-traced.

*Hybrid output convention.* Where the alert-disposition sample is large enough to warrant a separate workbook, the alert-by-alert table renders to an Excel workbook (`xlsx` skill) and the surrounding memo renders to Word (`docx` skill). The schema record (`schemas/sanctions-alert.schema.json`) is the structured equivalent and is the cross-skill contract.
