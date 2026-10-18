---
name: edd-escalation-pack
description: |
  Drafts an enhanced due diligence escalation pack for a higher-risk customer profile (PEP, private banking, foreign correspondent, cash-intensive business, complex ownership, MSB-affiliated, sanctions-adjacent, high-risk jurisdiction nexus, or event-driven trigger). The pack assembles beneficial-ownership chain, derogatory information, source of wealth and source of funds, customer rationale, expected versus actual activity, sanctions-screening posture, conduct-risk indicators, ongoing-monitoring plan, and decision options for the EDD committee. Produces a review artifact only; the EDD committee or designated approver makes the relationship decision.

  Best for:
  - A baseline CDD review has flagged EDD escalation and the next artifact is the pack the EDD committee will review.
  - Periodic refresh on an existing high-risk customer where ownership, activity, derogatory information, or jurisdictional posture may have shifted.
  - Event-driven refresh triggered by adverse media, sanctions exposure, ownership change, or a regulatory inquiry.
  - The pack-of-record basis for a relationship-exit deliberation.

  Not the right tool when:
  - Baseline CDD has not run; use `cdd-risk-review` first.
  - The work is alert disposition or SAR decision QA; use `sar-decision-qa`.
  - The work is a single adverse-media hit triage with no broader EDD context; use `negative-news-triage`.
  - The work is sanctions-match disposition; use `sanctions-screening-qa`.
  - The decision being asked for is the final retention, restriction, or exit decision. The skill produces review artifacts; the EDD committee or designated approver decides.
argument-hint: "[customer record + EDD trigger; upstream cdd-risk-review record where present; consumed negative-news-triage and sanctions-screening-qa records where present]"
---

# EDD escalation pack

An EDD escalation pack is what second-line produces so the EDD committee, the BSA officer, the sanctions officer, the head of private banking or correspondent or wealth, and (where the relationship is moving toward exit) the relationship-exit committee can see whether a higher-risk customer relationship holds up against the rule frame and the firm's risk appetite. The pack walks the customer's beneficial-ownership chain, the derogatory information consumed from upstream triage, the PEP and sanctions-adjacency and high-risk-jurisdiction posture, the source of wealth and source of funds, the customer rationale and the expected-versus-actual activity, the sanctions-screening posture, the conduct-risk indicators where the relationship makes them material, the ongoing-monitoring plan, and the open issues and committee questions. It closes with decision options the gate evaluates, stop conditions, and a sign-off block. The pack stops at the recommendation. The committee or the designated approver decides on retention, conditions, restriction, or exit.

The pack is a Word memo for human review and consumes upstream and adjacent records (`cdd-risk-review`, `negative-news-triage`, `sanctions-screening-qa`, sometimes `aml-model-monitoring`); it does not re-do their work.

## Ask first

Before drafting, get plain answers to a few things. Most escalations answer them quickly; if not, default and flag.

- **What surfaced the EDD trigger.** A CDD QA finding flagged escalation; a periodic high-risk refresh fell due; an event hit (adverse media, sanctions exposure, ownership change, regulatory inquiry); a relationship-exit deliberation needs the pack as its basis. The trigger drives the pack's load on each section.
- **Which rule frame applies.** Foreign correspondent EDD under `§1010.610` and Section 312; private-banking EDD under `§1010.620` and Section 312; PEP risk-based EDD; cash-intensive business EDD on the firm's program; complex-structure entity EDD; MSB-affiliated customer EDD on the bank's program; covered-insurance high-premium EDD on the insurer's program. Load the matching `references/sector-overlays/<sector>.md`. The 2020 joint statement frames PEP status as a risk indicator, not an automatic EDD trigger.
- **Who reads the pack.** The EDD committee reads for the decision; the relationship owner reads for the conditions and the asks; the BSA officer reads for the program-level pattern across packs. Audience drives depth and the lead.
- **What upstream and adjacent records are on file.** The pack consumes the CDD review record where present, the `negative-news-triage` triaged hits where present, and the `sanctions-screening-qa` dispositions where present. Where any is missing, draft against what is on file and flag the absence as a finding; do not block.
- **What the source posture supports.** A public-only posture limits the pack to public-source corroboration on SoW / SoF and on the ownership chain; a posture with firm-system-of-record evidence carries more. Set the posture to what the engagement has, not to what it would prefer.

When the scope record is supplied, the skill consumes it for institution type, primary regulator, sector overlay, persona, source posture, and cross-cutting overlays. Otherwise it asks the practitioner the few facts it needs.

## How the pack gets built

