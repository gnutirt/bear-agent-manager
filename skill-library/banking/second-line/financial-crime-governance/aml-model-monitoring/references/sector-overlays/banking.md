# Banking sector overlay — aml-model-monitoring

When the scope flags banking, load this overlay alongside `references/source-anchors.md`. It carries the bank-specific monitoring nuance the generic skill does not own.

## Segmentation lines the QA expects

Banks typically segment customers along several axes that the monitoring system tunes against. The QA reads which axes the institution actually uses and whether the segmentation is documented and refreshed.

- **Customer type.** Retail, small-business, mid-market commercial, large commercial, private banking, correspondent banking, MSB customers, trust customers, cash-intensive-business customers. Each carries a distinct expected-activity profile and distinct typology exposure.
- **Product mix.** Deposit, ACH, wire (domestic / international), check, RDC, debit / prepaid card, credit, treasury services, trade finance, lockbox. Scenario coverage by product is read against the BSA/AML risk assessment.
- **Geography.** Branch footprint, customer-residence concentrations, counterparty geographies (especially for international wires and trade), sanctioned-jurisdiction exposure (covered separately by `sanctions-screening-qa`).
- **Channel.** Branch, online, mobile, treasury portal, intermediated (correspondent, sponsor program, broker-dealer).

A rated decision that "segmentation is appropriate" without naming the axes and showing the population and behaviour evidence underneath is a label, not a rated decision. The QA names the missing axis.

## Bank-typical scenario families

The institution's scenario inventory typically covers, at minimum:

- **Structuring** (cash and monetary-instrument). Threshold-based aggregation across short windows.
- **Rapid movement of funds** (in-and-out velocity). Inbound-to-outbound matching across short windows.
- **Unusual-pattern scenarios** against the customer's expected-activity profile (volume, velocity, counterparty, geography deviation).
- **High-risk-counterparty scenarios** (transactions with high-risk geographies, MSBs, certain correspondent flows).
- **Cash-intensive-business scenarios** (CTR pattern, deposit composition, large-bill mix where evidenced).
- **Trade-based-money-laundering indicators** for commercial customers with international counterparties (over- and under-invoicing patterns, third-party-payment indicators, invoice-mismatch indicators).
- **Wire-typology scenarios** (rapid pass-through, third-party-account routing, nested-correspondent exposure).
- **ACH and check** typology scenarios (kiting, false-positive debit patterns, P2P misuse).

Coverage gaps against active FinCEN typology advisories (e.g., ransomware-related conversion typologies, fentanyl supply-chain typologies, elder-fraud typologies, BEC) are findings. The QA does not specify the new scenario; it surfaces the coverage gap and routes to the change-governance machinery.

## Correspondent and private banking nuance

Correspondent-banking monitoring carries nested-activity exposure: the underlying customer-of-customer activity is the typology surface, and downstream payment data may be limited. The QA reads whether the monitoring scope on correspondent activity is calibrated to the foreign-financial-institution's risk profile (`31 CFR §1010.610` due diligence drives the segmentation), whether nested activity is in scope, and how the monitoring scope handles the data-availability constraint.

Private-banking monitoring under `31 CFR §1010.620` carries source-of-funds and source-of-wealth context that the monitoring scenarios should be calibrated against. Senior-foreign-political-figure accounts carry heightened scrutiny that the monitoring scope should reflect.

## Cash-intensive-business specifics

For banks serving cash-intensive businesses, the QA reads:

- Whether the segmentation isolates cash-intensive customers (not just labels them).
- Whether expected-cash-volume profiles are quantified at the customer level, not at the segment level.
- Whether the monitoring scope distinguishes deposit composition (denomination mix, large-bill ratio) where the firm's program and the typology landscape support it.
- Whether the scenario set covers structuring, rapid-velocity, and CTR-pattern scenarios calibrated to the cash-intensive segment specifically.

## Refresh cadence at a bank

Common bank patterns for segmentation refresh: annually for high-risk segments, every two to three years for medium-risk, on event for low-risk. The QA reads against the institution's program-defined cadence, not against an external default. Refresh-cycle adherence is a finding when the cycle is missed; the QA names the missed-cycle date and the segments affected.

Tuning cycle cadence varies; common patterns are annual full tuning or rolling scenario-by-scenario tuning over an 18-month cycle. The QA reads whether the cadence is documented and adhered to, and whether each scenario in the inventory has a last-tuned date inside the program's cadence.

## BTL testing posture at a bank

Below-the-line testing samples activity that fell just below the alert threshold to detect under-tuning. The QA reads whether BTL is performed scenario by scenario, whether sample sizes are statistically defensible against the population, whether the escalation rate is documented, and whether sign-off ties to a named reviewer independent of the tuning team. BTL "performed" reported as a binary without sample size, escalation rate, or sign-off is a finding.

## Productivity and SAR conversion definitions

The QA names the denominator in every productivity and SAR-conversion metric. Common definitions:

- **Productivity** = SARs filed / alerts generated for a scenario in window. Or = escalated investigations / alerts. The denominator differs by firm.
- **SAR conversion** = SARs filed / investigations opened. Or = SARs filed / alerts generated. The two read very differently.
- **False-positive rate** = closed-without-escalation alerts / alerts generated. Definitions vary by whether "closed without escalation" includes auto-closed, manually closed, or both.

A productivity figure reported without a denominator definition is not interpretable; the QA marks the metric as `[evidence needed]` until the definition is on file.

## Bank-specific findings the QA is alert to

- Segmentation refresh overdue against firm policy.
- Scenarios in the inventory with no documented last-tuned date or with last-tuned-date older than the program cadence.
- BTL performed for some scenarios but not others, without rationale for the gaps.
- Threshold change records where the approval evidence post-dates the change effective date.
- Productivity declining quarter-over-quarter for a scenario without a documented tuning hypothesis or a remediation plan.
- Scenario coverage gaps against active FinCEN advisories that the BSA/AML risk assessment named as in-scope typologies.
- Data-quality issues outstanding across multiple monitoring cycles without remediation owner or target date.
- Validation findings outstanding past the remediation target date without documented re-baselining.
