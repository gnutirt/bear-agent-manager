# Banking sector overlay — edd-escalation-pack

When the scope flags banking, load this overlay alongside `references/source-anchors.md`. It carries the bank-specific EDD frame the generic capability skill does not own. The two regulator-driven EDD frames in banking are private banking (`§1010.620`) and foreign correspondent banking (`§1010.610`); both interact with PEP and Section 311 / 312 considerations.

## Operative EDD rule set in banking

- **31 CFR §1010.620** [verify section] — Due diligence programs for private-banking accounts. Applies to a US bank or federally insured branch maintaining a private-banking account for a non-US person where the account meets the rule's threshold and characteristics. Source-of-funds inquiry; scrutiny of activity; senior-foreign-political-figure handling; reporting and recordkeeping.
- **31 CFR §1010.610** [verify section] — Due diligence programs for correspondent accounts for foreign financial institutions. EDD elements for foreign-FI correspondents: ownership; products and services offered to non-US persons; AML/CFT regime in the foreign FI's home country; public information on the foreign FI; nested-correspondent posture; payable-through-account considerations.
- **31 USC §5318(i)** [verify section] — Section 312 statutory underpinning for both `§1010.620` and `§1010.610`.
- **31 USC §5318A** [verify section] — Section 311 special measures. Where Treasury has designated a jurisdiction, an FI, or a class of transactions as of primary money-laundering concern, the special measures interact with the bank's EDD obligations and the products and services it can offer the customer. The pack reads the designation status against the customer's exposure where applicable.
- **FFIEC BSA/AML Examination Manual** sections on PEPs, Private Banking Due Diligence, and Correspondent Accounts (Foreign) [verify section anchors].

## Bank-specific EDD trigger profiles

- **Private-banking customers (non-US person at threshold).** `§1010.620` is the rule frame. The pack reads source-of-funds inquiry on each meaningful funding event, ongoing scrutiny on activity, the heightened scrutiny path on senior-foreign-political-figure relationships, and the program elements the bank applies. A US-person private-banking customer is outside the rule's scope, but the bank's program may apply parallel EDD on a risk basis; the pack reads against the program in that case and notes that `§1010.620` does not apply on the US-person leg.
- **Foreign correspondent accounts.** `§1010.610` is the rule frame. The pack walks the EDD elements: respondent ownership, products and services the respondent offers to non-US persons, AML/CFT regime in the respondent's home country (FATF mutual-evaluation public reports are the cleanest public source), publicly available information on the respondent (regulatory standing, enforcement history, ownership changes, sanctions exposure), and the nested-correspondent posture (whether the respondent provides correspondent services to other banks, and the resulting indirect exposure). Wolfsberg CBDDQ is the industry-standard questionnaire structure most respondents complete; the pack reads the respondent's CBDDQ as one input, not as standalone evidence.
- **PEP and PEP-adjacent profiles.** The 2020 joint statement clarifies that PEP status alone does not require EDD; the bank applies EDD on a risk basis. The pack records the PEP determination, the source of the finding (commercial PEP-screening tool, public source, customer disclosure, regulator notice), the date of the assessment, and the risk-based judgment that triggered EDD on this customer. Senior foreign political figures in private-banking accounts carry the heightened scrutiny path under `§1010.620` directly.
- **Cash-intensive businesses with elevated drivers.** Cash intensity alone is a CDD-rating driver; EDD escalation is warranted when cash intensity combines with other drivers (geography of concern, complex ownership, undisclosed beneficial control, structuring patterns in transaction history). The pack reads the combination, not the cash intensity alone.
- **Marijuana-related businesses (MRBs).** Where the bank serves MRBs, FinCEN MRB guidance (FIN-2014-G001) [verify date and current effectiveness] sets the program-level expectations. EDD on an MRB customer reads against the MRB-specific elements (state licensing, ongoing-monitoring scope, public-source posture) on top of the standard EDD frame.
- **MSB customers of a bank.** Banking an MSB carries customer-CDD obligations heavier than the segment label implies. EDD escalation on an MSB customer reads the MSB's own AML program (where the bank's program asks for it), the MSB's business model, the MSB's customer base by jurisdiction, and the consistency of the MSB's expected-activity profile with its actual transactional pattern.
- **Complex-structure entities.** Multi-tier ownership, foreign holding companies, trust intermediaries, family-office structures. The beneficial-ownership read on these customers is harder than the certification form alone supports; the pack walks the chain layer by layer with explicit residual uncertainty per layer.
- **Section 311 special-measures-adjacent customers.** Where a customer's transactional flow, counterparties, or jurisdictional exposure intersects with a Section 311 designation, the pack reads the designation's measures (special information requirements, prohibition on certain account types, reporting requirements) against the customer's product mix.

## Section 312 EDD elements for foreign correspondent accounts — the walk

The pack follows the rule's elements explicitly:

1. **Respondent ownership.** Names of the foreign FI's owners (where required to be obtained); ownership changes since the last refresh.
2. **Respondent's products and services to non-US persons.** What the respondent offers, particularly products that obscure identity (numbered accounts, certain pooled vehicles).
3. **AML/CFT regime in the respondent's home country.** The pack consults the FATF mutual-evaluation public report for the jurisdiction (when available) for an outside-in read on regime effectiveness; FATF grey/black-list status where applicable; the home-country regulator's public posture on the respondent (regulatory standing, supervisory action history).
4. **Public information on the respondent.** Enforcement history, news coverage on AML / sanctions / fraud / market-conduct exposure, ownership changes, recent supervisory action.
5. **Nested-correspondent posture.** Whether the respondent provides correspondent services to other banks and, if so, what disclosure the respondent has provided on its downstream correspondent customer base.
6. **Payable-through-account considerations.** Where the respondent's account permits its customers to engage in banking activities directly through the respondent's account, the heightened-scrutiny path applies.

## Cross-link inside the plugin

- **`cdd-risk-review`** is the upstream baseline; the EDD pack consumes the CDD QA's `edd_status = required_pending` or `borderline` cases.
- **`negative-news-triage`** triages adverse media on the customer; the EDD pack consumes triaged hits and does not re-triage.
- **`sanctions-screening-qa`** disposes screening matches on the customer and connected parties; the EDD pack consumes screening QA outputs.
- **`aml-model-monitoring`** owns scenario tuning; the EDD pack flags scenario-tuning implications for the post-EDD profile and cross-references.
- **`sar-decision-qa`** sits downstream where an alert closes against this customer.

## Common pitfalls in banking EDD packs

- Reading the foreign-correspondent rule (`§1010.610`) on a customer that is not a foreign FI; the rule has a defined scope.
- Reading `§1010.620` private-banking elements on a US-person private-banking customer where the rule does not apply (the bank's program may still impose parallel EDD; the pack notes the program basis, not the rule basis).
- Treating PEP status as automatically EDD-required; the 2020 joint statement frames PEP status as a risk indicator, not an automatic trigger.
- Stopping at the beneficial-ownership certification form on a complex-structure entity rather than walking the chain to the trusts, nominees, and foreign holding intermediaries.
- Treating the respondent's CBDDQ as standalone evidence in a foreign-correspondent EDD pack rather than as one input on top of the rule's elements.
- Missing the nested-correspondent disclosure on a foreign-correspondent relationship (the indirect exposure through the respondent's customer base by jurisdiction is a load-bearing finding).
- Asserting a Section 311 special-measures position on a customer without a current read of the designation's status and the measures it imposes.