The pack has the same spine across triggers. A senior reviewer fills it in roughly in the order the file presents the customer and the trigger surfaces the work, not in lockstep. Three parts of the order are load-bearing and explicitly sequenced:

1. **Confirm the operative rule frame and the sector overlay before drafting.** A `§1010.610` foreign-correspondent walk on a customer that is not a foreign FI is a rule-scope error. A `§1010.620` private-banking walk on a US-person private-banking customer mis-applies the rule (the bank's program may apply parallel EDD on a risk basis; the pack notes the program basis, not the rule basis). PEP-status-alone-triggers-EDD over-reads the framing. Load the overlay first.
2. **Consume upstream and adjacent records before drafting the pack body.** `cdd-risk-review` is upstream; `negative-news-triage` and `sanctions-screening-qa` are adjacent. The pack reads their outputs as input and cross-references; it does not re-litigate triage or re-dispose hits or re-tune scenarios. Where a record is missing, the pack flags the missing record and proceeds with what is on file.
3. **Walk the beneficial-ownership chain layer by layer for high-risk profiles before deciding the SoW / SoF read carries.** The certification form alone is the form, not the verification. For complex-structure entities (multi-tier ownership, foreign holding companies, trust intermediaries, family-office structures), the chain runs past the certification, and SoW corroboration depends on knowing whose wealth funds the relationship. Walk the chain first; then the SoW work has somewhere to attach.

Beyond those three anchors the work is judgement-led. The senior reviewer walks the pack in this shape.

The **background and EDD trigger** captures the customer record, the institution, the operative rule frame from the sector overlay, the trigger, the pack type (initial escalation, periodic refresh, event-driven refresh, exit-deliberation basis), the date of last EDD refresh and what has changed since, and the customer summary and product footprint. The cross-jurisdictional footprint sits here because it scopes the high-risk-jurisdiction read in section 4.

The **beneficial ownership and control chain** walks the chain layer by layer. Layer one is the certification form on the legal-entity customer under `31 CFR §1010.230`: control prong (one individual with significant managerial responsibility) and ownership prong (each individual at the 25 percent threshold or the certification that none meet the threshold). Layer two and beyond are the holding entities, trust intermediaries, nominees, and foreign holding companies the certification points at or implies. Each layer carries an evidence pointer and an explicit residual uncertainty. The inconsistency check runs against the latest entity filings, the signatory list, public filings, and any transactional pattern implying undisclosed control. Where BOI reporting under `31 CFR §1010.380` applies, the pack marks `boi_filing_status` with an as-of date and the rule-state read on that date — the Corporate Transparency Act's implementing rule has live litigation history and the entity-class scope has shifted, so assertion without grounding is itself a finding.

The **derogatory information and adverse media** section consumes `negative-news-triage` outputs where present. Each consumed hit carries the source, date, materiality, linkage confidence, and the disposition pointer back to the triage record. Pattern observation across hits (theme, geography, time-clustering) sits here. Open hits awaiting triage are listed with the cross-reference. The pack does not re-triage; it consumes.

The **PEP, sanctions-adjacency, and high-risk-jurisdiction posture** records the PEP determination (status, source of finding, date assessed) and the specific role and jurisdiction underpinning it. The 2020 joint statement framing applies: PEP status is a risk indicator, not an automatic EDD trigger; the pack records the determination and builds the EDD case on the risk-based combination. Sanctions-adjacency reads connected parties, transactional counterparties, and jurisdictional exposure. The high-risk-jurisdiction nexus reads nationality, residence, principal place of business, and transactional corridors; the FATF mutual-evaluation public report (where in scope) is the cleanest outside-in read on each named jurisdiction's regime.

The **source of wealth and source of funds** is the load-bearing section on PEP, private-banking, and high-net-worth EDD packs. Customer narrative is the statement; corroboration is what other file evidence provides. The pack keeps them on different lines. SoW carries the customer statement (paraphrased; do not quote unless verbatim is in the file), the corroboration evidence, the independent-corroboration confidence, and the residual gaps. SoF carries the funding instrument, the originating account and counterparty, the corroboration evidence, and the residual gaps. Customer self-attestation is the customer's claim; a prior-firm reference is one input on top of independent public-source or transactional documentation. Stale SoW left in place at refresh on a long-tenured high-net-worth customer is itself a finding.

The **customer rationale and expected vs. actual activity** captures the customer's reason for the relationship and product mix at this institution, the documented expected-activity profile (qualitative and quantified), the actual activity over the lookback, and the deviation findings tied to the firm's monitoring scenarios. Where the deviation implicates scenario tuning, the pack cross-references `aml-model-monitoring`; it does not re-tune.

The **sanctions screening posture** consumes `sanctions-screening-qa` outputs. Current screening status, historical hits with disposition pointers, watchlist coverage and scope, and connected-party screening posture (beneficial owners, signatories, key counterparties named) sit here. The pack does not re-dispose hits.

The **conduct-risk indicators** load when the scope flags conduct, or when a PEP, wealth, private-banking, or correspondent profile makes conduct exposure material (foreign-procurement exposure on a PEP family member; complaint patterns on a wealth relationship; vulnerable-customer overlap; sales-practice exposure). The conduct overlay carries the indicators and the anchors. The conduct lens does not turn the pack into a conduct review; conduct findings sit alongside the financial-crime findings and bear on the EDD committee's decision.

The **ongoing monitoring plan** lists the scenarios in scope at the post-EDD profile, the threshold-calibration implications against the (post-EDD) expected-activity profile, the recommended refresh-cycle interval (event-driven and time-based), and the off-cycle refresh triggers. Threshold tuning belongs to `aml-model-monitoring`; the pack flags the implication and cross-references.

The **open issues, evidence-needed items, and committee questions** sit in a tagged table (ownership, SoF / SoW, activity, conduct, sanctions). Items without evidence on file carry `[evidence needed]` explicitly; do not infer the missing fact.

The **recommended decision forum and decision options** name the EDD committee composition, the decision options the forum evaluates (retain with conditions, retain with enhanced monitoring, retain pending further evidence, restrict products or volumes, escalate to relationship-exit deliberation), the conditions under which retention is incompatible with the file evidence, and the conditions on retention if recommended. Cross-references to upstream and adjacent skills sit here. The pack does not retain, restrict, or exit.

The **sign-off and source trace** carries the sign-off block (drafter, reviewer, approver) and the source trace. Every material claim cites a source from file evidence, customer attestation (kept distinct), public source, sector overlay, source-anchors file, or firm overlay where present, with a confidence label. `[verify section]` markers live only inside `references/source-anchors.md`; the pack body does not carry them.

Depth flexes with trigger and customer profile. A correspondent-bank EDD pack reads differently from a private-banking PEP pack from a cash-intensive-business pack from a complex-ownership-structure pack. The spine is the same; the load on each section shifts. Audience flexes too: the EDD committee reads for the decision; the relationship owner reads for the conditions; the BSA officer reads for the program-level pattern. Lead with what the audience must decide.

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors (FFIEC PEP / private-banking / correspondent / CDD sections; CDD Final Rule; `§1010.230`; `§1010.620`; `§1010.610`; 31 USC §5318(i) and §5318A; `§1010.380` BOI rule; FinCEN PEP advisory and the 2020 joint statement; OCC/FRB/FDIC/NCUA risk-focused supervision joint statement; Wolfsberg PEP / SoW / CBDDQ as public industry standard).
- `references/sector-overlays/banking.md`, `payments-fintech.md`, `capital-markets.md`, `insurance.md` — sector overlays loaded per scope.
- `references/cross-cutting/conduct.md` — conduct overlay loaded per scope or per customer-profile materiality.
- `references/firm-overlay.md` — firm policy, EDD trigger set, named systems and owners, decision-machinery composition (consumed when present).
- `templates/default-output.md` — pack template (named sections, fields).
- `examples/private-banking-pep-family-foreign-procurement.md`, `foreign-correspondent-respondent-bank-higher-risk-jurisdiction.md` — public-source-derived scenarios.
- `TROUBLESHOOTING.md` — recurring defects in EDD packs.

The plugin-level shared references (`references/source-map.md`, `references/policy-control-library.md`, `references/review-gates.md`) sit at the plugin root and are consulted alongside the skill-level files.

## Output

The deliverable is a Word memo. Render it via the `docx` skill (in the `document-skills` plugin) using the named sections from `templates/default-output.md`. The pack has a structured spine (background and trigger; beneficial ownership; derogatory information; PEP / sanctions / jurisdiction; SoW / SoF; rationale and activity; sanctions screening; conduct; monitoring plan; open issues; gates and decision options; sign-off and source trace) and is built for human review by the EDD committee or designated approver.

Downstream consumers: a relationship-exit deliberation memo (where the firm has one) consumes the pack as its basis; `aml-model-monitoring` consumes any tuning implication flagged here; `sar-decision-qa` reads the EDD posture as context where a downstream alert closes against the same customer; the firm's program-level BSA reporting reads patterns across packs over time.
