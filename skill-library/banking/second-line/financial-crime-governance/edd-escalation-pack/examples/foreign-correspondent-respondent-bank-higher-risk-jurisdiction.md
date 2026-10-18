# Example: foreign correspondent account with a small respondent bank in a higher-risk jurisdiction

Public-source-derived. No named institution. The shape mirrors a standing pattern in regional-bank correspondent-banking businesses: a Section 312 EDD pack on a foreign correspondent account for a small respondent bank in a higher-risk jurisdiction (per FATF mutual-evaluation public reports for that jurisdiction), where nested-correspondent disclosure has historically been incomplete and the sanctions-exposure-through-respondent-customer-base read has not been quantified.

## Input

- **Institution**: a regional US bank with a correspondent-banking business; primary regulators include the OCC and FinCEN.
- **Customer**: a foreign respondent bank in a higher-risk jurisdiction. Account opened seven years ago.
- **Pack inputs (as presented for QA)**:
  - Respondent ownership: foreign holding company structure with two layers of ownership; ownership has changed once during the relationship (publicly reported).
  - Respondent's products and services to non-US persons: documented at original onboarding; a recent expansion into a payable-through-account-adjacent product line is on file but not refreshed in the EDD pack.
  - AML/CFT regime in respondent's home country: per FATF mutual-evaluation public report for that jurisdiction (recent report).
  - Respondent's regulatory standing: per home-country regulator's public registry; current; one historical supervisory action publicly reported, closed.
  - Respondent's CBDDQ on file (Wolfsberg format): completed at last refresh 24 months ago; one open question on nested-correspondent disclosure left blank in the prior CBDDQ.
  - Public information on the respondent: enforcement history, news coverage, ownership changes, sanctions exposure indicators — outside-in read available.
  - Nested-correspondent posture: respondent has acknowledged providing correspondent services to other banks; the disclosure on its downstream customer-base by jurisdiction is incomplete on the file.
  - Sanctions exposure through respondent's customer base by jurisdiction: not quantified on the file.
  - Volume and pattern of transactions through the respondent: documented; pattern shows concentration on cross-border wire activity into and out of the respondent's home jurisdiction and into two adjacent higher-risk jurisdictions.
  - Adverse media on the respondent: triaged hit from `negative-news-triage` on a media report concerning the respondent's customer base in a sanctions-adjacent jurisdiction; materiality "moderate", linkage confidence "medium".
  - Sanctions screening: clear at current scan on the respondent itself; multiple historical hits on connected counterparties resolved over the lookback.
- **Engagement scope supplied**: institution = regional US bank correspondent-banking business; primary regulators = OCC, FinCEN; persona = second-line EDD reviewer reporting to the BSA officer; source posture = public-plus-firm-policy-plus-system-of-record-evidence; sector overlay = banking; cross-cutting overlays = none (conduct not loaded — relationship is institution-to-institution; no retail-customer-conduct nexus).
- **Pack type**: periodic_refresh.
- **EDD trigger**: correspondent + high_risk_jurisdiction.

## Output sketch

The skill produces an EDD pack against the file. Headlines:

