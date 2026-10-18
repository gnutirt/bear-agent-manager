---
name: negative-news-triage
description: |
  Triages an adverse-media or negative-news hit set against a specific customer or entity for identity confidence, source reliability, recency, materiality to financial-crime risk, and downstream routing. Produces a triage memo and a structured triage record that downstream artifacts (cdd-risk-review refresh, edd-escalation-pack, sar-decision-qa, sanctions-screening-qa) can consume. Does not change customer ratings, file SARs, exit relationships, or re-tune monitoring scenarios.

  Best for:
  - Adverse-media hit triage at onboarding, periodic refresh, or event-driven refresh on a named customer.
  - Bulk triage over a periodic adverse-media re-scan output where the volume is dominated by common-name false matches.
  - Pre-EDD triage feeding into an EDD escalation pack.
  - Pre-SAR-decision triage where adverse media is part of an alert's evidence basis.

  Not the right tool when:
  - The work is sanctions-screening match disposition rather than adverse media; use `sanctions-screening-qa`.
  - The hit is already triaged and the next artifact is the EDD pack or the SAR-decision QA; use `edd-escalation-pack` or `sar-decision-qa`.
  - The work is media-monitoring program design or vendor evaluation; use `vendor-diligence` (in `third-party-operational-resilience`) for the vendor work.
  - The decision being asked for is a final risk-rating change, an EDD escalation, an exit, or a SAR filing. The skill produces triage artifacts; humans decide.
argument-hint: "[hit set: vendor or open-source export; subject record (customer ID, beneficial-ownership chain, jurisdictions); triage scope (onboarding, periodic refresh, event-driven, bulk re-scan)]"
---

# Negative news triage

A negative-news triage memo is what second-line produces so a CDD reviewer, an EDD analyst, a SAR investigator, or a sanctions-QA reviewer can see which adverse-media hits on a customer are actually about that customer, which carry weight, which point to a financial-crime typology, and which route to which downstream artifact. The work is judgement-led: most bulk re-scan output is common-name noise; a small subset is material; a smaller subset changes downstream posture. The skill stops at the routing recommendation. The reviewer does not change the customer's risk rating, file a SAR, escalate to EDD as a closed decision, or exit the relationship.

The artifact is a Word memo and a structured triage record that the named downstream skills consume. Onboarding, periodic-refresh, event-driven, and bulk-rescan triage use the same workflow with different evidence-asks and different volume profiles.

## Ask first

Before drafting, get plain answers to a few things. Most triage runs answer them quickly; if not, default and flag.

- **What kind of triage is this and what is the volume.** Onboarding triage is one customer with a small named hit set; periodic refresh is one customer with the cycle-bounded re-scan output; event-driven is one or two hits surfaced by a named trigger; bulk re-scan is many customers with vendor output dominated by common-name matches. Volume drives whether the memo carries per-hit detail across the whole set or rolls up the noise and details only the material subset.
- **What identity evidence is on file for the subject.** Identity confidence is the first cut against false matches. The CDD record's name variants, date of birth or formation, jurisdiction, occupation or business activity, beneficial-ownership chain, and known counterparties are the matchable attributes. Without them, identity confidence stays low and the memo carries that as a finding rather than asserting confidence the file does not support.
- **Who reads the memo and what decision are they about to make.** A CDD reviewer reads to decide whether to refresh the file or the rating. An EDD analyst reads to decide whether to open or update an EDD pack. A SAR investigator reads as an evidence input on an in-flight or recent alert. A sanctions QA reviewer reads when the hit overlaps a screening alert. Audience and pending decision drive depth and tone.
- **What is the date of the underlying events versus the date of publication.** Adverse media is perishable on both axes: an old event re-published yesterday is still an old event, and a recent publication of a recent event sits differently in the materiality read than a vintage finding. The memo separates `event_date` from `publication_date` rather than collapsing them into one timestamp.

When the scope record is supplied, the skill consumes it for institution type, primary regulator, sector overlay, persona, and source posture. Otherwise it asks the practitioner the few facts it needs, and source posture sets what the memo can assert at high confidence and what carries `[evidence needed]`.

## How the triage memo gets built

The memo has the same spine across triage types. A senior reviewer fills it in roughly in the order the hit set offers it, not in a lockstep sequence. Two parts of the order are load-bearing and explicitly sequenced:

1. **Run identity confidence before anything else on each hit.** Source reliability and materiality are wasted work when the hit is not about this subject. Common-name false matches dominate bulk re-scan output; the identity cut is what makes the rest of the workflow worth doing.
2. **Aggregate themes after the per-hit pass, not before.** The patterns across a hit set (a recurring counterparty surfaced in three independent reports; an escalating timeline across vintage and recent hits; a jurisdictional clustering) are visible only once each hit has been individually scored. Theme-spotting before the per-hit pass produces narrative instead of finding.

