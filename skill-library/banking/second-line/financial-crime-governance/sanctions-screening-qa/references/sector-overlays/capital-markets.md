# Capital-markets sector overlay — sanctions-screening-qa

When the scope flags capital markets (broker-dealers, mutual funds, futures commission merchants, covered investment advisers), load this overlay alongside `references/source-anchors.md`.

## Operative anchors

- **31 CFR Chapter V** — operative OFAC programs scoped to the firm's customer, counterparty, and securities population.
- **OFAC Framework for Compliance Commitments** (May 2, 2019).
- **FFIEC manual is not the operative examiner anchor for BDs and funds** — SEC examination staff and FINRA examiners are. The QA reads the BD's written supervisory procedures (WSPs) under **FINRA Rule 3110 (supervision)** and the fund's compliance program under **Investment Company Act Rule 38a-1**. The OFAC posture sits inside those frames.
- **FINRA Rule 3310** — AML compliance program for BDs. The OFAC obligation runs alongside.
- **SEC Division of Examinations risk alerts on AML / sanctions programs at advisers and BDs** [verify specific risk alerts current on the date of analysis].

## Capital-markets-specific screening rails the QA examines

- **Customer screening** at onboarding, periodic refresh, and event-driven rescreen against the operative list set.
- **Counterparty screening** — for institutional accounts, the executing-broker / clearing-broker / custodian / issuer / underwriter populations.
- **Securities-related sanctions** — restricted-securities lists (NS-CMIC and successor authorities) require the program to screen the security itself, not only the customer. The QA reads whether the trading-system-side check is in place at order-entry, at allocation, and at settlement.
- **Microcap and offshore-issuer concentration** — pump-and-dump and shell-company-issuer patterns intersect sanctions screening when the issuer or beneficial owners touch designated parties.
- **Settlement-chain screening** — counterparty / agent / custodian screening at settlement, including DTC-mediated and cross-border settlement.
- **Mutual-fund screening** — transfer-agent-level screening of shareholders; allocation-time screening on omnibus accounts.
- **FCM screening** — futures-account screening; introducing-broker chain screening.

## Restricted-securities-list handling

The Non-SDN Communist Chinese Military Companies (NS-CMIC) list and successor restricted-securities lists carry **transaction-level prohibitions on the security itself**, not on the customer. A screening program that reads only customer name against the list misses the transaction-prohibition limb.

- The QA reads whether the order-management system or the trading platform applies a security-level block on restricted securities.
- The QA reads the program's posture on divestment-window restrictions (the wind-down period for existing positions in newly-restricted securities) and the evidence trail.
- Custody-side handling of restricted positions is a separate read where the firm has custody capability.

## Investment-adviser scope

Until FinCEN's covered-investment-adviser AML rulemaking is fully operative for sanctions-program purposes, advisers' OFAC obligations apply through **OFAC's strict-liability frame** directly (every US person has to comply with OFAC), not through a stand-alone sanctions-program rule. The QA reads the adviser's program against the OFAC Framework five components (advisers can voluntarily align even where the FFIEC manual is not the operative anchor) and notes the rulemaking state on the date of analysis [verify current state of FinCEN IA AML rulemaking on the date of analysis].

## Cross-link inside the plugin

- **`cdd-risk-review`** carries the BD's, fund's, or adviser's customer-segmentation work. Where the screening QA flags a 50 Percent Rule aggregation gap on legal-entity customers, the CDD posture feeds the read.
- **`aml-model-monitoring`** carries the screening-engine and surveillance-system model governance.
- **`sar-decision-qa`** carries the SAR-decision QA where a sanctions-adjacent alert at a BD escalates.

## Cross-link to other plugins

- **`market-conduct-and-customer-outcomes/best-execution-surveillance`** [verify skill exists in current build] — where the sanctions alert sits adjacent to a market-manipulation pattern (e.g., microcap pump-and-dump linked to a sanctioned issuer), cross-reference rather than absorbing both lenses.
- **`third-party-operational-resilience/vendor-diligence`** for transfer-agent, custodian, fund-accountant, and order-management-system vendor diligence.

## Output-template additions for capital markets

- Restricted-securities-list handling status as a named field (`security-level-block`, `customer-only-screen`, `partial`, `not-applicable`).
- Settlement-chain screening posture as a named field where the firm has clearing or settlement capability.
- Transfer-agent screening posture as a named field for fund firms.
- Adviser-rule-state note as a dated field where the firm is a covered investment adviser.

## Common pitfalls in capital-markets sanctions-screening QA

- Importing the FFIEC bank-flavoured frame as if it were operative for a BD or fund; the FFIEC manual informs but does not bind, and SEC / FINRA examiners are the primary audience.
- Reading restricted-securities-list compliance as a customer-screen exercise; the operative limb is a security-level transaction prohibition.
- Treating an investment-adviser-only firm as outside OFAC scope; OFAC is strict-liability and reaches every US person.
- Skipping the settlement-chain or transfer-agent screening read where the firm has those capabilities.
- Confusing CDD findings (which sit in `cdd-risk-review`) with sanctions-screening findings.
- Missing the divestment-window posture on newly-restricted securities (operational compliance with the wind-down period is a discrete read).
