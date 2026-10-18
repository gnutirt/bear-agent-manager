# Reconciliation — Worked Examples

## Contents

1. [Example 1: Designing a Daily Reconciliation Process for a Multi-Custodian RIA](#example-1-designing-a-daily-reconciliation-process-for-a-multi-custodian-ria) — automated ingestion and matching schedule, exception review, SOC 2 documentation, KPI targets
2. [Example 2: Investigating and Resolving a Pattern of Corporate Action-Related Position Breaks](#example-2-investigating-and-resolving-a-pattern-of-corporate-action-related-position-breaks) — break categorization by event type, vendor timing root cause, corrective measures
3. [Example 3: Building Reconciliation Automation with Exception-Based Processing](#example-3-building-reconciliation-automation-with-exception-based-processing) — requirements, tool selection, normalization mapping, parallel run, steady-state metrics

## Example 1: Designing a Daily Reconciliation Process for a Multi-Custodian RIA

**Scenario:** An RIA manages $1.2 billion in assets across 2,400 accounts at two custodians (Schwab and Fidelity, approximately 60% and 40% of accounts respectively). The firm uses Orion as its portfolio management system. The current reconciliation process is semi-manual: an operations analyst downloads position files from each custodian each morning, loads them into a spreadsheet, and compares them against an Orion position export. The process takes approximately 3.5 hours each day and regularly identifies 30-60 breaks, of which roughly half are timing differences that resolve the next day. The firm wants to design an automated daily reconciliation process that reduces manual effort, provides consistent break tracking, and satisfies the firm's SOC 2 auditors.

**Design Considerations:**
- The firm needs to reconcile positions, cash, and transactions daily against both custodians.
- Schwab files arrive by 4:00 AM ET; Fidelity files arrive by 3:00 AM ET.
- The Orion end-of-day position and transaction data is available by 5:00 AM ET after the nightly batch completes.
- The firm has a two-person operations team that also handles trading and client service, so reconciliation must not consume more than 1 hour of analyst time per day under normal conditions.
- The SOC 2 auditor requires evidence of daily reconciliation, break tracking with aging, and documented resolution for every break.

**Analysis:**

Phase 1 — Automated Data Ingestion and Matching (pre-market, no human involvement):

The firm configures Orion's built-in reconciliation module (or a third-party reconciliation tool such as Advent Geneva, IVP Reconciliation, or a purpose-built solution) to automatically ingest custodian files. The system performs the following steps without manual intervention:
- 3:00-4:00 AM: Retrieve Fidelity and Schwab position, transaction, and cash files via SFTP.
- 5:00-5:30 AM: Retrieve Orion end-of-day position and transaction extracts.
- 5:30-6:00 AM: Normalize custodian data into a common format (map security identifiers via a CUSIP cross-reference, translate transaction type codes, standardize date formats).
- 6:00-6:30 AM: Execute automated matching — compare positions (share count by security by account), cash balances (settled cash plus pending settlements), and transactions (matched on security, account, quantity, trade date).
- 6:30-6:45 AM: Apply auto-resolution rules — mark timing differences that match the known one-day offset pattern for settlement, auto-accept rounding differences within the $1.00 cash tolerance, and auto-accept pricing differences within the 5 bps market value tolerance.
- 6:45-7:00 AM: Generate the daily exception report listing all unmatched and out-of-tolerance items.

Phase 2 — Exception Review (7:00-8:00 AM, one analyst):

The operations analyst reviews the exception report. Under steady-state operations, the expected exception volume after auto-matching and auto-resolution is 5-15 items per day (compared to 30-60 in the current manual process). For each exception, the analyst follows the investigation sequence described in Core Concepts Section 4: check for pending transactions, review the corporate action calendar, verify security identifier mappings, and check for manual trades. Most exceptions should be resolvable within 5-15 minutes each.

Phase 3 — Documentation and Reporting:

Every break and its resolution is documented in the reconciliation system with the fields required for SOC 2 audit: break date, category, severity, root cause, corrective action, resolution date, and analyst identity. The system produces a daily reconciliation summary report showing: total records compared, auto-matched records, auto-resolved records, exceptions requiring manual review, exceptions resolved same-day, and exceptions carried forward (with aging). A weekly summary is produced for management review, and a monthly summary is retained for the SOC 2 auditor.

Phase 4 — Performance Targets and Monitoring:

The firm establishes the following reconciliation KPIs:
- Auto-match rate for positions: target 98% (allowing for 2% corporate action and data feed exceptions).
- Auto-match rate for transactions: target 92%.
- Same-day exception resolution: target 85%.
- Maximum break aging: no break older than 5 business days without escalation to the operations manager.
- Analyst time spent on reconciliation: target under 1 hour per day.

These KPIs are tracked monthly and reported to the chief compliance officer. Deterioration in any metric triggers a root-cause review and process adjustment.

## Example 2: Investigating and Resolving a Pattern of Corporate Action-Related Position Breaks

**Scenario:** Over the past quarter, the operations team at a $600M RIA has observed that corporate action-related position breaks account for 45% of all breaks, up from approximately 20% in the prior year. The increase is not explained by higher corporate action volume in the market. The firm uses Black Diamond as its PMS and custodies assets at Fidelity. The operations manager asks the team to investigate the pattern, identify root causes, and implement corrective measures.

**Design Considerations:**
- The firm processes approximately 80-120 corporate actions per month (dividends, splits, mergers, spin-offs, tender offers).
- The Black Diamond PMS receives corporate action data from the Fidelity data feed and also from a third-party corporate action vendor integrated into the platform.
- The operations team has two analysts who spend approximately 30% of their time on break resolution, up from 15% a year ago due to the corporate action break increase.

**Analysis:**

Step 1 — Data Collection and Break Categorization:

The operations manager extracts break data for the past two quarters from the reconciliation system and categorizes corporate action breaks by sub-type:

| Corporate Action Type | Break Count (Q1) | Break Count (Q2) | Change |
|---|---|---|---|
| Cash dividends | 12 | 15 | +25% |
| Stock splits | 3 | 18 | +500% |
| Mergers / acquisitions | 5 | 22 | +340% |
| Spin-offs | 2 | 8 | +300% |
| Dividend reinvestment (DRIP) | 8 | 14 | +75% |
| Return of capital | 1 | 4 | +300% |
| **Total** | **31** | **81** | **+161%** |

The data reveals that the increase is concentrated in splits, mergers, and spin-offs — action types that require multi-step processing and cost basis adjustment. Cash dividend breaks increased modestly and are largely timing-related.

Step 2 — Root Cause Investigation for Splits and Mergers:

The team examines a sample of 15 split and merger breaks in detail. Findings:
- In 11 of 15 cases, the custodian (Fidelity) processed the action on the effective date, but the Black Diamond PMS did not process it until 1-3 business days later.
- The delay is traced to a change in the third-party corporate action vendor's data delivery schedule. Six months ago, the vendor changed its delivery time from 6:00 PM ET (day before effective date) to 10:00 PM ET (day of effective date). Black Diamond's nightly batch runs at 9:00 PM ET, so actions delivered at 10:00 PM are not processed until the following night — creating a guaranteed one-day lag relative to the custodian.
- In 4 of 15 cases, the action involved a complex merger with mixed consideration (cash plus stock) and fractional share cash-in-lieu. The automated processing applied the exchange ratio correctly but failed to generate the cash-in-lieu transaction for fractional shares, causing both a position break (fractional share difference) and a cash break (missing cash-in-lieu payment).

Step 3 — Root Cause Investigation for Spin-Offs:

The team examines the 8 spin-off breaks. Findings:
- In 6 of 8 cases, the parent company cost basis was not reallocated to the spun-off entity. The PMS created the new position with the correct share count but assigned zero cost basis, while the custodian allocated cost basis using the IRS-prescribed allocation methodology (based on fair market values on the distribution date). This created a cost basis break but not a position break.
- In 2 of 8 cases, the PMS failed to create the new spin-off security position entirely because the new security's CUSIP was not yet in Black Diamond's security master at the time of processing.

Step 4 — Corrective Measures:

The operations manager implements the following changes:

(a) Vendor delivery timing fix: Contact the corporate action data vendor and request a return to the earlier delivery schedule, or configure Black Diamond to run a second mini-batch at 11:00 PM ET specifically for corporate action processing. The second option is implemented because the vendor cannot change its delivery time for a single client.

(b) Fractional share cash-in-lieu rule: Create a post-processing check for all merger and acquisition actions — after the exchange ratio is applied, verify that the resulting position has no fractional shares. If fractional shares exist and the action terms specify cash-in-lieu, generate the cash-in-lieu transaction automatically.

(c) Spin-off cost basis automation: Configure the PMS to automatically apply cost basis reallocation for spin-offs using the custodian's allocation percentages (sourced from the custodian data feed or a reference data provider). Require operations analyst review and approval before the reallocation is posted, to catch errors in the allocation percentages.

(d) New security CUSIP monitoring: Implement a daily check of upcoming corporate actions against the PMS security master. Any action that references a CUSIP not in the security master triggers an alert to the operations team, who can add the security proactively before the effective date.

Step 5 — Monitoring and Target Setting:

The operations manager sets a target of reducing corporate action breaks to no more than 25% of total breaks (from the current 45%) within two quarters. The reconciliation dashboard is updated to include a corporate action break sub-report with the categories above, enabling ongoing monitoring without manual data extraction.

## Example 3: Building Reconciliation Automation with Exception-Based Processing

**Scenario:** A rapidly growing RIA has doubled its account count from 1,500 to 3,000 accounts over the past 18 months without adding operations staff. The reconciliation process, which was adequate at 1,500 accounts, is now overwhelmed. The two operations analysts are spending 4-5 hours per day on reconciliation (split between two custodians), leaving insufficient time for other operations tasks (trading, client service, account maintenance). The firm's reconciliation break rate has risen from 1.5% to 4% of accounts as analysts cut corners to manage the volume. The chief operations officer decides to invest in reconciliation automation to restore quality while supporting continued growth.

**Design Considerations:**
- The firm uses Tamarac as its PMS and custodies at Schwab and Pershing.
- The current process is spreadsheet-based: analysts manually download files, paste into comparison templates, and visually scan for differences.
- The firm's budget supports a mid-range reconciliation solution (not an enterprise platform like Advent Geneva, but more than a spreadsheet).
- The goal is to reduce analyst reconciliation time to under 1 hour per day while improving the break rate to under 1% of accounts.

**Analysis:**

Phase 1 — Requirements Definition and Tool Selection (Weeks 1-3):

The COO defines functional requirements for the reconciliation solution:
- Automated ingestion of Schwab and Pershing data files (position, transaction, cash) via SFTP.
- Automated ingestion of Tamarac end-of-day data via API or file export.
- Configurable matching rules: position matching on CUSIP + account + share count; transaction matching on CUSIP + account + quantity + trade date; cash matching on account + settled balance with tolerance.
- Auto-resolution rules for timing differences, rounding, and known pricing discrepancies.
- Exception dashboard with break categorization, severity, aging, and assignment to analyst.
- Resolution documentation workflow (root cause, corrective action, resolution date).
- Daily, weekly, and monthly reporting for management and SOC auditors.
- Break trend analysis and pattern detection over time.

The firm evaluates three options: (a) Tamarac's built-in reconciliation module, which handles position matching but lacks advanced auto-resolution and reporting; (b) a mid-market reconciliation platform (such as Arcesium, Duco, or a similar SaaS offering) that provides configurable matching, auto-resolution, and reporting; (c) a custom-built solution using the firm's existing technology stack. The firm selects option (b) for its balance of capability and cost.

Phase 2 — Implementation and Configuration (Weeks 3-8):

Data connectivity: Configure SFTP connections to Schwab and Pershing for automated file retrieval. Configure API or file-based data extraction from Tamarac. Test file ingestion for all three sources over a two-week period to identify format issues or delivery timing gaps.

Normalization mapping: Build the cross-reference tables for security identifiers (CUSIP mapping between Tamarac, Schwab, and Pershing), transaction type codes (translating each source's taxonomy into a common set), and account identifiers (PMS account number to custodian account number mapping for all 3,000 accounts).

Matching rule configuration: Define position matching rules (exact match on CUSIP + account number, zero tolerance on share count). Define transaction matching rules (match on CUSIP + account + quantity + trade date, with a one-day tolerance window for settlement timing). Define cash matching rules (match on account, $2.00 tolerance for rounding).

Auto-resolution rule configuration: Configure auto-resolution for: (a) timing breaks where the offsetting transaction appears within one business day; (b) cash rounding differences within $2.00; (c) market value differences within 5 bps attributable to a known pricing source difference; (d) fractional share differences of less than 0.01 shares (common with DRIP).

Phase 3 — Parallel Run and Validation (Weeks 8-10):

Run the automated reconciliation system in parallel with the existing manual process for two full weeks. Compare results: every break identified by the manual process should also be identified by the automated system. Any break caught manually but missed by the automated system indicates a matching rule gap that must be corrected before cutover. Conversely, the automated system may identify breaks that the manual process missed (a positive outcome that validates the investment).

Phase 4 — Cutover and Optimization (Weeks 10-12):

Transition to the automated system as the primary reconciliation process. During the first two weeks post-cutover, analysts review all auto-resolved items to validate that the auto-resolution rules are functioning correctly and not masking genuine breaks. Adjust rules as needed based on this review.

Phase 5 — Steady-State Performance Monitoring:

Post-implementation, the firm tracks the following metrics against targets:

| Metric | Pre-Automation Baseline | Target | Measurement Cadence |
|---|---|---|---|
| Analyst time per day | 4-5 hours | Under 1 hour | Monthly |
| Break rate (% of accounts) | 4.0% | Under 1.0% | Weekly |
| Auto-match rate (positions) | N/A (manual) | 97%+ | Daily |
| Auto-match rate (transactions) | N/A (manual) | 90%+ | Daily |
| Same-day resolution rate | ~60% | 85%+ | Weekly |
| Breaks aged over 5 days | ~8% of breaks | Under 2% | Weekly |

The capacity gained by automation (approximately 3-4 analyst hours per day) is redirected to other operations functions: trading support, client service, and account maintenance. The firm can now support continued account growth without adding operations headcount specifically for reconciliation until account volume reaches approximately 6,000-8,000 accounts, depending on break rates.

