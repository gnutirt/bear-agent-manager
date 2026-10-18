# Fintech partner controls — evidence pack

The pack is two files. The **memo** carries the program summary, the disposition recommendation, and the second-line cover for the inventory. The **inventory workbook** carries the rows the sponsor bank's TPRM team consumes. The memo is rendered via the `docx` skill (in the `document-skills` plugin); the workbook is rendered via the `xlsx` skill. The markdown below is the content spec; it is the renderer's input, not the deliverable.

---

## Part A — Memo (Word, rendered via `docx`)

### Cover block

| Field | Value |
|---|---|
| Program (legal entity; brand if different) | |
| Program ID (stable; reused across `payments-risk-assessment`, `payment-operations-incident-review`, `concentration-risk-review`) | |
| Engagement ID (pointer to scope record, or "none — scope not formalised") | |
| As of | [date] |
| Review trigger | annual-sponsor-bank-review / sponsor-bank-led-audit / state-mtl-exam / sponsor-bank-questionnaire / processor-led-review / internal-audit-kickoff / post-incident-sponsor-bank-request / new-rail-delta / new-product-delta |
| Audience | sponsor-bank TPRM / sponsor-bank operating committee / state-MTL examiner via NMLS / CFPB EXAMS / internal audit / ERC |
| Owner role | head of payments compliance / BSA officer / CCO / program-management lead |
| Approver role | per firm policy for this trigger and audience |
| Confidence label | high / medium / low / unknown |

### §1033 status note