- **Background and EDD trigger** — periodic refresh on the Section 312 foreign-correspondent EDD frame; trigger combines correspondent and high-risk-jurisdiction. Cross-references upstream `cdd-risk-review` record and the `negative-news-triage` triaged hit on the respondent's customer base.
- **Beneficial ownership and control chain** (respondent ownership) — two-layer foreign holding structure walked; ownership change during the relationship is documented; current ownership corroborated against the home-country registry where the registry is publicly accessible.
- **Derogatory information and adverse media** — one moderate hit consumed from `negative-news-triage` on the respondent's customer base in a sanctions-adjacent jurisdiction; pattern observation: the hit is consistent with the public-source posture on that jurisdiction's correspondent-banking risk profile but does not implicate the respondent's program directly.
- **PEP, sanctions-adjacency, and high-risk-jurisdiction posture** — PEP status: not applicable on the institutional customer; PEP framing applies to the respondent's named control parties (one named control party is reported in the home country's public political register; PEP-adjacent). Sanctions-adjacency: through respondent's customer base by jurisdiction (the load-bearing concern). High-risk-jurisdiction nexus: respondent is headquartered in a higher-risk jurisdiction per the FATF mutual-evaluation public report; transactional pattern concentrates flow into the home jurisdiction and two adjacent higher-risk jurisdictions.
- **Source of wealth and source of funds** — `§1010.620`-style SoW / SoF framing does not apply directly to a foreign-correspondent customer; the pack reads the funding pattern of the correspondent relationship instead (transactional flow, settlement pattern, fee arrangements).
- **Customer rationale and expected vs. actual activity** — relationship rationale documented at original onboarding (USD clearing for the respondent's customer base). Expected activity profile predates the recent payable-through-account-adjacent product expansion. Actual activity is consistent with the original profile on the legacy product set; the new product line introduces a deviation the file does not address. Cross-reference to `aml-model-monitoring` for the new-product monitoring scope.
- **Sanctions screening posture** — current clear on the respondent; multiple historical connected-party hits resolved with disposition rationale on file (cross-reference to `sanctions-screening-qa`). List coverage: OFAC SDN, OFAC sectoral, UN, internal lists; `sanctions-screening-qa` cyber overlay relevant for the virtual-asset-service-provider posture of any of the respondent's downstream customers.
- **Conduct-risk indicators** — conduct overlay not loaded; institution-to-institution correspondent relationship without a retail-customer-conduct nexus.
- **Ongoing monitoring plan** — recommended scenarios: cross-border wire pattern, jurisdictional concentration, payable-through-activity (newly relevant given the product expansion), nested-correspondent transactional indicators. Refresh-cycle interval recommended: 12 months given the elevated combined trigger, with event-driven trigger on any further adverse-media activity on the respondent or its customer base.
- **Open issues, evidence-needed items, and committee questions**:
  - Ownership: nothing open at this refresh; ownership chain corroborated.
  - Section 312 elements: nested-correspondent disclosure — `[evidence needed]`; specifically the respondent's downstream correspondent customer base by jurisdiction at named granularity.
  - Section 312 elements: sanctions exposure through respondent's customer base by jurisdiction — `[evidence needed]`; quantified read at named-jurisdiction granularity.
  - Activity: the new payable-through-account-adjacent product line — owner: relationship owner; the EDD evidence on the product expansion has not been gathered.
  - Conduct: not in scope here.
  - Sanctions: connected-party screening on the respondent's downstream customer base flagged via the new-product expansion — owner: sanctions officer.
- **Recommended human-review gates and decision options** — gate: EDD committee review, composition includes BSA officer, CCO, sanctions officer, head of correspondent banking, legal, relationship owner. Decision options: retain_with_conditions; retain_with_enhanced_monitoring; retain_pending_further_evidence (improved nested-correspondent disclosure within X cycles; transaction-volume cap pending the disclosure); restrict_products_or_volumes (cap on the new product line until the EDD evidence on the expansion is gathered); escalate_to_relationship_exit_deliberation. Stop conditions: nested-correspondent disclosure remains incomplete after the second cycle; sanctions exposure through downstream customer base surfaces at material levels; respondent's regulatory standing changes adversely. Cross-references to `cdd-risk-review`, `negative-news-triage`, `sanctions-screening-qa`, `aml-model-monitoring`. The pack does not retain, restrict, or exit; the committee decides.
- **Sign-off and source trace** — drafter: second-line EDD reviewer; reviewer: BSA officer; approver: EDD committee chair. Source trace anchors to `references/source-anchors.md` (FFIEC correspondent section, `§1010.610`, 31 USC §5318(i), Wolfsberg CBDDQ as public industry standard), `references/sector-overlays/banking.md` (Section 312 EDD-element walk).
- **Confidence label** — `medium`. The `§1010.610` element-by-element walk is at high confidence on the file evidence for ownership, regulatory standing, and home-country regime; at medium confidence on the products-and-services-to-non-US-persons element pending the new-product EDD evidence; at low confidence on the nested-correspondent disclosure and the sanctions-exposure-through-customer-base elements (these are the load-bearing gaps).

## Why this scenario matters

- **The Section 312 EDD elements are walked one by one.** A foreign-correspondent EDD pack that summarises the rule's elements without walking each one against the file has under-read the work. The pack's section on Section 312 elements forces the walk.
- **Nested-correspondent disclosure is the dominant defect on foreign-correspondent EDD packs.** The respondent's downstream customer base by jurisdiction is what carries the indirect exposure; an incomplete disclosure is a load-bearing finding.
- **Sanctions exposure through the respondent's customer base is not the same as sanctions screening of the respondent itself.** The pack reads both; clear screening of the respondent does not close the customer-base-exposure question.
- **CBDDQ is one input, not standalone evidence.** A completed CBDDQ with an open question on nested-correspondent disclosure left blank in the prior cycle is itself a finding.
- **Product expansion during the relationship reshapes the EDD profile.** The new payable-through-account-adjacent product line introduces a new EDD element and new monitoring scope; the pack reads the post-expansion profile, not the original profile.
- **The pack stops at the recommendation.** Retention with conditions, restriction on the new product line, escalation to exit deliberation are decision options the committee evaluates; the pack does not retain, restrict, or exit.

## Anchors

- FFIEC BSA/AML Examination Manual — Correspondent Accounts (Foreign), Customer Due Diligence sections [verify section anchors].
- 31 CFR §1010.610 — Section 312 EDD on foreign correspondent accounts [verify section].
- 31 USC §5318(i) — Section 312 statutory underpinning.
- Wolfsberg Correspondent Banking Due Diligence Questionnaire (CBDDQ) (most recent public version; public industry standard reference).
- FATF mutual-evaluation public report for the respondent's jurisdiction (consulted as outside-in read on regime effectiveness).

See `references/source-anchors.md` for full citations and `references/sector-overlays/banking.md` for the bank-specific Section 312 walk.
