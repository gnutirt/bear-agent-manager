# Capital markets sector overlay — aml-model-monitoring

When the scope flags capital markets, load this overlay alongside `references/source-anchors.md`. AML transaction-monitoring at broker-dealers, investment advisers, and registered funds reads differently from a deposit-bank context.

## Operative-program read

- **Broker-dealer.** AML program under FINRA Rule 3310 implementing 31 USC 5318(h); CIP under `31 CFR §1023.220`; SAR filing under `31 CFR §1023.320`. [verify section labels.]
- **Investment adviser.** AML program rule under `31 CFR Chapter X` for investment advisers — effective dates and scope are evolving; date the read and verify the operative compliance date. [verify the exact compliance dates and scope coverage.]
- **Registered fund (mutual fund).** AML program under `31 CFR §1024.210`; CIP under `§1024.220`; SAR under `§1024.320`. [verify section labels.]
- **FCM / IB.** Parallel CFTC-regulated AML program. [verify section labels.]

## Capital-markets-typical typologies the monitoring scope addresses

The typology surface differs from a deposit bank's. The QA reads whether the scenario inventory addresses:

- **Microcap manipulation patterns** at broker-dealers serving microcap and shell-company customers — pump-and-dump schemes, shell-company concentrations, free-stock distribution patterns. Public enforcement themes have repeatedly addressed broker-dealer monitoring of microcap and shell-company activity.
- **Penny-stock concentration** indicators (concentrated positions in low-priced stocks at customers without an investment-advisory relationship that justifies the position).
- **Wash-trading and matched-trade patterns** where the firm's surveillance does not already cover.
- **Anonymous-source funding patterns** (third-party-account funding, intermediated funding, layered-account funding).
- **Account-roll patterns** (repeated account-opening, funding, trading, withdrawal cycles across related accounts).
- **Pre-IPO and private-placement related-customer concentration patterns.**
- **Large-cash-equivalent inflows** (cashier's checks, money orders, wire blocks from third-party originators, virtual-currency conversions).

The line between AML monitoring and trade surveillance is artificial in capital markets; the QA reads the AML system's coverage of patterns that border on market-manipulation typologies and notes where hand-off to surveillance is documented.

## Investment-adviser nuance

Investment advisers historically operated outside the AML program rule; the FinCEN final rule extends scope. The QA reads:

- Whether the adviser's monitoring system is in place at the operative compliance date.
- Whether the scope covers the adviser's customer base appropriately (separately-managed accounts, private funds, sub-advisory relationships).
- Whether reliance on a custodian or broker-dealer's monitoring is documented under the rule's reliance provisions and whether the adviser's residual monitoring scope is defined.

## Registered fund nuance

Mutual funds typically rely on the transfer agent for transaction-level monitoring. The QA reads:

- Whether the fund's AML program documents the reliance on the transfer agent and the residual fund-board oversight.
- Whether the transfer agent's monitoring system meets the fund's program expectations.
- Whether large-redemption, short-hold-period, and unusual-pattern scenarios are covered for the fund's investor base.
- Whether broker-omnibus account monitoring is in scope (or relied on the broker), and how the reliance is documented.

## Segmentation in a capital-markets context

Customer segmentation at a broker-dealer or adviser typically covers:

- Customer type (retail individual, retail joint, retirement, trust, entity, foreign individual, foreign entity, institutional, hedge fund, family office).
- Account type (cash, margin, advisory, custodial, IRA, 401(k), trust, omnibus).
- Funding source (linked-bank ACH, wire, journal from related account, certificate, cashier's check, third-party).
- Trading profile (buy-and-hold, active equities, options, fixed-income concentrate, microcap-active, ETF-only, structured product).

A capital-markets segmentation that does not isolate the microcap-active profile is missing the most-cited enforcement-theme axis.

## Productivity and SAR conversion in a capital-markets context

Capital-markets SAR rates are typically lower per customer than at a deposit bank but the SARs filed often address larger-dollar or higher-typology cases. The QA reads denominators and trends, not absolute rates, and is alert to:

- Auto-closure rules in a capital-markets monitoring system (less common than in payments) — read for documented validation.
- Per-scenario productivity trend, especially for microcap and structuring scenarios.
- Cross-reference between AML SAR filings and trade-surveillance referrals — the same pattern hitting both is a healthy signal; one without the other can indicate scope mismatch.

## Capital-markets-specific findings the QA is alert to

- Microcap or shell-company-customer concentration without scenario coverage.
- Investment-adviser AML program scope unclear or operative compliance date treated as undefined.
- Mutual-fund reliance on transfer-agent monitoring documented but not exercised (fund-board review of TA monitoring posture absent).
- Broker-dealer monitoring scope on omnibus customer accounts unaddressed.
- Cross-product monitoring (cash + securities + lending) at full-service broker-dealers absent — the scenarios run product-by-product and miss cross-product layering.
- Trade-surveillance / AML-monitoring boundary undocumented; cases drop between the two.
