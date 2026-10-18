# Capital-markets sector overlay — edd-escalation-pack

When the scope flags capital markets (broker-dealer, mutual fund, FCM/IB, covered investment adviser), load this overlay alongside `references/source-anchors.md`. It carries the capital-markets-specific EDD frame the generic capability skill does not own. Private-banking and prime-brokerage customer populations carry the heaviest EDD load in this sector; investment-adviser EDD obligations are evolving with the FinCEN adviser AML rule.

## Operative EDD rule set in capital markets

- **31 CFR §1010.610** [verify section] — Foreign-correspondent EDD applies where a broker-dealer maintains accounts for foreign broker-dealers or other foreign FIs that meet the rule's definition.
- **31 CFR §1010.620** [verify section] — Private-banking EDD applies where the broker-dealer maintains a private-banking-equivalent account for a non-US person at the rule's threshold; many wealth-management arms read against `§1010.620` directly.
- **FinCEN CDD Final Rule (May 2016)** [verify section] — applies to broker-dealers, mutual funds, and FCMs/IBs across the four pillars; EDD on higher-risk customers is on a risk basis.
- **31 CFR §1010.230** — beneficial ownership for legal-entity customers; the EDD pack walks the chain layer by layer.
- **FinCEN Anti-Money Laundering / Countering the Financing of Terrorism Programs and Suspicious Activity Reports for Registered Investment Advisers and Exempt Reporting Advisers** (Final Rule, August 2024). **IA AML Rule effective date delayed to January 1, 2028 (FinCEN final rule January 2, 2026; 91 FR 14) — superseding the original January 1, 2026 effective date.** Until the effective date, the rule's obligations are not enforceable against RIAs / ERAs. Brings covered investment advisers within the BSA regime when operative; EDD obligations extend to covered advisers under the rule's scope and timing.
- **FFIEC BSA/AML Examination Manual** sections on PEPs, Private Banking Due Diligence, and Customer Due Diligence [verify section anchors] — examiner-facing detail; relevant to broker-dealer practice through industry application even where the manual's primary audience is banks.

## Capital-markets-specific EDD trigger profiles

- **High-net-worth individuals with international exposure (private wealth, prime brokerage).** Source-of-wealth and source-of-funds work is the core EDD load. Customer self-attestation on SoW is the customer's claim; corroboration is what other file evidence provides (public-record search, prior-firm reference where appropriate, asset documentation, business-sale documentation, family-trust deeds, employment / role history). Stale SoW statements at periodic refresh are the dominant defect; the EDD pack refreshes the SoW with corroboration on a high-net-worth EDD escalation.
- **Foreign omnibus accounts and intermediated holdings.** Where the customer is a foreign financial intermediary holding for underlying clients, the EDD work extends to the intermediary's CDD-equivalent posture and the look-through posture for high-risk underlying clients (where the intermediary's program supports look-through).
- **Pooled investment vehicles and private funds (non-exempt).** Where the fund is not exempt under `§1010.230` and is also a higher-risk customer (offshore feeder, complex-structure parent, jurisdictional concentration), the EDD pack walks the beneficial-ownership chain through the fund structure to the control parties.
- **PEPs and senior foreign political figures in private wealth.** Same risk-based PEP framing as banking; the 2020 joint statement applies. Senior foreign political figures in private-banking-equivalent accounts carry the heightened scrutiny path under `§1010.620` directly.
- **Foreign correspondent broker-dealer accounts.** Broker-dealers maintaining accounts for foreign broker-dealers operate under the foreign-correspondent EDD frame; read against `§1010.610`. The EDD pack walks the rule's elements (respondent ownership, products and services, AML/CFT regime in the home country, public information, nested-correspondent posture).
- **Microcap and low-priced-securities concentration customers.** Customers with concentrated activity in low-priced or microcap securities, or with deposit-and-sale patterns characteristic of unregistered-distribution typologies, are EDD candidates. The pack reads the typology against the customer's profile and SoW.
- **Insider-account proximity.** Customers with reporting-officer or large-shareholder status at issuers carry insider-trading-monitoring obligations adjacent to EDD; the pack notes the cross-reference but does not handle insider-trading surveillance here.
- **Day-trading and high-velocity retail customers in EDD escalation.** Where EDD is triggered (PEP exposure, jurisdictional exposure, structuring patterns, complex-structure entity), the pack reads the trading strategy and the velocity against the customer's profile and SoW.

