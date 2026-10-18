# Negative news triage memo

**Subject ID**: [customer record ID; placeholder for sample]
**Subject (role)**: [customer type only; no named natural persons or institutions in narrative]
**Institution type**: [bank | broker-dealer | mutual fund | covered-product life insurer | FCM/IB | MSB | fintech (sponsor-bank) | covered investment adviser | other]
**Engagement ID**: [pointer to scope record, or "none — scope not formalised"]
**Triage scope**: [onboarding | periodic_refresh | event_driven | bulk_rescan]
**Trigger** (event-driven only): [named alert; regulator press release; court filing; counterparty event; other]
**Triage performed**: [date]
**Hit-set as of**: [date the hit set was generated]
**Owner (role)**: [e.g., second-line negative-news triage reviewer]
**Approver (role)**: [BSA officer | EDD analyst | SAR review committee | sanctions QA reviewer]
**Confidence label**: [high | medium | low | unknown]

## Executive summary

- [Material-subset count out of total hits; the headline materiality finding.]
- [Aggregated themes if any (recurring counterparty, escalating timeline, jurisdictional clustering, principal-versus-entity drift).]
- [Routing destinations called out (CDD refresh, EDD pack, SAR-decision evidence input, sanctions-screening overlap, conduct-lane parallel routing) with rationale in one line each.]
- [Source-posture finding if applicable (e.g., bulk re-scan dominated by tier-3 noise; vendor self-tagging unreliable; identity-evidence thin on file).]

## Hit set summary

| Field | Value |
|---|---|
| Total hits | |
| By source class | tier-1 (regulator/court/major outlet): __ ; tier-2 (secondary outlet, trade press): __ ; tier-3 (forum, social, unverified): __ |
| Publication-date range | [earliest] – [latest] |
| Underlying-event-date range | [earliest] – [latest] |
| Source basis | [vendor name (version, query) | open-source pull (terms) | both] |

## Per-hit assessment

For each hit:

| Field | Value |
|---|---|
| `hit_id` | |
| `headline_summary` | [one-line summary; do not restate sensitive content] |
| `identity_confidence` | [high | medium | low | unverified] |
| `identity_rationale` | [matchable attributes that support or qualify the call] |
| `source_class` | [regulator | court | major outlet | secondary outlet | trade press | forum/social | unverified aggregator] |
| `source_tier` | [tier_1 | tier_2 | tier_3] |
| `event_date` | [date of underlying event] |
| `publication_date` | [date of publication] |
| `materiality` | [material | borderline | not_material] |
| `typology_tags` | [array; e.g., fraud, structuring, TBML, sanctions evasion, ransomware, elder financial exploitation, no clear typology] |
| `conduct_dimension_tag` | [if conduct overlay loaded; e.g., UDAAP exposure, sales-practice exposure, market-conduct exposure, vulnerable-customer overlap, cultural-pattern indicator, none] |
| `linkage_strength` | [direct | association | mention_only] |
| `disposition` | [relevant | not_relevant | unverified_pending] |
| `evidence_pointer` | [URL or file path; vendor self-tagging is not the source] |

> Identity confidence is rationale-bearing. A hit's subject name matching the customer name is not, on its own, an identity-confidence call.

> Source-tier is anchored to source class. Vendor self-tagging is a starting hypothesis, not the tier.

> `event_date` and `publication_date` are separate fields. An old event re-published yesterday is still an old event.

## Aggregated themes

- [Recurring counterparties across hits.]
- [Escalating timeline (civil to regulatory to criminal across the date range).]
- [Jurisdictional clustering (concentration in a single foreign jurisdiction or sanctions-relevant geography).]
- [Principal-versus-entity drift (principals appearing where entity does not).]
- [Common-name false-match patterns (named once at the theme level rather than dispositioned per hit).]
- [Source-posture observations (high tier-3 share; vendor self-tagging anomalies).]

A hit set with no themes is a hit set with no themes; do not invent a pattern.

## Downstream routing

| Routing destination | Rationale | Cross-reference (record ID where available) |
|---|---|---|
| `cdd-risk-review` (event-driven refresh) | [hit reaches a CDD-pillar question: expected-activity, beneficial-ownership, jurisdiction or counterparty pattern] | |
| `edd-escalation-pack` | [PEP-adjacency surfaced; tier-1 direct involvement on a typology; escalating-timeline pattern; correspondent-bank or private-banking overlap] | |
| `sar-decision-qa` (evidence input) | [hit is evidence on an in-flight or recent alert decision on the same customer] | |
| `sanctions-screening-qa` (overlap) | [named OFAC-listed party; sanctions-evasion typology; ransomware-payment-facilitation typology] | |
| `conduct lane` (parallel routing; conduct overlay loaded) | [conduct-dimension tag set; named conduct-side decisionmaker] | |
| No further action | [date the next re-scan is expected] | |

A single triage can route to more than one destination. The triage does not change the customer's risk rating, file a SAR, escalate to EDD as a closed decision, or exit the relationship.

## Open questions and evidence-needed items

- [Identity-confirmation gap: a subject attribute that would resolve a medium-confidence hit to high or to false.]
- [Corroboration gap: a tier-3 hit that would change tier with primary-source corroboration.]
- [Typology-attribution gap: a hit whose typology is borderline pending an underlying-document read.]

Each item is `[evidence needed]` with an owner (relationship owner, EDD analyst, source-corroboration owner).

## Source trace

| Claim | Source | Date as-of | URL or file ref | Confidence |
|---|---|---|---|---|
| | | | | high / medium / low / unknown |

Cite `references/source-anchors.md` for canonical citations and named typology advisories. Use `[verify section]` if the section reference is unknown; do not invent.

---

*Memo depth scales to triage scope and audience.* An onboarding triage on a single hit reads tight. A bulk re-scan with hundreds of hits rolls up the noise and details only the material subset and the aggregated themes. A pre-exam readiness pass reads long and formal. A SAR-investigation evidence input reads compact and pointed at the alert in front of the investigator.

*Audience shapes the memo.* A CDD reviewer reads to decide on a refresh. An EDD analyst reads to decide on opening or updating an EDD pack. A SAR investigator reads as evidence on an alert. A sanctions QA reviewer reads when the hit overlaps a screening alert. Lead with what the audience must decide.
