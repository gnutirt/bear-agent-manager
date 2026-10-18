# Climate cross-cutting overlay for cyber-disclosure-readiness

The disclosure machinery for cyber and for climate overlaps materially: the same DCP under Rule 13a-15, the same disclosure committee, the same materiality lens, and the same 8-K mechanic handle both. This overlay sets what changes when the scope flags climate alongside (or instead of) a cyber incident — that is, when a climate-related material event is the trigger, or when the 10-K's climate disclosure is up for refresh in the same cycle as the Item 106 cyber disclosure.

Loaded by: `cyber-disclosure-readiness/SKILL.md` when `scope.cross_cutting_set` includes `climate`. Climate is required as a cross-cutting overlay for this skill because the disclosure machinery overlaps; the depth lives here so SKILL.md does not re-anchor full climate sources.

## Source basis

- SEC Climate Disclosure Rule, Release Nos. 33-11275 / 34-99678, "The Enhancement and Standardization of Climate-Related Disclosures for Investors" (final March 6, 2024). Items 1500-1507 of Regulation S-K and Article 14 of Regulation S-X. **Verify current effectiveness at draft time** — the rule has been subject to legal challenges and the Commission stayed the rule pending resolution of consolidated litigation in the Eighth Circuit (Order issued April 4, 2024).
- TCFD: "Recommendations of the Task Force on Climate-related Financial Disclosures" (Final Report, June 2017) and "Implementing the Recommendations of the Task Force on Climate-related Financial Disclosures" (October 2021). Pillars: Governance, Strategy, Risk Management, Metrics and Targets. The FSB disbanded the TCFD in October 2023 with monitoring transferred to the IFRS Foundation; the recommendations remain the working voluntary frame and underpin ISSB IFRS S2.
- IFRS S2 Climate-related Disclosures (June 2023) for firms reporting under ISSB-aligned regimes.
- EU CSRD and ESRS E1 (Climate change) for firms in scope under the EU regime, including US subsidiaries and non-EU groups consolidated through EU parents.
- California Climate Corporate Data Accountability Act (SB 253) and Climate-Related Financial Risk Act (SB 261); verify effective status given litigation history and current implementing regulations at draft time.
- NYDFS Industry Letter on Climate-Related Financial Risks (for state-regulated banks and insurers).
- NAIC Climate Risk Disclosure Survey (TCFD-aligned, mandatory in 15 US states for in-scope insurers).

## What changes for climate-flagged disclosure-readiness work

### 1. The 8-K trigger flow applies to material climate-related events

A material climate-related event (a severe weather loss, a transition-policy event affecting a material exposure, a material climate-target abandonment) is a material event under the same 8-K framework. The trigger flow runs through the same DCP. Item 1.05 itself does not apply to climate events (it is cyber-incident-specific), but the registrant's 8-K Item 8.01 (Other Events) or Item 7.01 (Reg FD) is the disclosure venue, and the materiality determination uses the same TSC / Basic standard.

The DCP map (Artifact C) covers cyber explicitly; firms with climate-disclosure obligations frequently use the same DCP map for climate events. The materiality-determination protocol, the named decision-makers, the time-box, and the documentation requirements are common.

### 2. The 10-K disclosure cycle integrates Item 106 (cyber) and the Item 1500-series (climate)

For registrants in scope under the SEC Climate Disclosure Rule (where current effectiveness applies), the same 10-K cycle disclosures cover Item 106 (cyber risk-management and governance) and Items 1500-1507 (climate risk-management, governance, strategy, targets, and emissions). The disclosure committee and securities counsel review the cycle as a whole; the year-over-year diff discipline applies to both.

Where the SEC Climate Disclosure Rule is currently stayed or where its applicability to the registrant is unresolved, the registrant typically:

- Carries forward voluntary TCFD-aligned disclosure in the 10-K (or in a separately published sustainability or integrated report).
- Reports under EU CSRD via parent-group consolidation if applicable.
- Files state-required disclosure (NAIC Climate Risk Disclosure Survey, California SB 253 / 261 where current implementing regulations apply).

The pack carries the firm's current disclosure venue posture and the verification-flag discipline on SEC-rule status. **Default posture: cite the SEC rule with `[verify current effectiveness]` and lean on TCFD or CSRD or state-required disclosure for substantive content.** Never assert current effectiveness of the SEC climate rule without checking the SEC's posture as of the report date.

### 3. The materiality lens is the same; the facts are different

The TSC / Basic materiality standard applies to climate-related events as it does to cyber events. The facts development is different:

- Cyber-incident facts develop on a hours-to-days timeline; the workpaper captures the snapshot.
- Climate-related event facts can develop on a weeks-to-quarters timeline (a severe-weather loss has insurance-recoverable estimates that settle over months; a transition-policy event has portfolio implications that develop with policy implementation).

