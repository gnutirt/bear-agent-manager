# Operational Risk — Worked Examples

## Contents

1. Example 1: Building an Operational Risk Framework for a Broker-Dealer's Trading Desk
2. Example 2: Designing a Trade Error Handling and Correction Process
3. Example 3: Implementing a KRI Dashboard for Trading Operations Management

### Example 1: Building an Operational Risk Framework for a Broker-Dealer's Trading Desk

**Scenario.** A mid-size broker-dealer executes approximately 15,000 equity trades per day across four trading desks (institutional agency, retail, proprietary, and electronic market-making). The firm has experienced a rising number of trade errors and settlement fails over the past six months. The Chief Risk Officer has asked the operations team to design a formal operational risk framework for the trading desks.

**Step 1 — Risk identification.** The team conducts a risk and control self-assessment (RCSA) for each desk. The process involves structured interviews with desk heads, operations managers, and technology leads. They also review the past 12 months of trade errors, settlement fails, system incidents, and client complaints. The RCSA identifies the following top risks:

- Fat finger errors on the proprietary desk (no pre-trade quantity limits)
- Settlement fails on institutional trades due to SSI mismatches (clients providing incorrect settlement instructions)
- Market data feed interruptions causing stale pricing on the electronic market-making desk
- Key-person dependency in the operations team (one senior analyst handles all corporate action processing)
- Duplicate order submissions on the retail platform during peak volume periods

**Step 2 — Risk assessment.** Each risk is scored on a 5x5 likelihood-impact matrix. Likelihood scale: 1 (rare) to 5 (almost certain). Impact scale: 1 (negligible, under $10K) to 5 (severe, over $500K). The team plots risks on a heat map.

| Risk | Likelihood | Impact | Score | Priority |
|---|---|---|---|---|
| Fat finger errors | 4 | 4 | 16 | High |
| SSI mismatch settlement fails | 3 | 3 | 9 | Medium |
| Market data interruptions | 2 | 5 | 10 | High |
| Key-person dependency | 3 | 4 | 12 | High |
| Duplicate order submissions | 3 | 2 | 6 | Medium |

**Step 3 — Control design.** For each high-priority risk, the team designs preventive and detective controls:

- **Fat finger errors:** Implement pre-trade quantity limits (hard block at 10x normal order size, soft warning at 3x). Add a four-eyes confirmation requirement for orders exceeding $1 million notional.
- **Market data interruptions:** Deploy a secondary market data feed from an alternative vendor. Implement stale data detection (alert if a quote has not updated in 5 seconds during market hours). Define fallback pricing procedures.
- **Key-person dependency:** Cross-train two additional analysts on corporate action processing. Document all corporate action procedures. Implement a buddy system for coverage during absences.

**Step 4 — KRI dashboard.** The team establishes KRIs with thresholds:

- Trade error rate: Green < 0.5 per 1,000 trades; Amber 0.5-1.0; Red > 1.0
- Settlement fail rate: Green < 1%; Amber 1-3%; Red > 3%
- System availability (OMS): Green > 99.95%; Amber 99.9-99.95%; Red < 99.9%
- Aged breaks (> T+3): Green < 10; Amber 10-25; Red > 25

**Step 5 — Loss event tracking.** The team implements a loss event register in the firm's GRC platform. All trade errors with P&L impact above $1,000 are logged, classified by Basel category, and reviewed monthly by the operational risk committee.

**Step 6 — Governance.** A monthly Operational Risk Committee meeting is established, chaired by the CRO, with attendance from heads of trading, operations, technology, and compliance. The meeting reviews the KRI dashboard, loss event trends, open incidents, and corrective action status.

**Outcome.** Over six months, the framework reduces trade errors by 40% (driven primarily by the pre-trade quantity limits) and settlement fails by 25% (driven by SSI validation improvements). The KRI dashboard provides management with a single view of operational risk across all desks.

### Example 2: Designing a Trade Error Handling and Correction Process

**Scenario.** A broker-dealer's compliance team has found that trade errors are handled inconsistently across desks. Some traders correct errors informally without documentation, while others escalate every error regardless of materiality. The firm needs a standardized trade error handling process.

**Step 1 — Error detection.** The firm implements multiple detection layers:

- **Pre-trade checks.** The OMS validates every order against configurable rules: security eligibility (is the security tradeable in this account?), quantity limits (is the order size within bounds?), account restrictions (is the account frozen or restricted?), and duplicate order detection (was an identical order submitted in the last 60 seconds?). Orders that fail pre-trade checks are blocked with an explanatory message.
- **Real-time position monitoring.** The operations team monitors intra-day position changes. Alerts fire when a position moves by more than a configurable threshold (e.g., a new position appears in an account, or a position changes by more than 50% in a single trade).
- **Post-trade reconciliation.** End-of-day reconciliation between the OMS and the clearing firm identifies any discrepancies in positions, trade details, or settlement instructions.

**Step 2 — Error classification.** When an error is detected, it is classified by type and severity:

