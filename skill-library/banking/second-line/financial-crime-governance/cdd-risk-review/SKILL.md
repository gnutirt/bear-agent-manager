---
name: cdd-risk-review
description: |
  Quality-reviews a customer due diligence file (new account, periodic refresh, or event-driven refresh) against the four CDD pillars and named CDD examination expectations. Reads customer identification, beneficial ownership identification and verification, the nature-and-purpose / expected-activity profile, the customer risk rating and its drivers, and the ongoing-monitoring trigger set; produces a second-line review memo with material gaps, evidence-needed items, EDD-trigger posture, and recommended decision checkpoints with named owners. Does not approve onboarding, set or change the customer risk rating, file a SAR, or close or exit the relationship.

  Best for:
  - Second-line QA over a sample of new-account CDD files at a bank, broker-dealer, MSB, fintech (sponsor-bank or licensed), or covered-product life insurer.
  - Periodic CDD refresh review where risk-rating drivers, beneficial-ownership data, or expected activity may have shifted.
  - Event-driven refresh triggered by negative news, sanctions hit, transaction-monitoring alert, change in beneficial ownership, or a publicly known change in the customer's circumstances.
  - Pre-exam readiness review of CDD-file documentation against the FFIEC CDD section.

  Not the right tool when:
  - The customer profile already meets EDD criteria and the next artifact is the EDD pack itself; use `edd-escalation-pack`.
  - The work is sanctions screening match disposition rather than customer due diligence; use `sanctions-screening-qa`.
  - The work is alert-disposition or SAR-decision QA rather than the underlying CDD posture; use `sar-decision-qa`.
  - The decision being asked for is final onboarding approval, a rating change, or a relationship exit. The skill produces review artifacts; humans rate, file, exit.
argument-hint: "[CDD file: customer record, CIP evidence, beneficial-ownership certification, risk rating and drivers, expected-activity profile, monitoring trigger set, refresh history]"
---

# CDD risk review

A CDD review memo is what second-line produces so the BSA officer, the AML QA team, the customer-onboarding compliance lead, and (where applicable) the EDD committee can see whether a customer due diligence file holds up against the four CDD pillars and the FFIEC manual. The work is reading the file pillar by pillar, separating CIP completeness from CDD completeness, naming gaps in beneficial ownership, expected activity, risk-rating evidence, and ongoing-monitoring scope, and recommending where the file goes next: accept the CDD as is, return for evidence, escalate to EDD, or refresh the rating. The skill stops at the recommendation. The reviewer does not approve the account, set the rating, file a SAR, or exit the relationship.

This skill produces the memo as a markdown artifact (`templates/default-output.md` shape) and a structured record (`schemas/cdd-file.schema.json`) downstream skills and reporting can consume. New-account, periodic-refresh, and event-driven-refresh reviews use the same workflow with different evidence-asks.

## Ask first

Before drafting, get plain answers to a few things. Most reviews answer them quickly; if not, default and flag.

- **What is the institution and which CIP / CDD rule applies.** A bank is read against `31 CFR §1020.220` for CIP; a broker-dealer against `§1023.220`; a mutual fund against `§1024.220`; a covered-product life insurer against `§1025.220`; an FCM/IB against `§1026.220`; an MSB against the parallel rules. The CDD Final Rule applies across covered financial institutions; correspondent and private-banking enhanced due diligence sit at `§1010.610` and `§1010.620`. A fintech operating under a sponsor-bank model carries the sponsor's CIP/CDD obligations under the program contract; the QA reads the operative program. Load the matching `references/sector-overlays/<sector>.md`.
- **What kind of CDD review is this.** New-account, periodic refresh on the customer's risk-tier cycle, or event-driven refresh on a named trigger. The review type drives which evidence to weigh hardest. New-account work weighs CIP completeness, beneficial-ownership identification, and the initial expected-activity profile. Periodic refresh weighs whether risk-rating drivers and expected activity still match the customer's reality. Event-driven refresh weighs the trigger and what it changes about rating, EDD posture, or monitoring scope.
- **Who reads the memo.** A BSA officer reads for material defensibility issues and program-level patterns. An AML QA team reads for criterion-by-criterion calibration. The customer-onboarding compliance lead reads for backlog-and-quality signal across the new-account pipeline. The EDD committee reads only the cases the QA flags as escalation candidates. Audience drives tone and depth.
- **What is in the file.** The customer record, the CIP evidence (identifying information collected, verification method documentary or non-documentary, discrepancies), the beneficial-ownership certification (control prong and ownership prong), the documented expected-activity profile, the recorded risk rating with its drivers, the monitoring trigger set, and the refresh history. If the file is incomplete, that is itself a finding. Draft against what is there and flag the missing parts in `material_gaps`; do not block.

