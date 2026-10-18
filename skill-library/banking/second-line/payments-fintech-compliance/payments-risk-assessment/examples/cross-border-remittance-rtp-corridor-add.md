# Example: Cross-border remittance fintech reassessing risk after adding RTP and a new corridor

Public-source-derived. No named program operator. The shape mirrors a common pattern at a cross-border remittance program operator, currently licensed in 25 US states under MTL via NMLS, that has just enabled RTP for the domestic legs of its remittance flows and added three new sending corridors (one of which is high-OFAC-risk-adjacent).

## Input

- **Program operator role**: `cross-border-remittance-provider`. Money transmitter under state MTL in 25 states; FinCEN MSB-registered.
- **Rails in scope**: ACH and Same Day ACH (consumer funding); RTP (newly enabled for domestic-leg funding and for the US-side disbursement on receive corridors); wire (Fedwire / CHIPS for higher-value send corridors); cross-border correspondent (the substantive cross-border leg); virtual-currency on-ramp (for the on-ramp side of one new corridor; verify VASP counterparty configuration).
- **Segments in scope**: consumer remittance sender; consumer remittance receiver (US-side disbursement); a small business-to-consumer cohort.
- **Geographic footprint**: 25 US states; existing corridor countries plus three new corridors. One new corridor is high-OFAC-risk-adjacent (sanctioned-jurisdiction proximity; verify against current OFAC SDN, sectoral sanctions, and 50-Percent-Rule subsidiaries on the analysis date).
- **Sponsor banks and processors**: sponsor bank for USD funding flows; sanctions-screening vendor with corridor-by-corridor coverage; FX vendor and last-mile partner per receive corridor.
- **Review trigger**: `new-rail` (RTP enablement) + `new-corridor` (three corridors added). Combined as a delta-risk assessment that updates the prior annual baseline.
- **Audience**: BSA officer (primary); head of payments compliance; board risk committee for the OFAC-risk-adjacent corridor decision.
- **Source posture**: `public-plus-firm-policy-plus-system-of-record-evidence`. Firm has access to the sanctions-screening vendor portal, the sponsor-bank reporting feed, the FX-vendor reconciliation, and the corridor-by-corridor disbursement data.
- **Engagement scope supplied**: institution = state-licensed money transmitter (also FinCEN MSB-registered); primary regulators = FinCEN, OFAC, state DFI / DOB across the 25-state footprint via NMLS, CFPB (indirect on Reg E §1005.31 subpart B); persona = BSA officer; sector overlay = payments-fintech (sector flagship); cross-cutting overlays = cyber (default-on; vendor stack), conduct (default-on; consumer-facing), privacy (default-on).

## Output sketch

The skill produces a delta-risk assessment that updates the prior annual baseline. Headlines:

- **Program summary** — money transmitter on cross-border remittance flows; named sponsor bank and vendor stack; 25-state US footprint; existing corridors plus three new (one high-OFAC-risk-adjacent); RTP newly enabled domestically.

- **§1033 status note** — firm is a data provider for consumer-account-style remittance ledger data; verify tier and implementation date.

- **MSB / MTL status note** — FinCEN MSB-registered (registration current; renewal date noted). State-by-state MTL via NMLS, 25-state footprint; MTMA adoption status varies; verify per state on the analysis date. Configuration-specific against FinCEN administrative-ruling library.

