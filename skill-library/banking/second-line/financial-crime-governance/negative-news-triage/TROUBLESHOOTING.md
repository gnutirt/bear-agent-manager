# Troubleshooting: negative-news-triage

Recurring defects in adverse-media triage memos and in the upstream hit sets, and how the skill handles them.

## Identity confidence asserted on name match alone

**Symptom**: per-hit `identity_confidence` set to `high` because the hit's subject name matches the customer name.

**Why it happens**: bulk re-scan output dominates the work, common-name false matches are the dominant noise category, and the path of least resistance is to disposition on name alone.

**Fix**: identity confidence is rationale-bearing. The per-hit `identity_rationale` field forces the matchable-attribute join (jurisdiction, formation date, beneficial ownership, occupation, employer, prior-address, counterparty pattern). A name match without a matchable-attribute join sits at `low` or `unverified`, not at `high`. The bulk-scan example shows the pattern: 28 of 42 hits drop on the identity cut alone; the triage that skips the identity rationale would have escalated 28 false-positive matters.

## Source reliability collapsed into vendor self-tagging

**Symptom**: `source_tier` set to whatever the vendor's reliability tag says, with no source-class read.

**Why it happens**: vendors ship reliability tags as part of the product; treating them as authoritative saves time.

**Fix**: vendor self-tagging is a starting hypothesis, not the tier. The triage reads back to the source class (regulator press release, court filing, major outlet with named bylines and editorial accountability versus secondary outlet, trade press, aggregator versus forum, social, unverified aggregator) and tiers from there. A vendor "high reliability" tag on an aggregator-only article is tier-2 or tier-3 in the source-class read, not tier-1.

## Recency reported as publication date, ignoring underlying event date

**Symptom**: a 2017 event re-published in 2026 reported as a 2026 finding; the materiality read inflates accordingly.

**Why it happens**: vendor exports and aggregator pipelines often surface only the publication date; the underlying event date requires reading the source.

**Fix**: separate `event_date` and `publication_date` fields are required. An old event re-published yesterday is still an old event. The recency dimension feeds the materiality read; conflation is a finding to remove.

## Materiality assessed against a generic "negative news = bad" frame

**Symptom**: hits flagged material because they are reputationally salient, with no financial-crime typology link.

**Why it happens**: the triage substitutes the reviewer's negative-press reaction for the typology-link discipline.

**Fix**: the per-hit `typology_tags` field forces a named typology link or a "no clear typology" tag. The typology library lives in `references/source-anchors.md` (FinCEN advisories, OFAC guidance, sector-overlay-specific patterns); reputationally salient hits with no typology link sit at `not_material` for the AML lane. When the conduct overlay is loaded, the conduct-dimension tag carries the parallel materiality for conduct-relevant hits even where the AML typology is absent.

## Aggregated themes skipped

**Symptom**: per-hit triage runs cleanly but the memo carries no aggregated-themes section.

**Why it happens**: the per-hit pass dominates the time budget; the cross-hit synthesis feels redundant.

**Fix**: aggregated themes is the spine the per-hit pass cannot see. Recurring counterparties across independent hits, escalating timelines, jurisdictional clustering, principal-versus-entity drift, and common-name false-match patterns are the patterns that route the triage downstream. A hit set with no themes carries that observation; do not invent a pattern, but do not skip the section either.

## Common-name false matches dispositioned individually

**Symptom**: 28 separate per-hit dispositions with the same false-match basis bloating the memo.

**Why it happens**: the per-hit template invites per-hit dispositions.

**Fix**: when the false-match basis is the same across many hits, name the pattern in `aggregated_themes` once and disposition the cluster as a group rather than per hit. The per-hit detail in the memo should read the material subset and the unverified-pending subset, not the whole common-name cluster.

## Routing recommends a closed decision

**Symptom**: the routing block says "rate up to high", "open EDD", "file SAR", "exit relationship".

**Why it happens**: the reviewer has formed a view and writes the view as the recommendation.

**Fix**: the triage routes the artifact to the named decisionmaker; the decisionmaker decides. The routing names the destination (CDD refresh, EDD pack, SAR-decision evidence input, sanctions-screening overlap, conduct-lane parallel routing) and the rationale; it does not propose the rating change, the EDD upgrade, the SAR filing, or the exit. A routing recommendation that proposes the closed decision is itself a finding to remove.

## Date-as-of missing on the triage memo

**Symptom**: downstream skills consume the triage record without knowing whether it is current.

**Why it happens**: the triage was performed against a hit set generated days or weeks earlier; the as-of date on the memo collapses to "today" or is omitted.

**Fix**: the memo carries both the **triage-performed date** and the **hit-set-as-of date**. Adverse-media findings are perishable on both axes; downstream skills need both dates to assess currency.

## Source posture on the bulk re-scan unobserved

**Symptom**: the memo flags individual hits but does not surface the bulk pattern (high tier-3 noise, vendor-tag anomalies, identity-evidence thinness).

**Why it happens**: per-hit work crowds out the program-level observation.

**Fix**: a hit set dominated by tier-3 noise is itself a finding about the source posture, not just about the customer. The memo's executive summary carries the source-posture finding when it applies, and the routing surfaces the program-level review (BSA program, source-corroboration owner) rather than letting the noise pollute per-customer escalation.

## Conduct overlap dropped because no AML typology

**Symptom**: a hit with strong customer-harm content but no AML typology tag dispositioned `not_material`.

**Why it happens**: the AML triage frame does not have a slot for conduct-only material.

**Fix**: when the engagement loads the conduct cross-cutting overlay, the per-hit `conduct_dimension_tag` exists for conduct-only hits. The conduct lane carries the parallel routing (consumer compliance, conduct-risk committee, producer oversight, fair-lending function, adviser supervision); the hit is not dispositioned `not_material` simply because the AML typology is absent.

## Cyber-typology overlap routed only to AML lane

**Symptom**: a CVC counterparty hit with sanctions-evasion or ransomware linkage routed only to `cdd-risk-review`, missing the sanctions-screening overlap.

**Why it happens**: the cyber typology surfaces in the materiality read but the routing default lands in the CDD lane.

**Fix**: where the typology surfaces sanctions-evasion or ransomware-payment-facilitation linkage, the load-bearing routing line is to `sanctions-screening-qa`. The CDD lane is secondary; do not invert the priority.

## Beneficial-ownership inconsistency implied by the hit but not surfaced

**Symptom**: a tier-1 hit implies an undisclosed control or counterparty relationship the customer's CDD file does not reflect, and the triage does not name the inconsistency.

**Why it happens**: the per-hit pass focuses on the hit itself, not on the file the hit bears against.

**Fix**: the open-questions block carries beneficial-ownership-inconsistency items as `[evidence needed]` for the relationship owner; the routing line to `cdd-risk-review` carries the rationale. The triage does not re-rate or re-certify beneficial ownership; it surfaces the inconsistency.

## Vulnerable-customer overlap underread

**Symptom**: an elder-financial-exploitation typology hit dispositioned without the conduct overlay and without the FinCEN advisory citation.

**Why it happens**: the typology library is treated as optional rather than as the named-advisory anchor.

**Fix**: the FinCEN Advisory on Elder Financial Exploitation provides the typology indicators and the named anchor; the conduct overlay carries the vulnerable-customer parallel routing. Both are loaded when the scope and the hit set warrant; neither is optional.
