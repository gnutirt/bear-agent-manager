# Capital-markets sector overlay — cdd-risk-review

When the scope flags capital markets (broker-dealer, mutual fund, FCM/IB, covered investment adviser), load this overlay alongside `references/source-anchors.md`. It carries the capital-markets-specific CDD frame the generic capability skill does not own.

## Operative CIP / CDD rule set

- **31 CFR §1023.220** [verify section] — broker-dealer CIP.
- **31 CFR §1024.220** [verify section] — mutual-fund CIP.
- **31 CFR §1026.220** [verify section] — FCM and IB CIP.
- **FinCEN CDD Final Rule (May 2016)** [verify section] — applies to broker-dealers, mutual funds, and FCMs/IBs across the four pillars.
- **31 CFR §1010.230** — beneficial ownership for legal-entity customers across the same institution set.
- **FinCEN AML / CFT Programs and SAR Rule for Registered Investment Advisers and Exempt Reporting Advisers (Final Rule, August 2024)**. **IA AML Rule effective date delayed to January 1, 2028 (FinCEN final rule January 2, 2026; 91 FR 14) — superseding the original January 1, 2026 effective date.** Until the effective date, the rule's obligations are not enforceable against RIAs / ERAs. Brings covered investment advisers within the BSA regime when operative; CDD and beneficial-ownership obligations extend to covered advisers under the rule's scope and timing.

## Capital-markets-specific risk drivers the QA reads

- **High-net-worth individuals with international exposure.** Source-of-wealth statements should be corroborated by independent file evidence (public-record search, prior-firm reference where appropriate, asset documentation), not stand alone as customer self-attestation. Stale source-of-wealth statements at periodic refresh are a common gap.
- **Foreign omnibus accounts and intermediated holdings.** Where the customer is a foreign financial intermediary holding for underlying clients, the CDD work extends to the intermediary's CDD-equivalent posture; the QA reads whether the file evidences the intermediary's own program and the look-through posture for high-risk underlying clients.
- **Pooled investment vehicles and private funds.** Some pooled-investment-vehicle customers are exempt from the beneficial-ownership rule under `§1010.230`'s exemption list; the QA scopes the exemption before applying or skipping the pillar. Where the fund is not exempt, the beneficial-ownership read applies.
- **PEPs and senior foreign political figures.** Private-wealth and prime-brokerage customer populations carry elevated PEP exposure. The QA marks `edd_status` and cross-references `edd-escalation-pack`.
- **Correspondent broker-dealer accounts.** Broker-dealers maintaining accounts for foreign broker-dealers operate under the foreign-correspondent EDD frame; read against `§1010.610` where the rule applies.
- **Day-trading and high-velocity retail customers.** Expected-activity profiles should reflect the velocity and the strategy; a generic "active trading" profile is not specific enough to drive monitoring on layering, manipulation-adjacent, or wash-trade typologies.
- **Insider-account proximity.** Customers with reporting-officer or large-shareholder status at issuers carry insider-trading-monitoring obligations adjacent to CDD; the QA notes the cross-reference but does not handle insider-trading surveillance here.

## Investment-adviser scope discipline

Until the FinCEN adviser AML rule's compliance date is operative for the customer's adviser, advisers do not have a stand-alone CDD obligation under the rule. Where the adviser's customers are also clients of an affiliated broker-dealer or fund, the affiliated entity's CDD program may carry the obligation. The QA dates the read and scopes the rule's effective state on that date.

## Beneficial ownership in capital-markets contexts

Beneficial-ownership work on broker-dealer, mutual-fund, and FCM/IB legal-entity customers follows `§1010.230` directly. The exemption list matters: publicly traded companies, certain regulated entities, certain pooled investment vehicles, and others are out of scope under the rule. The QA reads the exemption claim against the rule, not as a default. Custody, omnibus, and intermediated accounts have their own exemption posture; read carefully.

## CIP nuances in capital markets

- **Account openings via introducing broker.** Where the introducing broker collects CIP information and the carrying broker maintains the record, the program contract allocation matters. The QA reads whether both ends of the arrangement have done the allocated work.
- **Mutual-fund accounts opened through an intermediary.** The intermediary may be the customer for CIP purposes (an omnibus account), or each underlying customer may be the customer (a direct account). The QA scopes which.
- **Cross-border customer onboarding.** Verification corroboration for non-US-resident customers is harder; the QA reads whether the file evidences the corroboration work.

## Refresh cadence in capital markets

The CDD Final Rule does not set a uniform refresh cadence. Capital-markets programs commonly refresh on event and on a longer time-based cycle for risk-tiered customers; the QA reads against the firm's program. Source-of-wealth refresh is the most common gap on high-net-worth periodic reviews.

## Cross-link inside the plugin

- **`edd-escalation-pack`** for PEPs, private-banking-equivalent customers, foreign-correspondent BD relationships, complex-structure entities.
- **`sar-decision-qa`** for downstream alert-decision QA on capital-markets typologies (layering, structuring, wash-trade-adjacent, insider-trading-adjacent where AML overlaps).
- **`negative-news-triage`** for adverse-media-triggered refresh on high-net-worth customers.
- **`sanctions-screening-qa`** for sanctions-hit-triggered refresh.
- **`aml-model-monitoring`** for monitoring scenario tuning where expected-activity-versus-scope mismatch surfaces.

## Common pitfalls in capital-markets CDD reviews

- Treating customer self-attestation on source of wealth as evidence; corroboration belongs in the file.
- Stale source-of-wealth statements at periodic refresh on long-tenured high-net-worth customers.
- Reading the foreign-correspondent rule on customers that are not foreign broker-dealers or foreign FIs.
- Missing the look-through posture on foreign omnibus accounts where the program calls for it.
- Asserting beneficial-ownership exemption under `§1010.230` without scoping the exemption against the rule's list.
- Generic expected-activity profiles for high-velocity or strategy-specific customers that cannot drive monitoring on the relevant typologies.
- Asserting investment-adviser CDD obligations before the FinCEN adviser rule's compliance date is operative for that adviser.