[Names the firm's role under §1033 (data provider, data recipient, both, none) and the implementation tier date as of the analysis date. The Personal Financial Data Rights Final Rule was finalised October 22, 2024 — verify current docket status, any litigation, congressional review, or compliance-date relief on the analysis date.]

### MSB / MTL status note

[Names the configuration-specific MSB posture against the FinCEN administrative-ruling library and the state-by-state MTL footprint via NMLS. MTMA adoption status varies state-by-state; verify on the analysis date. Categorical MSB-vs-not assertions are wrong; this is fact-pattern-specific.]

### Executive summary

Five bullets at most. Headlines from the inventory: top three open gaps with severity; disposition recommendation; any examiner-finding-grade items elevated to the sponsor bank's risk register; any control families whose evidence is `[evidence needed]`; any program-agreement clauses whose adherence is `partial` or `absent`.

### Program summary

- **Sponsor bank(s)** named by role with charter type and program-agreement effective date and agreement type (BaaS / sponsor / processor).
- **Processors** front-end / back-end / gateway.
- **BIN sponsor(s)** per network.
- **Ledger provider**.
- **KYC / CIP vendor**.
- **Fraud-decision vendor**.
- **Sanctions-screening vendor**.
- **Complaint-management vendor**.
- **Geographic footprint** (US states in scope; corridor countries if cross-border).
- **Customer base size by segment**.
- **Current-cycle volume by rail**.

### Regulatory perimeter and licensing posture

- **Sponsor-bank charter type** per sponsor; the prudential supervisor whose expectations flow through the program agreement.
- **Fintech-side licensing posture** — state-by-state MTL through NMLS with status, expiration, last exam date, MTMA adoption status; FinCEN MSB registration where applicable; specialised licences (NYDFS BitLicense, CA DFPI under CA Money Transmission Act and CCFPL, state-specific EWA frameworks).
- **CFPB direct-supervision posture** under the December 2024 larger-participant rule for digital consumer payment applications, where applicable [verify current state on the analysis date].

### Program-agreement control map (summary)

Memo carries the gap headlines from the inventory's program-agreement tab. The inventory carries the clause-by-clause detail.

| Clause | Adherence | Severity of gap (if any) | Owner role | Target close date |
|---|---|---|---|---|
| Oversight and audit rights | present / absent / partial | low / moderate / high / critical | | |
| Change-control rights | | | | |
| Termination and exit | | | | |
| Indemnification | | | | |
| Regulatory cooperation | | | | |
| Customer-data ownership | | | | |
| Sub-contractor flow-down | | | | |
| Insurance | | | | |
| Dispute / complaint routing | | | | |
| FBO architecture | | | | |
| Sponsor-bank reporting cadence | | | | |

### 12-month incident-history summary

| Incident date | Detection date | Root cause | Customer impact (population, dollar) | Sponsor-bank notification time vs contractual clock | Regulatory-notification posture | Remediation status | Read-across (control families) |
|---|---|---|---|---|---|---|---|
| | | | | within / breached by [duration] | state breach / NYDFS / CFPB / FFIEC / none | open / in-progress / closed | |

Cross-link to `payment-operations-incident-review` for the per-incident workflow; this row-set is the rolled summary.

### Sponsor-bank reporting cadence

Memo carries the report list. The inventory carries the per-report definition, threshold, owner, and last-delivery evidence.

| Report | Cadence | Recipient role at the sponsor bank | Last delivered |
|---|---|---|---|
| Reg E §1005.11 timing data | weekly / monthly | consumer-compliance officer | |
| NACHA return-rate monitoring | monthly | ACH operations / risk | |
| FBO subledger reconciliation | daily | TPRM / treasury operations | |
| Complaint volume and resolution | monthly | consumer-compliance officer | |
| Fraud-loss and dispute aging | monthly | risk | |
| Sanctions-screening posture | monthly | BSA officer | |
| SAR-filing posture | monthly | BSA officer | |
| Cyber and incident posture | monthly | CISO function | |
| Vendor-stack health | quarterly | TPRM | |

### Gaps and recommended remediation

| Risk reference | Description | Source citation (file path) | Severity | Owner role | Target close date | Status |
|---|---|---|---|---|---|---|
| | | `references/source-anchors.md#…` | low / moderate / high / critical | | | proposed / in-progress / complete |

### Open items and named follow-ups

| Description | Owner role | Target date |
|---|---|---|
| | | |

### Recommended disposition

[ready-for-sponsor-bank-review | ready-with-conditions | remediate-then-re-review | not-ready]

If `ready-with-conditions`, list the conditions. The pack is a draft. The named approver decides; the sponsor-bank TPRM team consumes separately.

### Source citations

| Claim | Source | Section | Retrieval date | URL or file ref | Notes |
|---|---|---|---|---|---|
| | | | | | paywalled disclaimer / [verify section] / current state confirmed |

Cite `references/source-anchors.md` for canonical citations.

---

## Part B — Control inventory workbook (Excel, rendered via `xlsx`)

The workbook carries the operative detail. The sponsor bank's TPRM team typically pulls a subset against its own intake template; the workbook holds the union.

### Tab 1 — Cover

Mirrors the memo's cover block plus a sheet-by-sheet table of contents.

### Tab 2 — Control inventory (the load-bearing tab)

One row per control. Columns:

| Field | Notes |
|---|---|
| `control_id` | Stable per-program identifier; e.g., `REGE-1005.11-DISPUTE-TIMING-001` |
| `control_family` | reg-e / reg-dd / reg-ii / reg-z / reg-cc / nacha-ach / nacha-same-day / card-debit / card-credit / fednow / rtp / p2p / check / cross-border / vc-on-ramp / fbo-mechanics / bsa-cip / bsa-monitoring / bsa-sar / sanctions-screening / udaap-account-closure / udaap-fee-disclosure / udaap-fdic-representation / cyber-notification / privacy-glba / privacy-1033 / vendor-oversight / program-agreement / sponsor-bank-reporting |
| `rail_or_product` | ach / same-day-ach / wire / card-debit / card-credit / fednow / rtp / p2p / check / cross-border / vc / multi / n-a |
| `regulatory_anchor` | citation by file path into `references/source-anchors.md` |
| `control_description` | what the control does, in practitioner language |
| `control_owner_role` | role on the operator side |
| `sponsor_bank_recipient_role` | role on the bank side that consumes the evidence |
| `evidence_artifact` | named artifact (e.g., "monthly Reg E §1005.11 timing report", "WEB Debit account-validation coverage report") |
| `evidence_source_system` | system of record |
| `evidence_freshness_flag` | current / aging / stale / not-on-file |
| `last_refreshed_date` | |
| `frequency` | continuous / daily / weekly / monthly / quarterly / annual / event-triggered |
| `kri` | named KRI for the control, where applicable |
| `kri_threshold` | numeric or `[evidence needed]` |
| `kri_current_value` | numeric or `[evidence needed]` |
| `status` | within-appetite / watch / breach / evidence-needed |
| `gap_severity` | none / low / moderate / high / critical |
| `gap_description` | |
| `target_close_date` | |
| `notes` | paywalled-rule disclaimer, [verify section] flags, cross-references |

### Tab 3 — Program-agreement control map

One row per material clause. Columns:

| Field | Notes |
|---|---|
| `clause_id` | per the program agreement section |
| `clause_topic` | oversight-and-audit / change-control / termination-and-exit / indemnification / regulatory-cooperation / customer-data-ownership / sub-contractor-flow-down / insurance / dispute-and-complaint-routing / fbo-architecture / sponsor-bank-reporting / other |
| `expectation_under_tprm_guidance` | per Interagency Guidance on Third-Party Relationships (June 2023) and Joint Statement on Bank-Fintech Arrangements (July 2024) |
| `present_absent_partial` | |
| `evidence_of_adherence` | named artifact |
| `gap_severity` | |
| `gap_description` | |
| `owner_role` | |
| `target_close_date` | |
| `notes` | |

### Tab 4 — Customer-protection evidence

Reg E §1005.11 timing evidence in detail. Columns:

| Field | Notes |
|---|---|
| `period` | month / quarter |
| `total_disputes_received` | by intake channel (operator-direct, sponsor-bank-routed) |
| `disputes_resolved_within_10_business_days` | count and rate |
| `disputes_provisionally_credited_within_10_business_days` | count and rate |
| `disputes_resolved_within_45_calendar_days` | count and rate |
| `disputes_in_90-day_window_resolved` | count and rate (POS / foreign-initiated / new-account) |
| `written_notification_timing_breaches` | count |
| `aging_by_stage` | snapshot |
| `kri_threshold` | per firm policy and per sponsor-bank expectation |
| `kri_current_value` | |
| `status` | within-appetite / watch / breach / evidence-needed |

Plus parallel rows for §1005.6 unauthorised-transfer liability allocation (claims allocated fintech-side vs bank-side), Reg DD disclosure-stack review (fee-disclosure-vs-actual reconciliation), FDIC misrepresentation review (marketing-claim review log), account-closure / hold notice timing.

### Tab 5 — FBO subledger reconciliation evidence

Daily reconciliation summary plus exception aging. Columns:

| Field | Notes |
|---|---|
| `date` | |
| `reconciliation_completed_yn` | |
| `breaks_opened` | count and dollar |
| `breaks_resolved_within_sla` | count, rate |
| `breaks_aged_past_sla` | count, dollar, oldest |
| `pass-through_eligibility_evidence` | sponsor-bank confirmation document |
| `marketing-claim_review_status` | per FDIC misrepresentation rule |
| `escheatment_status_by_state` | last-completed cycle |

### Tab 6 — NACHA return-rate monitoring

Monthly. Columns:

| Field | Notes |
|---|---|
| `period` | |
| `administrative_return_rate` | per current NACHA threshold (paywalled — verify against firm's licensed copy) |
| `overall_return_rate` | |
| `unauthorised_return_rate` | by Originator and rolled |
| `web_debit_account_validation_coverage_rate` | per the rule effective March 19, 2021 |
| `same_day_ach_per_transaction_dollar_limit_breaches` | |
| `kri_threshold` | per firm policy and per sponsor-bank expectation |
| `kri_current_value` | |
| `status` | |

### Tab 7 — BSA / AML / sanctions evidence

Monthly. Columns:

| Field | Notes |
|---|---|
| `period` | |
| `cip_coverage_rate` | where applicable per 31 CFR §1022.220 |
| `monitoring_alert_volume` | by scenario family |
| `sar_filings_count_and_aging` | (for direct-filing MSBs) or routing log (for sponsor-bank-routed) |
| `sanctions_hit_volume` | true positives and false positives |
| `ofac_list_update_sla` | days from list update to coverage |
| `travel_rule_threshold_compliance` | where applicable |

### Tab 8 — Subcontractor and fourth-party register

One row per material vendor. Columns:

| Field | Notes |
|---|---|
| `vendor_role` | named by function, not by brand |
| `function` | processor (front-end / back-end / gateway) / KYC / fraud-decision / sanctions-screening / ledger / dispute-management / other |
| `criticality` | critical / high / moderate / low |
| `most_recent_soc_2_audit_period` | |
| `soc_2_opinion` | unqualified / qualified |
| `open_exceptions` | count and remediation status |
| `contract_clause_coverage` | per the operator-vendor contract; sub-contractor flow-down posture |
| `last_oversight_review_date` | |
| `evidence_freshness_flag` | current / aging / stale / not-on-file |

### Tab 9 — Sponsor-bank reporting cadence

The full report list with definition, threshold, owner, last-delivered. Mirrors the memo's table.

### Tab 10 — 12-month incident history

One row per material incident. Mirrors the memo's incident-history table with additional columns for the operator's internal review note and the sponsor-bank acknowledgement.

### Tab 11 — Self-evidence index

The bridge between the inventory and the artifacts. One row per evidence artifact named anywhere in the inventory. Columns:

| Field | Notes |
|---|---|
| `evidence_id` | |
| `linked_control_ids` | foreign keys into Tab 2 |
| `artifact_name` | |
| `artifact_owner_role` | |
| `location` | system of record / vendor portal / document repository / contract repository |
| `last_refreshed_date` | |
| `freshness_flag` | current / aging / stale / not-on-file |

### Tab 12 — Gaps and remediation portfolio

One row per gap. Mirrors the memo's gaps table with additional columns for the cross-link into the inventory row that surfaced the gap.

---

*Pack depth scales to the trigger and the audience.* A sponsor-bank annual review carries every tab. A sponsor-questionnaire response narrows to the tabs the questionnaire covers and points back to the full pack as the underlying evidence. A new-rail delta pack focuses on the affected rail and the affected program-agreement clauses; unchanged rows summarise to a status line.