Beyond those two anchors the work is judgement-led. The senior reviewer walks the file in this shape.

The **subject and triage scope** captures the customer or entity identifier, the triage scope (onboarding, periodic refresh, event-driven, bulk re-scan), the trigger if event-driven (a named alert, a regulator press release, a court filing, a counterparty event), the data the triage was run against (vendor name, open-source query terms, date range), and the date the triage was performed. Adverse-media findings are perishable; the memo carries the as-of date so downstream skills can assess currency.

The **hit set summary** captures total hit count, breakdown by source class (regulator and court versus major outlet versus secondary outlet versus unverified content), publication-date range, and whether the source is a vendor product or an open-source pull. A hit set that is dominated by tier-3 unverified content is itself a finding about the source posture, not just about the customer.

The **per-hit assessment** is the spine. Each hit carries its identifier and a brief headline summary; an identity-confidence label (high, medium, low, unverified) with a one-line rationale citing the matchable attributes; a source-reliability tier anchored to source class, not to vendor self-tagging; an `event_date` and a `publication_date` separated explicitly; a materiality read against a financial-crime typology, with a typology tag (or a "no clear typology" tag) drawn from the typology library that lives in `references/source-anchors.md` and where applicable from named public advisories on the typology; a linkage-strength label (direct involvement, association, mention only); and a disposition (relevant, not relevant, unverified pending). Identity confidence is rationale-bearing: a hit's subject name matching the customer name is not, on its own, an identity-confidence call.

The **source reliability tier** is anchored to source class. Tier 1 is regulator press releases, court filings, and major-outlet reporting with named bylines and editorial accountability. Tier 2 is secondary outlets, trade press, and aggregator content that surfaces a tier-1 source. Tier 3 is forum content, social-media posts, and unverified aggregator content that does not point back to a named primary source. Vendor self-tagging of reliability is read as a starting hypothesis, not as the tier itself; the QA reads back to the underlying source class and tiers from there.

The **materiality read against a financial-crime typology** is where the triage earns its keep. A hit that is genuinely about the subject and is tier-1 reliable but does not link to a financial-crime typology (a personal-life report, a non-financial civil matter, a non-fraud regulatory matter outside scope) is not material to the AML or sanctions program even if it is reputationally salient. The typology link is named (fraud, structuring, trade-based money laundering, human trafficking, elder financial exploitation, ransomware, sanctions evasion, public corruption, narcotics, market manipulation, others as listed), drawn from named public advisories where one applies, and tagged on the hit. "Negative news = bad" is not a triage; the typology link is what routes the hit downstream.