- **Risk universe by rail** (delta-focus on new and changed):
  - *RTP (newly enabled)* — top failure modes: settlement-finality irrevocability (no chargeback; recovery is request-for-return-of-funds under The Clearing House RTP Operating Rules — verify version and section against the firm's licensed copy); request-for-return-of-funds latency at the sponsor bank; ISO 20022 message-field anomalies (suspicious creditor account, suspicious end-to-end ID); 24/7/365 staffing posture for the operations and dispute teams. Residual risk: high (newly enabled). Top KRIs: request-for-return-of-funds aging; ISO 20022 anomaly-detection coverage; 24/7 staffing-coverage rate.
  - *Cross-border correspondent* — top failure modes: OFAC-screening latency on the new corridors (sanctions-screening vendor tuning lag); correspondent-bank de-risking on the OFAC-adjacent corridor; FX-disclosure timing under Reg E §1005.31 subpart B (pre-payment / post-payment disclosure; verify exact subpart B section and the firm's disclosure template). Residual risk: high on the OFAC-adjacent corridor, moderate elsewhere.
  - *ACH / Same Day ACH / wire* — unchanged from prior baseline; status line.
  - *Virtual-currency on-ramp* — top failure modes: Travel Rule applicability under 31 CFR §1010.410(f) at threshold (verify current threshold and FinCEN proposed-rule status); FinCEN CVC guidance applicability (FIN-2013-G001, FIN-2019-G001 — verify currency); VASP counterparty screening; chain-analytics vendor coverage; NYDFS BitLicense applicability under 23 NYCRR Part 200 if NY persons are in scope.

- **Risk universe by segment**:
  - *Consumer remittance sender* — top failure modes: Reg E §1005.31 subpart B disclosure-timing failures (the load-bearing failure mode for the new corridors); fee disclosure including FX-spread presentation; complaint volume on the new corridors. Residual risk: high.
  - *Consumer remittance receiver (US-side disbursement)* — top failure modes: Reg E §1005.6 unauthorised-transfer liability on the disbursement leg; account-takeover patterns on instant-funded inbound (heightened with RTP enablement); fee disclosure on receive-side fees. Residual risk: moderate-to-high.
  - *Business-to-consumer* — small cohort; top failure modes: AML-monitoring posture on B2C disbursement patterns. Residual risk: moderate.

- **Risk universe by geography**:
  - *25 US state rows* — each carries MTL via NMLS posture; MTMA adoption status per state (verify); state-AG enforcement on remittance fee disclosure where active; state breach-notification statutes for the cyber row.
  - *Corridor country rows* — existing corridors summarised; three new corridor rows in detail. The OFAC-adjacent corridor row carries: sending-side OFAC obligations (SDN list, sectoral sanctions, 50-Percent-Rule subsidiaries — verify against current); enhanced sanctions-screening cadence (real-time at message-field granularity, batch reconciliation daily); correspondent-bank reaffiliation status; receiving-side host-country obligations named at high level (the assessment does not substitute for local counsel).

- **Concentration views**:
  - *Sponsor-bank* — single sponsor bank for USD funding; scenario impact under sponsor exit named; standby-sponsor not pre-papered (a remediation item).
  - *Processor* — n/a-as-card; the equivalent for remittance is the sanctions-screening vendor and the FX vendor; named explicitly with corridor-by-corridor coverage.
  - *BIN-sponsor* — not applicable.

- **Cross-cutting risks**:
  - *AML / sanctions* — flagged red on the OFAC-adjacent corridor. Risk owner: BSA officer. Top KRIs: sanctions-hit-rate per corridor; sanctions-screening false-positive disposition aging; Travel Rule applicability log coverage. Deep-dives: `sanctions-screening-qa` and `aml-model-monitoring` with the payments-fintech overlay.
  - *Operational resilience* — yellow on RTP 24/7 staffing posture and on the request-for-return-of-funds latency.
  - *Customer-harm / UDAAP* — yellow on Reg E §1005.31 subpart B disclosure-timing on the new corridors.
  - *Cyber, fraud, reporting* — green-to-yellow per current cycle.

- **Risk-appetite posture** — red on the OFAC-adjacent corridor sanctions-hit-rate KRI; yellow on RTP 24/7 staffing; yellow on the Reg E §1005.31 disclosure-timing on new corridors. Trigger conditions named.

- **KRI dictionary** — RTP-specific KRIs (request-for-return-of-funds aging; ISO 20022 anomaly coverage; 24/7 staffing coverage); corridor-specific sanctions KRIs; Reg E §1005.31 disclosure-timing KRI.

- **Recommended remediation portfolio** — sanctions-screening-vendor tuning QA on the new corridors before volume scales; 24/7 staffing posture for RTP request-for-return-of-funds; Reg E §1005.31 disclosure-template review against the new corridors and the RTP-funded send paths; standby-sponsor pre-paper; state MTL filings for any state requiring notification of material change (MTMA adoption status drives the per-state filing path; verify per state); CSBS Multistate MSB Licensing Agreement Program coverage check.

- **Recommended disposition**: `accept-with-conditions`. Conditions: sanctions-screening tuning QA evidenced before volume scales on OFAC-adjacent corridor; RTP 24/7 staffing posture in place before next ERC; Reg E §1005.31 disclosure-template review evidenced; state MTL filings for material-change notifications complete.

The assessment stops at the recommendation. The BSA officer and the head of payments compliance own sign-off; the board risk committee consumes the OFAC-adjacent-corridor decision separately.

## Why this scenario matters

- **Boundary check on faster-payments shift**: the RTP rail row cannot reuse the card-rail recovery template. Settlement-finality irrevocability and request-for-return-of-funds are the operative mechanics, not chargeback.
- **Boundary check on corridor-by-corridor geography**: the three new corridors get three rows, not one. The OFAC-adjacent corridor needs separate sanctions-screening and correspondent-bank treatment.
- **Boundary check on Reg E §1005.31 subpart B**: the remittance-transfer rule is its own beast. Asserting "this is a domestic Reg E lane" misses the cross-border subpart entirely.
- **Boundary check on Travel Rule and CVC**: the virtual-currency on-ramp on one corridor pulls the Travel Rule and FinCEN CVC guidance into the assessment; verify thresholds and guidance currency on the analysis date.
- **Boundary check on state MTL material-change notifications**: many state MTL regimes require notification of material change in business model (which a new rail or new corridor can be); MTMA adoption status varies; verify per state.
- **Boundary check on MSB-vs-not**: the firm is FinCEN MSB-registered (categorical fact, not a configuration question); the configuration question is which corridors and which CVC activity pull additional FinCEN obligations.

## Anchors

- Reg E (12 CFR Part 1005) §1005.6, §1005.11, §1005.31 subpart B (remittance transfer rule).
- NACHA Operating Rules (current edition; paywalled; conceptual citation).
- The Clearing House RTP Operating Rules (current; verify version date and section).
- FedNow Service Operating Procedures (current; verify version date) — applicable on receive-side disbursement where FedNow is enabled.
- FinCEN MSB rules at 31 CFR Part 1022; FinCEN MSB registration at 31 CFR §1022.380; FinCEN Travel Rule at 31 CFR §1010.410(f); FinCEN CVC guidance FIN-2013-G001, FIN-2019-G001 (verify currency).
- OFAC 31 CFR Part 501; OFAC Compliance Commitments (May 2, 2019); OFAC SDN list and 50-Percent-Rule guidance.
- FFIEC BSA/AML Examination Manual.
- State Money Transmitter Modernization Act adoption status via NMLS (state-by-state; verify on the analysis date); CSBS Multistate MSB Licensing Agreement Program coverage.
- NYDFS 23 NYCRR Part 200 (BitLicense) for any NY-touching VC activity; NYDFS 23 NYCRR Part 500 §500.17(a) for cyber-event notification.

See `references/source-anchors.md` for full citations and `references/sector-overlays/payments-fintech.md` for the rail-specific and corridor-specific failure-mode menu.
