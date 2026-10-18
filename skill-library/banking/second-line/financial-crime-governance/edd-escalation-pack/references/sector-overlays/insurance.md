# Insurance sector overlay — edd-escalation-pack

When the scope flags insurance, load this overlay alongside `references/source-anchors.md`. It carries the insurance-specific EDD frame the generic capability skill does not own. EDD escalations apply only to covered products under the operative rule; many insurance products are outside scope.

## Operative rule set in covered insurance

- **31 CFR §1025.210** [verify section] — AML program rule for insurance companies. Defines covered products and scopes the program obligation; EDD escalations sit on the program for covered-product customers.
- **31 CFR §1025.220** [verify section] — CIP for insurance companies; applies to covered-product customers.
- **FinCEN CDD Final Rule (May 2016)** [verify section] — applies to insurance companies for covered products; EDD on higher-risk covered-product customers is on a risk basis.
- **31 CFR §1010.230** — beneficial ownership for legal-entity covered-product customers.
- **FFIEC BSA/AML Examination Manual** [verify section] — examiner manual is bank-focused; insurers consult it for principles where they translate. The insurer's regulator (state insurance department, NAIC standards where applicable) supplements through public guidance.

## Covered-product scope — the EDD pack's first read

Covered products under `§1025.210` are, generally: permanent life insurance with cash value (other than group), annuity contracts (other than group), and other insurance products with features of cash value or investment. P&C, term life without cash value, group life, group annuity, health, disability, title, and most reinsurance are outside scope. The pack scopes the product before any EDD work; an EDD pack on a P&C-only customer is out of scope under the rule and should not be drafted under this skill.

## Insurance-specific EDD trigger profiles

- **Single-premium and large-premium covered-product customers.** Lump-sum funding of permanent life or annuity contracts at scale is the dominant EDD trigger in insurance. The pack reads the SoF on the premium funding (originating account, counterparty, jurisdiction of origin), the SoW underpinning the customer's capacity to fund at that level, and the customer rationale for the product structure (estate planning, wealth-transfer mechanism, other).
- **Free-look-period surrenders and early-surrender patterns.** Patterns of early surrender on covered products are a typology indicator; an EDD pack triggered by an early-surrender pattern reads the customer's intent at funding, the SoF on the original premium, and the destination of the surrender proceeds.
- **Third-party premium funding.** Premiums funded by a third party (not the policyholder) carry elevated ML risk. The EDD pack reads the third-party relationship: who funds, why, how the funding flows, and whether the third party's CIP / CDD on the carrier's books supports the funding pattern.
- **Assignment-of-benefit and assignment-of-contract patterns.** Where a covered-product contract or its benefits are assigned to a third party shortly after issuance, the pattern is a typology indicator; the EDD pack reads the assignment documentation, the assignee's relationship to the policyholder, and the underlying intent.
- **PEPs and senior foreign political figures.** Wealth-transfer covered products attract PEP exposure; same risk-based PEP framing as banking. The 2020 joint statement applies. Senior foreign political figures purchasing high-premium covered products carry the heightened scrutiny path.
- **Cross-border policyholders and beneficiaries.** Geography of policyholder and beneficiary should be documented; high-risk-jurisdiction exposure on either end is an EDD-trigger candidate. The pack reads the FATF posture (where in scope) of each named jurisdiction.
- **Complex-structure policyholder entities.** Where the policyholder is a legal entity with multi-tier ownership, foreign holding intermediaries, or trust intermediaries, the beneficial-ownership read on the policyholder is harder than the certification form alone supports. The pack walks the chain layer by layer.

## Distribution-channel nuances in EDD

- **Independent-agent / broker distribution.** The agent collects KYC at point of sale; the insurance company is the institution of record. EDD escalation on a customer brought in by an independent agent reads whether the agent's documentation has been reviewed and accepted by the insurer and whether the insurer's program evidences the oversight posture. EDD work itself sits on the insurer's program, not on the agent.
- **Direct-to-consumer and online distribution.** Verification corroboration weighs more heavily; the EDD pack reads non-documentary verification specifically.
- **Institutional channels and bank-distributed products.** Covered products distributed through a bank channel may be governed by either the bank's program or the insurer's program depending on the arrangement; the pack scopes the institution of record before drafting.

## Beneficial ownership in insurance EDD

Beneficial-ownership work applies to legal-entity covered-product policyholders under `§1010.230`. The customer is the policyholder, not the beneficiary; the beneficial-ownership read is on the legal-entity policyholder. Where the policyholder is an individual, the rule does not apply (but the EDD pack still reads PEP, jurisdictional exposure, SoF / SoW, and product-rationale on the individual). Where the policyholder is a trust, trust-customer scope is what it is in banking — trusts are not legal-entity customers under `§1010.230`, and trust-specific due diligence sits in the institution's program, which the EDD pack reads against.

## SoF and SoW corroboration in covered insurance

For a high-premium EDD pack, the SoF / SoW work is the load-bearing element:

- **Source of funds.** The premium-funding instrument (wire, check, securities transfer); the originating account; the originating account holder's relationship to the policyholder (self-funded, family-funded, third-party-funded). Third-party funding carries the elevated risk and a separate documentation requirement.
- **Source of wealth.** The customer's capacity to fund at the premium level; corroboration as in capital-markets work (business sale, inherited wealth, long-term earnings, investment returns, trust distributions). Customer self-attestation is the customer's claim; corroboration is what other file evidence provides.

## Cross-link inside the plugin

- **`cdd-risk-review`** is the upstream baseline; the insurer's CDD on covered-product customers feeds the EDD pack.
- **`negative-news-triage`** for adverse-media triage on high-value covered-product customers.
- **`sanctions-screening-qa`** for sanctions-screening QA on policyholders and beneficiaries.
- **`aml-model-monitoring`** for monitoring scenario tuning where post-EDD profile changes implicate scenario calibration (early-surrender, third-party-funding, premium-anomaly typologies).
- **`sar-decision-qa`** sits downstream where an alert closes against the policyholder or a related party.

## Common pitfalls in insurance EDD packs

- Drafting an EDD pack on a non-covered product (P&C, term life without cash value, group products, health). The pack scopes the product first.
- Treating the agent's KYC documentation as the insurer's record without evidence the insurer reviewed and accepted it.
- Missing third-party-funding or assignment-of-contract documentation where the customer is funded or controlled by a third party.
- Accepting customer self-attestation on SoW as corroboration; corroboration belongs in the file.
- Reading beneficial-ownership on individual or trust policyholders where the rule does not apply.
- Asserting jurisdictional EDD without reading the FATF posture of the jurisdiction (where in scope).
- Treating PEP status as automatically EDD-required (the 2020 joint statement frames it as risk-based; covered insurance applies the same risk-based framing).