The **linkage strength** distinguishes direct involvement (the subject is named as defendant, respondent, indictee, or actor in the conduct), association (the subject is named alongside a directly involved party in a relationship that bears on the conduct), and mention only (the subject's name appears but the substance is about someone else). Linkage drives downstream routing as much as materiality does: a tier-1 hit with direct involvement on a fraud-ring typology routes differently from a tier-1 hit where the subject is named as a counterparty without alleged involvement.

The **aggregated themes** read across the hit set after the per-hit pass. Recurring counterparties across independent hits, escalating timelines (the same subject moving from civil to regulatory to criminal exposure across the date range), jurisdictional clustering (concentration in a single foreign jurisdiction or sanctions-relevant geography), or principal-versus-entity drift (the subject's principals appearing where the entity does not) are the patterns the per-hit pass cannot see. A hit set with no themes is a hit set with no themes; do not invent a pattern.

The **downstream routing** names which artifact the triage hands off to and why. Routing options are: no further action with the date the next re-scan is expected; route to `cdd-risk-review` for an event-driven refresh because the hit reaches a CDD-pillar question (expected-activity profile change, beneficial-ownership change implied by the hit, jurisdiction or counterparty pattern that re-rates); route to `edd-escalation-pack` because the hit raises EDD posture for the customer (PEP-adjacency surfaced, tier-1 direct involvement on a typology, escalating-timeline pattern); route to `sar-decision-qa` because the hit is evidence relevant to an in-flight or recent alert decision on the same customer; route to `sanctions-screening-qa` because the hit overlaps a sanctions-screening match (named OFAC-listed party, sanctions-evasion typology). A single hit set can route to more than one downstream artifact; the memo names each routing line with its rationale.

The **open questions and evidence-needed items** carry what the triage could not resolve from the file and the hit set: identity-confirmation gaps (a subject attribute that would resolve a medium-confidence hit to high or to false), corroboration gaps (a tier-3 hit that would change tier with primary-source corroboration), typology-attribution gaps (a hit whose typology is borderline pending an underlying-document read). Each item is `[evidence needed]` and is owned by the relationship owner, the EDD analyst, or the source-corroboration owner the engagement names.

The **source trace and confidence** records every material claim in the memo, its source (vendor export, open-source URL, file evidence on the subject, sector overlay, source-anchors file), the date as-of, and a confidence label. Vendor self-tagging carries lower confidence than the underlying-source read; do not collapse them.

The skill stops at the routing recommendation. The CDD reviewer, the EDD analyst, the BSA officer, or the SAR review committee owns the decision the routing points to. A recommendation that proposes the rating change, the EDD upgrade, the SAR filing, or the exit is itself a finding to remove. Cite a source for every material claim from the file or the hit set; mark unsupported items `[evidence needed]` rather than letting them pass; do not fabricate regulatory facts (unknown section references carry `[verify section]` in `references/source-anchors.md`, never in the memo body); do not name institutions in the narrative unless they are public defendants in a finalised enforcement action with a published consent order. Source evidence, customer-record assertion, vendor self-tagging, public-source reporting, and generated inference each carry their own line so the memo shows the seams.

Depth flexes with triage scope and audience. An onboarding triage on a single hit reads tight; a bulk re-scan with hundreds of hits rolls up the noise and details only the material subset and the aggregated themes. A pre-exam readiness pass reads long and formal. A SAR-investigation evidence input reads compact and pointed at the alert in front of the investigator.

## Sector and cross-cutting overlays

Sector overlays load from the scope or the institution type. **Banking** carries commercial-customer adverse-media patterns (regulatory enforcement against the customer, indictments of customer principals, civil fraud filings naming the entity), the cash-intensive-business linkage to fraud and structuring typologies, and the correspondent-banking adverse-media frame. **Payments-fintech** carries marketplace-seller fraud reporting, payment-processor enforcement coverage, BIN-sponsor exposure, and the velocity-versus-depth tradeoff fintech screening imposes on the typology read. **Capital markets** carries broker-dealer client adverse media (insider-trading allegations, market-manipulation enforcement, microcap-promoter reporting, expert-network exposure). **Insurance** has narrow scope: covered-products customer adverse media (fraud-ring patterns, premium-financing irregularities, structured-settlement adverse reporting). Load only the overlays the engagement implicates.

The **conduct cross-cutting overlay** loads when the scope `cross_cutting_overlay_set` includes `conduct`. Adverse media frequently surfaces customer-harm patterns (sales-practice exposure, disclosure-deficiency narratives, vulnerable-customer overlap with high-risk profiles, market-conduct exposure) that intersect with the financial-crime read but are not themselves financial-crime typologies. The overlay carries the discipline that names the conduct dimension as a parallel routing — to the consumer-compliance function, to the conduct-risk committee, or to the producer-oversight owner — without collapsing it into the AML triage. Load it explicitly when the engagement names conduct; do not pull it in by default.

Cyber overlap (account-takeover-adjacent adverse media, ransomware-exposure reporting on a customer counterparty) is captured in the typology references and the source anchors rather than as a separate cross-cutting overlay; the cyber framing on a sanctions-screening overlap routes to `sanctions-screening-qa` where the cyber overlay does live.

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors (FFIEC CDD section, FinCEN CDD Final Rule, joint statements, named FinCEN advisories on typologies, Wolfsberg adverse-media guidance as public industry reference).
- `references/sector-overlays/banking.md`, `payments-fintech.md`, `capital-markets.md`, `insurance.md` — sector-specific adverse-media frames loaded per scope.
- `references/cross-cutting/conduct.md` — conduct dimension on customer-harm-pattern adverse media; loaded when the engagement names conduct.
- `references/firm-overlay.md` — firm policy, vendor-tier mapping, typology library extensions, named systems and owners (consumed when present).
- `templates/default-output.md` — memo template (named sections, fields).
- `examples/principal-civil-fraud-commercial-bank.md`, `bulk-rescan-bank-portfolio.md` — public-source-derived scenarios.
- `TROUBLESHOOTING.md` — recurring defects in adverse-media triage memos.

The plugin-level shared references (`references/source-map.md`, `references/policy-control-library.md`, `references/review-gates.md`) sit at the plugin root and are consulted alongside the skill-level files.

## Output

The deliverable is a Word memo. Render it via the `docx` skill (in the `document-skills` plugin) using the named sections from `templates/default-output.md`. The structured triage record emits alongside the memo for downstream consumption; it is descriptive (no rigid enums forced across skills) and is the input contract for the downstream artifacts the routing names.

Downstream consumers: `cdd-risk-review` reads the triage record on event-driven CDD refresh; `edd-escalation-pack` reads it where the routing recommends an EDD pack; `sar-decision-qa` reads it as evidence input on alert decisions for the same customer; `sanctions-screening-qa` reads it where the hit overlaps a sanctions screening match. The CDD reviewer, the EDD analyst, the BSA officer, or the SAR review committee owns the decision the routing points to.
