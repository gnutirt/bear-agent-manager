# CDD review memo

**File ID**: [customer record ID; placeholder for sample]
**Customer (role)**: [customer type only; no named natural persons or institutions in narrative]
**Institution type**: [bank | broker-dealer | mutual fund | covered-product life insurer | FCM/IB | MSB | fintech (sponsor-bank) | covered investment adviser | other]
**Operative CIP/CDD rule**: [e.g., 31 CFR §1020.220 + CDD Final Rule + 31 CFR §1010.230]
**Engagement ID**: [pointer to scope record, or "none — scope not formalised"]
**As of**: [date]
**Review type**: [new_account | periodic_refresh | event_driven_refresh]
**Trigger** (event-driven only): [e.g., negative news; sanctions hit; transaction-monitoring alert; beneficial-ownership change; public change in customer circumstances]
**Owner (role)**: [e.g., second-line CDD QA reviewer]
**Approver (role)**: [BSA officer | AML QA team lead | customer-onboarding compliance lead]
**Confidence label**: [high | medium | low | unknown]

## Customer profile summary

- Customer type: [individual | legal entity | trust | correspondent | other].
- Products held or requested.
- Jurisdictions: residence, registered address, principal place of business, citizenship, key counterparty geographies.
- Profile data as-of: [date].

## CIP coverage (Pillar 1)

- Identifying information collected: [legal name, date of birth or formation, address, identification number] — status against operative CIP rule.
- Verification method: [documentary | non-documentary | both] — status against institution's CIP program.
- Discrepancies and resolution.
- Retention status: [meets `§1020.220(a)(3)` (or parallel) | gap].
- `cip_status`: [sufficient | partial | missing].

## Beneficial ownership (Pillar 2)

> Legal-entity customers only under `31 CFR §1010.230`. For trusts, sole proprietors, unincorporated associations, or exempt entities, scope the rule before populating this section.

- Control prong: [identified individual; role; date].
- Ownership prong: [each individual at 25% or more, or certification that none meet the threshold].
- Certification form: [on file (date) | missing | refresh overdue per firm program].
- Inconsistency check: [latest entity filings; signatory list; public filings; transactional patterns implying undisclosed control] — findings if any.
- BOI filing status under `31 CFR §1010.380`: [required | not_required | unknown | [verify]] — as-of date and rule-state read on that date.
- `beneficial_ownership_status`: [sufficient | partial | missing | not-applicable].

## Nature and purpose / expected activity (Pillar 3)

- Documented expected activity (qualitative).
- Specificity label: [generic | specific | quantified].
- For business customers: expected cash, ACH, wire frequency and counterparties; expected geographies; expected funding sources.
- For individuals: expected source of funds; source of wealth where rating warrants.
- Monitoring-scenario tunability: [does the expected-activity profile carry enough specificity to evaluate alerts against it?].
- `expected_activity_status`: [sufficient | partial | missing].

## Customer risk rating and drivers

- Current rating: [e.g., low | medium | high].
- Rating drivers (as recorded): [list].
- Driver-evidence linkage: [each driver tied to file evidence | label-only].
- Reasonableness on file evidence: [reasonable | misaligned | borderline].
- `rating_reasonableness`: [reasonable | misaligned | borderline | unknown].

> The QA does not change the rating. A material misalignment is a finding routed to the named decisionmaker.

## Ongoing monitoring (Pillar 4)

- Monitoring scenarios in scope at this rating.
- Threshold calibration vs expected-activity profile.
- Refresh-cycle interval: [event-driven | time-based at the rating's cycle] — meets firm program?
- Off-cycle refresh triggers in scope.
- `monitoring_scope_status`: [sufficient | partial | missing].

> Monitoring scenario tuning is not in scope here; cross-reference `aml-model-monitoring` for any tuning finding.

## EDD escalation posture

- EDD trigger set considered: [PEP / PEP-adjacent; cash-intensive; MSB customer; complex-structure entity; jurisdictions of concern; correspondent (`§1010.610`); private-banking (`§1010.620`); other firm trigger].
- `edd_status`: [not_required | borderline | required_pending | in_place].
- Cross-reference: [link to `edd-escalation-pack` record where escalation is recommended].

## Material gaps and evidence-needed items

| Gap | Pillar / criterion | Evidence needed | Severity |
|---|---|---|---|
| | | | material / moderate / minor / observation |

## Reviewer findings

| ID | Criterion | Finding | Severity | Evidence pointer |
|---|---|---|---|---|
| 1 | [FFIEC CDD section / 31 CFR rule / firm program] | | material / moderate / minor / observation | |

## Recommended human-review gates and owner actions

- **Recommended routing**: [accept_as_is | return_to_first_line_for_evidence | escalate_to_edd | refresh_rating | recalibrate_refresh_cycle | schedule_monitoring_threshold_review | other].
- **Conditions** (if return-for-evidence): [bulleted, specific, verifiable].
- **Owner action**: [named role; what they do next].
- **Review gates this memo must clear**: [scope, evidence, authority, impact, decision].
- **Cross-references**: [`edd-escalation-pack` record ID; `aml-model-monitoring` ticket; `sar-decision-qa` linkage where applicable].
- The memo does not approve the account, set or change the rating, file a SAR, or exit the relationship. The named decisionmaker decides.

## Source trace

| Claim | Source | Section | Date | URL or file ref | Confidence |
|---|---|---|---|---|---|
| | | | | | high / medium / low / unknown |

Cite `references/source-anchors.md` for canonical citations. Use `[verify section]` if the section reference is unknown; do not invent.

---

*Memo depth scales to review type and customer risk.* A new-account QA on a low-risk consumer customer reads tighter than a periodic refresh on a high-net-worth customer with international exposure. An event-driven refresh on negative news reads differently again. A pre-exam readiness pass reads long and formal.

*Audience shapes the memo.* A BSA officer reads for material defensibility issues and program-level patterns. An AML QA team lead reads for criterion-by-criterion calibration. A customer-onboarding compliance lead reads for backlog-and-quality signal across the new-account pipeline. Lead with what the audience must decide.
