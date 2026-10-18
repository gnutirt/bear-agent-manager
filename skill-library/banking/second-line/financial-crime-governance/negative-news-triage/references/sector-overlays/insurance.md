# Insurance sector overlay — negative-news-triage

When the scope flags insurance, load this overlay alongside `references/source-anchors.md`. Scope is narrow: the BSA AML rule for insurers covers a defined set of investment-type products; adverse-media triage on insurers tracks that scope.

## Scope reminder — covered products only

The FinCEN AML rule for insurance companies (31 CFR Part 1025) applies to insurers offering covered products: permanent life-insurance policies (other than group life-insurance policies), annuity contracts (other than group annuity contracts), and any other insurance product with cash value or investment features. Property and casualty (P&C), term life without cash value, group life and group annuity, and health insurance are generally outside the BSA AML rule's scope, though state-level insurance-fraud regimes and producer-conduct frames still apply.

Adverse-media triage on insurance customers is in scope when the customer holds (or is being onboarded for) a covered product. Adverse media on a P&C-only relationship is not generally a BSA AML triage; it may be a fraud-program triage or a conduct-overlay triage but does not feed `cdd-risk-review` or `sar-decision-qa` against the BSA frame.

## What insurance covered-product adverse-media looks like in practice

- **Insurance-fraud-ring patterns naming the policyholder or a beneficiary.** State-regulator press releases, state-insurance-department enforcement, federal-court filings, and regional press coverage of insurance-fraud rings (faked deaths, structured-settlement fraud, premium-financing schemes). Tier-1 source class for regulator and court material; tier-2 for trade press; tier-3 for unverified content.
- **Premium-financing irregularities.** Adverse media on premium-financing arrangements that intersect with the customer's covered-product holdings (stranger-originated life insurance / STOLI patterns, unauthorised collateral assignments, premium-financing-vehicle insolvencies that link back to the customer).
- **Structured-settlement secondary-market adverse media.** Where a structured-settlement annuity has been sold or factored, adverse media on the secondary-market transaction or counterparty bears on the BSA frame (the funding-source typology).
- **Producer-conduct findings** that surface the customer in a sales-practice or churning context. The conduct overlay carries the producer-side discipline; the AML triage reads the customer-side typology link if any (proceeds, structuring through cash-value loans, surrender patterns).

## Insurance-specific identity-confidence drivers

- **Individual policyholders** match on legal name, date of birth, address, and (where the insurer collects them) employer, occupation, and beneficiary information. The CIP rule for insurance (`§1025.220`) limits identifying-information collection to covered products; the matchable-attribute set is leaner than at a bank.
- **Legal-entity policyholders** (rare in covered-product context but present in business-owned life insurance, key-person and split-dollar arrangements) match on legal name, formation, registered address, and beneficial-ownership chain under `§1010.230`.
- **Beneficiaries** are not policyholders and are not customers under the BSA frame; an adverse-media hit naming a beneficiary may bear on the policy-funding-source or claim-typology read but does not flow through the customer-CDD lane the same way.
- **Structured-settlement annuitants** carry an identity-cut bound by the originating-court order and the funding-corporation's records; the matchable-attribute set is bounded.

## Typology-link patterns insurance covered-product adverse-media triage attends to

- **Premium-payment-source typologies.** Cash or non-traditional-funding-source premium payments; cite to the FFIEC manual's insurance-section indicators (where they exist) and to FinCEN advisories on insurance typologies in the typology tag.
- **Cash-value loan and surrender typologies.** Patterns of cash-value-loan-then-surrender, or rapid surrender after a cash-value buildup, that imply a layering or structuring read.
- **STOLI and stranger-originated life-insurance typologies.** Adverse media on STOLI rings or premium-financing-vehicle insolvencies that link to the customer's covered-product holdings.
- **Structured-settlement-factoring typologies.** Adverse media on factoring counterparties or secondary-market arrangements that link to a customer's annuity.
- **Insurance-fraud predicate offences** (faked deaths, faked disabilities, faked claims) that surface the customer or beneficiary; cite to the relevant state-insurance-department action or federal indictment in the source trace.

## Insurance routing patterns

- A tier-1 hit on a covered-product policyholder naming a financial-crime typology routes to `cdd-risk-review` for an event-driven refresh and to `edd-escalation-pack` if the customer carries a heightened-risk profile (PEP, foreign-correspondent, complex-structure entity).
- A premium-financing or STOLI-pattern hit routes to `cdd-risk-review` and may pull a `sar-decision-qa` routing line where an in-flight alert exists.
- A producer-conduct hit (sales-practice exposure, churning) without a financial-crime typology link routes through the conduct overlay (when loaded) to the consumer-compliance and producer-oversight functions, not through the AML triage lane.
- An adverse-media hit on a P&C-only customer surface area is generally out of scope for this triage; the scope and the institution's program may route it to a fraud-program lane separately.

## Common pitfalls in insurance adverse-media triage

- Reading P&C-only relationships against the covered-product BSA frame; the rule's scope is the gate.
- Treating beneficiary-only hits as customer-CDD-lane hits; the BSA customer is the policyholder.
- Letting producer-conduct adverse media collapse into the AML triage when the underlying conduct is conduct-relevant only.
- Under-reading premium-financing and STOLI patterns; the typology link is real and the FFIEC and state-regulator references are not optional.
- Letting state-insurance-department enforcement substitute for a typology tag when the underlying conduct is regulatory only without a proceeds or layering link.
- Recommending the rating change, the EDD upgrade, the SAR filing, the policy lapse, the surrender, or the exit; the triage routes the artifact to the named decisionmaker.