## Investment-adviser EDD discipline

Until the FinCEN adviser AML rule's compliance date is operative for the customer's adviser, advisers do not have a stand-alone CDD or EDD obligation under the rule. Where the adviser's customers are also clients of an affiliated broker-dealer or fund, the affiliated entity's program may carry the EDD obligation. The pack dates the read and scopes the rule's effective state on that date for the adviser in question; an EDD pack drafted in early 2026 reads differently from one drafted later as the rule's compliance dates flow through.

## Beneficial ownership in capital-markets EDD

Beneficial-ownership work on broker-dealer, mutual-fund, and FCM/IB legal-entity customers follows `§1010.230` directly. The exemption list matters: publicly traded companies, certain regulated entities, certain pooled investment vehicles, and others are out of scope. The EDD pack reads the exemption claim against the rule. For non-exempt complex-structure entities, the pack walks the chain layer by layer and surfaces residual uncertainty per layer.

## Source-of-wealth corroboration — the EDD walk

For a high-net-worth EDD pack, the SoW work is the load-bearing element:

1. **Customer statement.** Paraphrase from the customer-supplied statement; do not quote unless verbatim is in the file.
2. **Categorise the wealth source.** Inherited; business sale or stake; long-term professional earnings; investment returns; trust distributions; political role compensation (for a PEP or family member); other.
3. **Match corroboration to the category.** Inherited wealth: probate documentation, family-trust deeds, prior-firm reference. Business sale: transaction documentation, public-source confirmation of the transaction, attestation from advising counsel where in scope. Long-term professional earnings: employment history, public-source role confirmation. Investment returns: prior-firm statements, fund documentation. Trust distributions: trust deed and distribution history.
4. **Independent corroboration confidence.** High where multiple independent sources align; medium where one source is independent and the rest are customer-supplied; low where corroboration is thin.
5. **Residual gaps.** Mark explicitly; do not infer.

## Cross-link inside the plugin

- **`cdd-risk-review`** is the upstream baseline.
- **`negative-news-triage`** for adverse-media triage on high-net-worth customers (the dominant trigger for EDD refresh in private wealth).
- **`sanctions-screening-qa`** for sanctions-screening QA on customers and counterparties.
- **`aml-model-monitoring`** for monitoring scenario tuning where post-EDD profile changes implicate scenario calibration (layering, structuring, microcap-deposit-and-sale typologies).
- **`sar-decision-qa`** sits downstream where an alert closes against the customer.

## Common pitfalls in capital-markets EDD packs

- Treating customer self-attestation on source of wealth as evidence; corroboration belongs in the file.
- Stale SoW statements left in place at EDD refresh on long-tenured high-net-worth customers; refresh is the EDD pack's job at escalation.
- Reading the foreign-correspondent rule on customers that are not foreign broker-dealers or foreign FIs.
- Missing the look-through posture on foreign omnibus accounts where the program supports it.
- Asserting beneficial-ownership exemption under `§1010.230` without scoping the exemption against the rule's list.
- Treating an investment-adviser customer as in scope before the FinCEN adviser rule's compliance date is operative for that adviser.
- Treating PEP status as automatically EDD-required (the 2020 joint statement frames it as risk-based).
- Importing prior-firm-reference attestations as standalone corroboration on SoW (a prior-firm reference is one input on top of independent public-source or transactional documentation).