When the scope record is supplied, the skill consumes it for institution type, primary regulator, sector overlay, persona, and source posture. Otherwise it asks the practitioner the few facts it needs, and source posture sets what the memo can assert at high confidence and what carries `[evidence needed]`.

## How the review memo gets built

The memo has the same spine across review types. A senior reviewer fills it in roughly in the order the file presents the customer, not in a lockstep sequence. Two parts of the order are load-bearing and explicitly sequenced:

1. **Confirm the operative CIP / CDD rule and the sector overlay before reading the file.** A bank-flavoured read on a broker-dealer file is wrong; a covered-product read on a P&C policy is wrong; a CDD-Final-Rule beneficial-ownership read on a customer category exempt from the rule is wrong. Load the sector overlay first; do not retrofit the rule to the file.
2. **Read the file against the four CDD pillars, not three.** CIP is identification and verification at onboarding. CDD adds the beneficial-ownership pillar, the nature-and-purpose / expected-activity pillar, and the ongoing-monitoring pillar. A "file looks complete" finding that did not separately read all four pillars has under-read the work.

Beyond those two anchors the work is judgement-led. The senior reviewer walks the file in this shape.

The **file identifier and review scope** captures the customer record ID, the institution, the operative CIP and CDD rule from the sector overlay, the review type (new-account, periodic, event-driven), the trigger if event-driven, and the date the QA was performed.

The **customer profile summary** captures customer type (individual, legal entity, trust, correspondent, other), products held or requested, jurisdictions in play (residence, registered address, principal place of business, citizenship, key counterparty geographies), and the as-of-date for the profile data.

The **CIP coverage** read is read first because it is foundational. Identifying information collected (legal name, date of birth or formation, address, identification number) against the operative CIP rule. Verification method (documentary, non-documentary, both) against the institution's CIP program. Discrepancies between the customer-supplied data and verification sources, and how the institution resolved them. CIP retention is read against `§1020.220(a)(3)` (and parallels). A clean CIP does not mean clean CDD; the QA marks CIP-completeness separately so the next three pillars can be read on their own.

