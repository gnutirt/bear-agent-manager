# Capital markets sector overlay — negative-news-triage

When the scope flags capital markets, load this overlay alongside `references/source-anchors.md`. It carries the broker-dealer, mutual-fund, and investment-adviser-specific adverse-media frame the generic capability skill does not own.

## What capital-markets adverse-media looks like in practice

Capital-markets customer adverse media skews to securities-enforcement and securities-litigation surfaces. Tier-1 source classes (SEC press releases and litigation releases, FINRA disciplinary actions, CFTC press releases, federal court filings, state-securities-administrator actions) are densely populated and well-indexed; the identity-cut work is usually easier than in banking, but the typology-link work is harder because securities adverse media frequently does not map cleanly to BSA-AML typologies.

- **Insider-trading allegations and enforcement.** SEC enforcement actions, criminal indictments, and civil filings naming a customer or a customer's principals. Identity confidence usually high (filings name the actor with corroborable attributes); typology link to AML is borderline (insider trading is not itself a BSA predicate offense in every framing, but the proceeds-of-insider-trading typology is).
- **Market-manipulation enforcement.** Pump-and-dump, spoofing, layering (trading-tactic, distinct from BSA layering), wash-trading enforcement. SEC and CFTC actions, FINRA arbitration awards, federal-court filings. The typology link to AML rests on the proceeds-of-manipulation read.
- **Microcap-promoter and stock-promotion exposure.** Adverse media on a customer who is a microcap-promoter, an issuer's affiliate, or a deposit-of-low-priced-securities customer. The FINRA Reg-Notice frame on low-priced securities and the FFIEC manual's broker-dealer-specific risk drivers are the read.
- **Expert-network and investment-research exposure.** Adverse media on a customer who participates in expert-network relationships that surface in insider-trading enforcement contexts. Identity confidence often requires the customer-file employment-history-and-affiliation join.
- **Investment-adviser fiduciary-duty and disclosure-failure enforcement.** SEC EXAMS risk-alert priorities and SEC enforcement actions against advisers. Adverse media on adviser customers (where the broker-dealer custodian holds the adviser's omnibus or where the fund has the adviser as service provider) carries program-level read.

## Capital-markets-specific identity-confidence drivers

The CDD file's matchable attributes for capital-markets customers:

- **Broker-dealer customers (retail accounts)** match on legal name, date of birth, address, employment, occupation, professional licensing where collected, and known related-account holders.
- **Broker-dealer customers (institutional accounts)** match on legal name, formation, registered address, primary-place-of-business, beneficial-ownership chain, and service-provider relationships.
- **Mutual-fund and ETF customers (omnibus and intermediated)** are matched at the intermediary level; direct-shareholder identity-cut is bounded by the omnibus arrangement and the intermediary's CIP/CDD program.
- **Investment-adviser customers** match on adviser name, IARD/CRD number, registered address, key personnel, and affiliated entities. The IARD/CRD number is a high-confidence identity attribute that materially raises the identity cut.

## Typology-link patterns capital-markets adverse-media triage attends to

- **Proceeds of insider trading and market manipulation.** A securities-enforcement hit is read for the proceeds typology (the customer's funds in the account include or imply proceeds of the alleged conduct). Cite to FFIEC SAR-section indicators on securities typologies and to the operative SAR rule for the institution.
- **Microcap and low-priced-security typologies.** Pump-and-dump, market-making schemes, deposit-of-low-priced-securities patterns. The FFIEC broker-dealer overlay and FINRA notices are the read.
- **Cross-border securities and foreign-issuer exposure.** Adverse media on a foreign issuer the customer holds, or on a customer with cross-border securities counterparties, layered with sanctions-screening and OFAC reads.
- **Layering through securities products.** Multi-jurisdictional, multi-account patterns where securities products are used to layer proceeds. The typology link is to BSA-layering, distinct from trading-tactic layering.
- **Adviser-side conduct and fiduciary-duty failures.** A SEC enforcement hit on an adviser customer carries a conduct-overlap (misappropriation, churning, undisclosed conflicts) that is conduct-relevant; the AML typology link runs through proceeds-of-the-conduct.

## Capital-markets routing patterns

- A SEC or FINRA enforcement hit naming the customer routes to `cdd-risk-review` for an event-driven refresh and to `edd-escalation-pack` where the conduct implicates a heightened-risk-population read; in-flight or recent alerts on the same customer pull a routing line to `sar-decision-qa`.
- An indictment naming a customer's principals (insider-trading or market-manipulation) routes to `edd-escalation-pack` and to `sar-decision-qa`; the proceeds-typology read is what carries the SAR-decision evidence.
- A microcap-promoter or low-priced-security exposure routes to `cdd-risk-review` for the broker-dealer-overlay-specific reads and to `aml-model-monitoring` (cross-reference) where the customer's transaction-monitoring scenario set on file does not cover the low-priced-security typology.
- A foreign-issuer or cross-border counterparty hit with sanctions-evasion overlap routes to `sanctions-screening-qa`.

## Common pitfalls in capital-markets adverse-media triage

- Treating insider-trading enforcement as not-AML-relevant. The proceeds-typology read is the link; do not collapse "insider trading is not a SAR typology" into a no-typology disposition.
- Letting tier-1 source class on a securities-enforcement hit substitute for identity-confidence work; common-name false matches on individual-customer hits still occur.
- Reading mutual-fund and ETF intermediated holdings as direct-shareholder hits; the omnibus arrangement is what scopes the identity cut.
- Under-reading microcap-promoter exposure; the FINRA notices and FFIEC broker-dealer overlay are not optional.
- Letting the SEC enforcement frame substitute for a typology tag when the underlying conduct is conduct-relevant only (a fiduciary-duty failure with no proceeds-typology link is conduct-overlay material, not AML-typology material).
- Recommending the rating change, the EDD upgrade, the SAR filing, the deposit-of-low-priced-securities restriction, or the exit; the triage routes the artifact to the named decisionmaker.