The workpaper structure (facts known / unknown / reasonably knowable; quantitative impact current / reasonably foreseeable; qualitative factors; aggregation) applies to both, with adapted facts.

### 4. Aggregation analysis for climate-related events

Item 1.05 Instruction 1 on aggregation is cyber-specific. For climate-related events, the parallel principle is the SEC Climate Disclosure Rule's aggregation guidance for Article 14 of Regulation S-X (financial-statement effects of severe weather events): aggregation thresholds for capitalized costs and expenditures from severe weather events. Where a series of severe-weather events individually below threshold collectively exceed it, the financial-statement effect aggregates.

The workpaper's aggregation row carries climate-event aggregation when applicable, even though the Instruction 1 reference does not directly apply to non-cyber events. The aggregation analysis is the same disclosure-committee discipline.

### 5. Governance disclosure overlap (Item 106(c) and Item 1501)

The Item 106(c) cyber-governance disclosure and the Item 1501 climate-governance disclosure (where the Climate Rule's effectiveness applies) frequently name the same board committee (typically the Risk Committee or a dedicated Sustainability Committee for climate; the Risk Committee or Audit Committee for cyber) and the same management chain (CRO, with CISO for cyber and chief sustainability officer or equivalent for climate).

The cross-cutting alignment is a content question for the disclosure committee. Where the same committee oversees both, the disclosures should be consistent on cadence, informing processes, and committee composition. Inconsistency between the two governance disclosures is a frequent finding.

### 6. Risk-management process integration (Item 106(b)(1)(i) and Item 1502)

Item 106(b)(1)(i) requires disclosure of whether and how cyber risk-management processes are integrated into the firm's overall risk-management system. Item 1502 of the Climate Rule requires similar disclosure for climate. The integration narrative should be consistent across the two: where the firm's enterprise risk-management framework treats both as enterprise risks integrated into the same framework, both disclosures should reflect that.

Treating cyber and climate as siloed risks in the disclosures (when the firm's actual ERM framework integrates them) is an inconsistency reviewers pull on.

### 7. Forward-looking disclosure and verification discipline

The forward-looking commentary in any climate-cross-cutting work carries explicit verification discipline:

- SEC Climate Disclosure Rule status — `[verify current effectiveness]` flag; do not assert in force without checking SEC posture at draft time.
- California SB 253 / 261 — verify current implementing regulations and effective dates given litigation history.
- EU CSRD wave-2 / wave-3 timing for in-scope subsidiaries.
- ISSB IFRS S2 adoption status by jurisdictions where the firm operates.

The workpaper's `verification_flags_carried_forward` array carries each flag forward to draft time.

## Climate-specific output additions

When climate is in scope:

- Artifact A material-event row carries the climate-event characterization (acute physical, chronic physical, transition-policy, transition-technology, transition-market, transition-reputational) and the disclosure venue (8-K Item 8.01, 10-K Item 1500-series, voluntary TCFD report, state-required filing).
- Artifact B carries an Item 1500-series cross-link in the 10-K diff record, and a year-over-year diff on the climate-disclosure cycle alongside the Item 106 cyber-disclosure cycle.
- Artifact C documents whether the firm uses one DCP for both cyber and climate events (typical) or separate DCPs (less common; usually means climate is owned by sustainability function with a parallel escalation path that converges at the disclosure committee).
- Source trace carries the SEC Climate Rule citation with the `[verify current effectiveness]` flag explicit, and the substantive content anchor (TCFD, ISSB IFRS S2, CSRD ESRS E1, or state-required) for the working-frame content.

## Common pitfalls in climate-flagged disclosure-readiness work

- Asserting current effectiveness of the SEC Climate Disclosure Rule without checking SEC posture at draft time.
- Treating climate-related material events as out of scope for the 8-K because they do not trigger Item 1.05. Item 8.01 (or Item 7.01 in some scenarios) is the venue and the materiality determination uses the same TSC / Basic standard.
- Inconsistency between the Item 106(c) and Item 1501 governance disclosures when the same committee oversees both.
- Inconsistency between Item 106(b)(1)(i) and Item 1502 risk-management-integration narratives when the firm's actual ERM treats both as integrated.
- Treating EU CSRD as out of scope for US-headquartered firms without checking subsidiary consolidation. Many US firms have material EU subsidiaries that pull the parent into wave-2 or wave-3 reporting under ESRS.
- Rolled-forward-unchanged climate disclosure year-over-year. Year-over-year diff and rationale apply.
- Using the firm's prior-vintage scenario data after a vintage refresh has been published.
- Omitting the verification-flag discipline in the source trace. Each climate citation needing verification carries the flag forward.