| Severity | Criteria | Examples |
|---|---|---|
| Level 1 (Minor) | Estimated P&L impact < $5,000; no client impact; easily correctable | Small quantity overfill; minor price improvement on error |
| Level 2 (Moderate) | Estimated P&L impact $5,000-$50,000; client notified; correction required | Wrong account allocation; moderate fat finger error |
| Level 3 (Major) | Estimated P&L impact > $50,000; significant client or market impact | Wrong-side trade; large unauthorized position; error affecting multiple clients |

**Step 3 — Error correction workflow.**

1. **Immediate containment.** The trader or operations analyst immediately assesses whether additional market exposure needs to be neutralized. For wrong-side errors, the offsetting trade is executed as soon as possible to limit further P&L impact.
2. **Error account transfer.** The erroneous trade is moved to the firm's designated error account. The correct trade (if any) is booked to the client's account at the originally intended terms.
3. **Documentation.** An error ticket is created in the operations workflow system. The ticket records: date and time of the error, date and time of detection, the erroneous trade details, the correct trade details, the root cause, the estimated P&L impact, and the corrective actions taken.
4. **Supervisory review.** All errors are reviewed by a supervisor. Level 2 and Level 3 errors require review by the desk head and the compliance department. Level 3 errors are reported to the CRO.
5. **Client communication.** If the error affected a client's account (even briefly), the client is notified of the error and the correction. The notification includes a description of what happened and confirmation that the client's account has been restored to the correct position.
6. **P&L resolution.** Error losses are absorbed by the firm in the error account. Error gains are evaluated on a case-by-case basis; the firm's policy should address whether gains are returned to the client or retained. Best practice is to return gains that would have accrued to the client absent the error.

**Step 4 — Root cause analysis and corrective actions.** Every error undergoes root cause analysis proportional to its severity. Level 1 errors receive a brief written explanation. Level 2 and Level 3 errors receive a formal root cause analysis using the 5 Whys method. Corrective actions are tracked in the operational risk register. Recurring root causes trigger process or system changes.

**Step 5 — Reporting.** A monthly error report is produced for management, summarizing: total errors by desk, error rate per 1,000 trades, total error P&L (gross loss, recovery, net), root cause breakdown (people, process, system, external), and trend analysis. The report highlights any recurring root causes and the status of corrective actions.

**Outcome.** The standardized process ensures every error is captured, documented, and analyzed. Management gains visibility into error trends and can allocate resources to the highest-impact corrective actions.

### Example 3: Implementing a KRI Dashboard for Trading Operations Management

**Scenario.** A broker-dealer's Head of Operations wants a consolidated dashboard that provides a daily view of operational risk across the firm's trading operations. The dashboard must be actionable — it should highlight areas requiring immediate attention and enable drill-down into underlying data.

**Step 1 — KRI selection.** The team selects 10 KRIs from the standard trading-operations KRI set in the skill's Core Concepts table (trade error rate, settlement fail rate, trade break rate, aged breaks, error account balance, STP rate, OMS availability, margin call exceptions, cancel/correct ratio, NIGO rate) based on relevance, measurability, and alignment with the firm's risk appetite.

**Step 2 — Threshold calibration.** For each KRI, green/amber/red thresholds are set using a combination of historical performance (baseline from the prior 12 months), peer benchmarks (industry surveys and clearing firm data), and risk appetite (approved by the Risk Committee), following the traffic-light model in Core Concepts. Calibrations are firm-specific — for example, this firm sets the error account balance amber at $50K and red at $200K, and OMS availability amber below 99.95%.

**Step 3 — Data sourcing and automation.** Each KRI is mapped to a data source:

- Trade error rate: sourced from the error ticketing system
- Settlement fail rate: sourced from the clearing firm's daily settlement report
- Trade break rate: sourced from the reconciliation platform
- OMS availability: sourced from the technology monitoring system
- STP rate: calculated from the OMS (trades requiring manual intervention flagged by exception code)

Data feeds are automated where possible. Manual data entry is limited to KRIs where automated sourcing is not yet available (e.g., NIGO rate may require manual classification initially).

**Step 4 — Dashboard design.** The dashboard displays:

- A summary panel showing all 10 KRIs with current status (green/amber/red) and trend arrows (improving, stable, deteriorating)
- A time-series chart for each KRI showing the trailing 30 days of values with threshold bands
- A drill-down capability: clicking on a red or amber KRI shows the underlying data (individual breaks, errors, or incidents contributing to the metric)
- A commentary section where the operations team records explanations for any amber or red indicators

**Step 5 — Governance and response protocol.** The dashboard is reviewed daily by the Head of Operations and weekly by the Operational Risk Committee. Response protocol:

- Any KRI moving from green to amber triggers an investigation by the responsible team within 24 hours. Findings are documented in the commentary section.
- Any KRI in red triggers an immediate escalation to the CRO and a mandatory corrective action plan within 48 hours.
- KRIs that remain in amber for more than 5 consecutive business days are auto-escalated to red status.
- Monthly trend reports are presented to the Risk Committee with analysis of systemic patterns.

**Outcome.** The dashboard provides a single source of truth for operational risk status. Early detection through leading indicators (STP rate, NIGO rate, aged breaks) enables the operations team to intervene before minor issues escalate into material losses. Over three months of use, the average time to detect and resolve operational issues decreases by 35%.
