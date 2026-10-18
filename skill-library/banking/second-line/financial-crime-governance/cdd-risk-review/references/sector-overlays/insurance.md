# Insurance sector overlay — cdd-risk-review

When the scope flags insurance, load this overlay alongside `references/source-anchors.md`. It carries the insurance-specific CDD frame the generic capability skill does not own. The CDD review applies only to covered products under the operative rule; many insurance products are outside scope.

## Operative CIP / CDD rule set

- **31 CFR §1025.210** [verify section] — AML program rule for insurance companies. Defines the covered products and scopes the program obligation.
- **31 CFR §1025.220** [verify section] — CIP for insurance companies; applies to covered-product customers.
- **FinCEN CDD Final Rule (May 2016)** [verify section] — applies to insurance companies for covered products.
- **31 CFR §1010.230** — beneficial ownership for legal-entity covered-product customers.

## Covered-product scope — the QA's first read

Covered products are, generally: permanent life insurance with cash value (other than group), annuity contracts (other than group), and other insurance products with features of cash value or investment. P&C, term life without cash value, group life, group annuity, health, disability, title, and most reinsurance are outside the rule's scope. The QA scopes the product before applying any pillar. A CDD review on a P&C-only customer is out of scope; a CDD review on a customer with both covered and non-covered products is in scope only for the covered products.

## Insurance-specific risk drivers the QA reads

- **Single-premium and large-premium covered products.** Lump-sum funding of permanent life or annuity contracts at scale carries elevated ML risk; expected-activity profile (premium pattern, source of funds) should be specific.
- **Free-look-period surrenders and early surrenders.** Pattern of early surrender on covered products is a typology indicator the program monitors; the QA reads whether the customer's profile and the expected-activity-profile reflect surrender posture if relevant.
- **Third-party premium funding and assignment of benefit / contract.** Third-party-funded covered products and contract assignments to third parties carry ML risk; the QA reads whether the file documents the third-party relationship.
- **PEPs and senior foreign political figures.** Wealth-transfer covered products attract PEP exposure; the QA marks `edd_status` and cross-references `edd-escalation-pack`.
- **Cross-border policyholders and beneficiaries.** Geography of policyholder and beneficiary should be documented; high-risk jurisdiction exposure on either end is an EDD-trigger candidate.

## Distribution-channel nuances

- **Independent-agent / broker distribution.** The agent collects CIP and CDD information at point of sale; the insurance company is the institution of record. The QA reads whether the agent's collection has been reviewed by the insurer and whether the insurer's program evidences the oversight posture.
- **Direct-to-consumer and online distribution.** Verification corroboration weighs more heavily; the QA reads non-documentary verification specifically.
- **Group-structured contracts with covered features.** Some group products may have covered-product features for individual certificate holders; the QA scopes whether each certificate holder is in scope under the rule.

## Beneficial ownership in insurance contexts

Beneficial-ownership work applies to legal-entity covered-product customers under `§1010.230`. The customer is the policyholder, not the beneficiary; the beneficial-ownership read is on the legal-entity policyholder. Where the policyholder is an individual, the rule does not apply. Where the policyholder is a trust, the trust-customer scope is what it is in banking — trusts are not "legal entity customers" under `§1010.230`, and trust-specific due diligence sits in the institution's program.

## Cross-link inside the plugin

- **`edd-escalation-pack`** for PEPs, large-premium covered products, complex-structure policyholder entities, third-party-funded contracts.
- **`sar-decision-qa`** for downstream alert-decision QA on insurance typologies (early-surrender patterns, third-party assignments, premium-funding anomalies).
- **`negative-news-triage`** for adverse-media-triggered refresh on high-value covered-product customers.
- **`sanctions-screening-qa`** for sanctions-hit-triggered refresh on policyholders or beneficiaries.

## Common pitfalls in insurance CDD reviews

- Applying the rule to non-covered products (P&C, term life without cash value, group products, health). The QA scopes the product first.
- Treating the agent's CIP collection as the insurer's record without evidence the insurer reviewed and accepted it.
- Missing the third-party-funding or assignment-of-contract documentation where the customer is funded or controlled by a third party.
- Generic expected-activity / expected-premium profiles that cannot drive monitoring on the early-surrender or third-party-funding typologies.
- Reading beneficial-ownership on individual or trust policyholders where the rule does not apply.