The **beneficial ownership** read is the second pillar. For legal-entity customers, the QA reads the certification form on file under `31 CFR §1010.230`: the control prong (one individual with significant managerial responsibility) and the ownership prong (each individual owning 25% or more, or the certification that no individual meets the ownership-prong threshold). Date of the certification, refresh posture (the rule does not require a uniform refresh cadence, so the QA reads against the institution's program), and any inconsistency between the certification and other file evidence (latest entity filings, signatory list, public filings, transactional patterns implying undisclosed control). Exempt-entity claims are read against the rule's exemption list, not assumed. **BOI reporting status** under `31 CFR §1010.380` is dated and grounded — the Corporate Transparency Act's implementing rule has live litigation history and the entity-class scope has shifted; the QA marks `boi_filing_status` as `required`, `not_required`, `unknown`, or carries the `[verify]` flag explicitly with the as-of date, never asserted on stale ground. Trusts, sole proprietors, and unincorporated associations are not "legal entity customers" under `§1010.230` even when they look like one; the QA scopes the rule before applying it.

The **nature and purpose / expected-activity profile** is the third pillar. The QA reads what the file says the customer does, what activity that produces, and how specific the expectation is. Generic boilerplate ("general business banking", "personal banking") is not specific enough to drive monitoring scenario tuning; that is a material gap, not a stylistic preference. For a small-business customer, expected cash and ACH volumes, expected wire frequency and counterparties, expected geographies, and expected funding sources should be specific or quantified at a level the firm's monitoring scenarios can use. For an individual, expected source of funds, source of wealth (where the rating warrants it), and the activity pattern the customer's profile would normally produce. The expected-activity profile does not have to be deeply quantified for low-risk customers, but it has to be specific enough that the monitoring scenarios fired by the customer can be evaluated against it.

The **customer risk rating and its drivers** is read for evidence underneath the labels. A rating of "medium" with drivers listed as "small business, cash deposits" is a label, not a rated decision; the QA reads whether the file evidences the cash intensity, the geography, the entity complexity, the product mix, the funding pattern, and the customer's stated rationale where the firm's risk model calls for them. The QA notes whether the rating is reasonable on the file evidence and whether the drivers are linked to evidence rather than asserted. The rating itself stays the firm's call; the QA does not change it. A material misalignment between rating and drivers is a finding the BSA officer and customer-onboarding compliance lead decide what to do with.

The **ongoing-monitoring trigger set** is the fourth pillar. The QA reads what monitoring scenarios are in scope for this customer at this rating, how thresholds are calibrated against the expected-activity profile, what refresh-cycle interval applies (event-driven vs time-based), and what events trigger off-cycle refresh (negative news, sanctions hit, transaction-monitoring alert, beneficial-ownership change, public change in customer circumstances). The QA does not re-tune the monitoring scenarios — that is `aml-model-monitoring`'s scope — but it surfaces a finding when the monitoring scope on file does not match the customer's risk profile or the expected-activity profile.

The **EDD escalation posture** is read against the firm's EDD trigger set and the operative regulatory anchors. Foreign correspondent accounts and private-banking accounts under `§1010.610` and `§1010.620` carry their own enhanced-due-diligence frame; PEP and PEP-adjacent customers carry program-level EDD obligations; high-risk customer categories (cash-intensive, MSB customers, complex-structure entities, jurisdictions of concern) carry the firm's defined EDD upgrade criteria. The QA marks EDD status as `not_required`, `borderline`, `required_pending`, or `in_place`, with rationale. A customer that meets EDD criteria but whose file does not carry an EDD pack is a finding routed through `edd-escalation-pack`; the CDD review names the gap and the cross-reference, it does not produce the EDD pack itself.

The **material gaps and evidence-needed items** list each gap with the pillar or criterion it bears on, the evidence that would resolve it, and a severity (material, moderate, minor, observation). Gaps stay `[evidence needed]` until resolved by the relationship owner or the BSA program.

The **reviewer findings** are tagged to a named criterion (FFIEC CDD section, the operative CIP/CDD rule, `§1010.230`, the institution's CDD program, the institution's risk-rating model), a severity, and an evidence pointer back into the file. The criterion is named, not implied.

The **recommended decision checkpoints and owner actions** name what the file goes to next: accept the CDD as is, return to first line for evidence on a named gap, escalate to EDD via `edd-escalation-pack`, refresh the customer risk rating per the firm's process, recalibrate refresh-cycle interval, or schedule a monitoring threshold tuning review at a named horizon. A recommendation to onboard, decline, exit, or change the customer's rating directly is not within scope; the QA frames the issue as a routing recommendation to the named decisionmaker (BSA officer, customer-onboarding compliance lead, EDD committee where applicable).

The **source trace and confidence** records every material claim in the memo, its source (file evidence, sector overlay, source-anchors file, firm overlay where present), and a confidence label. Customer self-attestation in the file (especially on a beneficial-ownership certification or expected-activity statement) carries lower confidence than corroborated evidence; do not collapse them.

Depth flexes with review type and audience. A new-account QA on a low-risk consumer customer reads tighter than a periodic refresh on a high-net-worth customer with international exposure; an event-driven refresh on negative news reads differently again. Pre-exam readiness reads long and formal; sample-based program QA reads tighter with patterns rolled up across files.

## Sector and cross-cutting overlays

Sector overlays are loaded from the scope or the institution type. **Banking** carries retail, commercial, private banking, and correspondent-banking nuance; the `§1010.610` correspondent and `§1010.620` private-banking EDD frames sit there alongside the deposit-operations CIP triggers and the cash-intensive-business risk drivers. **Payments-fintech** carries the sponsor-bank-program CDD reliance, MSB registration considerations, agent-of-payee posture, and the velocity-vs-depth tradeoff that fintech onboarding imposes on the CDD pillar reads. **Capital markets** carries broker-dealer CIP under `§1023.220`, mutual-fund CIP under `§1024.220`, and the FinCEN final AML rule for investment advisers (effective dates and scope are evolving — date the read). **Insurance** carries covered-product scope under `§1025.210` (permanent life with cash value, annuities with cash value, and other investment-type products); P&C, term life without cash value, group products, and health are generally outside scope for CDD review under this rule. Load only the overlays the engagement implicates.

No cross-cutting overlay is shipped for this skill. PEP, high-risk customer, and conduct intersections sit harder against `edd-escalation-pack` than against baseline CDD review; cyber and privacy intersections (NPI handling) sit at the program level rather than at the CDD-file artifact level. If a firm reads the cross-cutting lens at the CDD-file level, that is a `references/firm-overlay.md` decision.

## Quality bar

The memo is only credible when these hold:

- The skill produces review artifacts, not onboarding decisions, rating changes, SAR filings, or relationship exits. Any reviewer recommendation that proposes the rating change, the onboarding approval, the SAR filing, or the exit is itself a finding to remove.
- The four CDD pillars are read separately. CIP completeness alone is not CDD completeness. The QA names which pillar a finding bears on.
- Every material claim cites a source from the file, the sector overlay, or `references/source-anchors.md`. Unsupported items carry `[evidence needed]` and route to the engagement issue log.
- BOI reporting status under `31 CFR §1010.380` is dated and grounded. The Corporate Transparency Act's implementing rule has had live litigation; the QA never asserts `boi_filing_status` without an as-of date and the rule-state read on that date.
- Source evidence, customer self-attestation, public-source obligation, generated inference, and open legal or compliance question stay distinguishable in the memo. Customer self-attestation on the beneficial-ownership certification or the expected-activity statement is not the same line as corroborated evidence.
- No fabricated regulatory facts. Unknown section references carry `[verify section]` in the source-anchors file, never in the memo body.
- No named institutions in narrative unless they are public defendants in a finalised enforcement action with a published consent order.

## Adaptation

Sample size, lookback window, sector overlay, audience, depth, and the structure of rolled-up findings flex to the engagement. Where firm-specific policy (sample-selection method, customer-segmentation taxonomy, risk-rating model, refresh-cycle intervals, named systems and owners, EDD trigger set) applies, it lives in `references/firm-overlay.md` (consumed when present) and never in the memo directly.

## Output

Two artifacts: the CDD review memo per `templates/default-output.md`, and the structured record per `schemas/cdd-file.schema.json`. The BSA officer, the AML QA team lead, or the customer-onboarding compliance lead reviews the memo; the named decisionmaker decides on the routing.

Downstream consumers: a sample-level QA roll-up reads the structured record across files for pattern detection, recurring-finding rates, and training-feedback themes. `edd-escalation-pack` consumes the QA's `edd_status = required_pending` and `borderline` cases; `aml-model-monitoring` consumes any finding tagged to expected-activity-versus-monitoring-scope mismatch (which is its scope, not this skill's); `sar-decision-qa` reads the customer's CDD posture as context when a downstream alert closes against the same customer. The schema is the cross-skill contract; additive changes only, never silent renames. Breaking changes ship as a versioned migration with consumers told in advance.

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors (FFIEC CDD section, FinCEN CDD Final Rule, `§1010.230`, CIP rules, `§1010.380` BOI reporting rule, `§1010.610` / `§1010.620` correspondent and private-banking EDD, FinCEN investment-adviser rule, joint statements).
- `references/sector-overlays/banking.md`, `payments-fintech.md`, `capital-markets.md`, `insurance.md` — sector-specific CDD reads loaded per scope.
- `references/firm-overlay.md` — firm policy, customer-segmentation taxonomy, risk-rating model, refresh intervals, named systems and owners (consumed when present).
- `templates/default-output.md` — memo template.
- `schemas/cdd-file.schema.json` — structured-output contract.
- `examples/cash-intensive-llc-community-bank.md`, `periodic-refresh-broker-dealer-hni.md` — public-source-derived scenarios.
- `TROUBLESHOOTING.md` — recurring defects in CDD files and in QA memos written against them.

The plugin-level shared references (`references/source-map.md`, `references/policy-control-library.md`, `references/review-gates.md`) sit at the plugin root and are consulted alongside the skill-level files.
