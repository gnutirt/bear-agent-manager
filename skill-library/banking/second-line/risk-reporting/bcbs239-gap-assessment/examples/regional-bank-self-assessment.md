# Example: D-SIB self-assessment ahead of an FRB horizontal review

## Input

A US D-SIB (consolidated assets in the $100B-$700B band) is notified of an upcoming FRB horizontal review on risk data aggregation and risk reporting. The CRO and CDO are jointly running the self-assessment with internal audit shadowing. Source posture is `public-plus-firm-policy-plus-evidence`: the engagement has access to the policy library, the risk-data warehouse, the regulatory-reporting layer, and the issue register, and is scoped to run reconciliation tests across credit, market, liquidity, and operational risk. Two open MRAs from the prior FRB letter sit in the issue register, both touching risk data.

## Why this scenario matters

It is the canonical large-bank exam-readiness use of the skill. The horizontal-review trigger forces a full fourteen-principle pass with reconciliation evidence, not a desk-review. The MRA posture forces Principle 13 to read against named open findings rather than as a generic statement. The asset-size band brings 12 CFR Part 30 Appendix D into Principle 1 and Principle 2. Principle 6 (adaptability) carries the heaviest gap commentary, mirroring the BCBS thematic-finding pattern.

## Output sketch

```yaml
assessment_id: BCBS239-2026-FRB-HRZ-04
scope_id: ENG-2026-FRB-HRZ-04

scope:
  legal_entity_perimeter: [Bancorp, lead bank, broker-dealer subsidiary]
  supervisory_context: FRB
  supervisory_context_notes: FRB horizontal RDARR review; OCC Heightened Standards covered bank
  assessment_date: 2026-05-06
  prior_assessment_date: 2025-03-31
  prior_overall_rating: largely-compliant

methodology:
  lines_of_evidence:
    - document-review
    - system-tracing
    - reconciliation-test
    - interview
    - ad-hoc-aggregation-run
  interview_count: 22
  document_count: 86
  reconciliation_test_count: 4
  manual_workaround_inventory_status: captured
  ad_hoc_aggregation_evidence: recent-runs-evidenced

principles:
  - principle_number: 1
    principle_group: overarching
    principle_name: Governance
    rating: largely-compliant
    direction: stable
    evidence_summary: >
      Risk Data Council charter reviewed; CDO direct line to CRO confirmed;
      board-level data-quality reporting evidenced quarterly; named risk-data
      issues escalated through the issue register.
    gaps:
      - gap_id: P1-G1
        gap_description: >
          Board reporting on data-quality KPIs lacks trend commentary; the pack
          presents current-quarter values without comparison or root cause.
        severity: medium
        owner: Head of Risk Reporting
        linked_issue_id: null
        evidence_pointer: Q1-2026 Risk Committee pack, section 6.3
    recommended_actions:
      - action_description: >
          Add trend commentary and root-cause attribution to the quarterly
          board-level data-quality KPI block.
        owner: Head of Risk Reporting
        target_date: 2026-09-30

  - principle_number: 2
    principle_group: overarching
    principle_name: Data architecture and IT infrastructure
    rating: materially-non-compliant
    direction: stable
    evidence_summary: >
      Architecture diagrams reviewed; lineage spot-checked across credit and
      market risk; manual reconciliation between two market-risk source systems
      observed; lack of automated lineage from credit-loss data warehouse to
      regulatory-reporting layer evidenced.
    gaps:
      - gap_id: P2-G1
        gap_description: >
          Manual reconciliation between two market-risk source systems persists
          eighteen months after the consolidation roadmap was approved.
        severity: high
        owner: Head of Risk Data (CDO)
        linked_issue_id: MRA-2025-04
      - gap_id: P2-G2
        gap_description: >
          No automated data lineage from the credit-loss data warehouse to the
          regulatory-reporting layer; lineage is reconstructed manually each
          reporting cycle.
        severity: critical
        owner: Head of Risk Data (CDO)
        linked_issue_id: MRA-2025-07
    recommended_actions:
      - action_description: >
          Complete the market-risk source-system consolidation per the approved
          roadmap; eliminate the manual reconciliation step.
        owner: Head of Risk Data (CDO)
        target_date: 2027-03-31
        dependency_ids: [P2-G1]
      - action_description: >
          Stand up automated lineage from the credit-loss warehouse through to
          the FR Y-9C and FR Y-14 layers.
        owner: Head of Risk Data (CDO)
        target_date: 2027-06-30
        dependency_ids: [P2-G2]

  - principle_number: 3
    principle_group: aggregation
    principle_name: Accuracy and integrity
    rating: materially-non-compliant
    direction: stable
    evidence_summary: >
      Reconciliation tests run for credit, market, liquidity, and operational
      risk; manual workaround inventory complete with 47 entries; data-quality
      framework reviewed with severity-rated issue trend.
    gaps:
      - gap_id: P3-G1
        gap_description: >
          47 manual workarounds catalogued, of which 12 are critical-severity
          and have been outstanding for more than two reporting cycles.
        severity: high
        owner: Head of Risk Data (CDO)
    recommended_actions:
      - action_description: >
          Burn down the 12 critical-severity manual workarounds against a
          time-bound retirement plan with quarterly reporting to the Risk Data
          Council.
        owner: Head of Risk Data (CDO)
        target_date: 2026-12-31

  - principle_number: 6
    principle_group: aggregation
    principle_name: Adaptability
    rating: materially-non-compliant
    direction: improving
    evidence_summary: >
      Two ad-hoc stress aggregations run in the last six months; both delivered
      in five business days against a target of 48 hours; recent investment in
      the analytics layer is in flight but not yet evidenced through a delivery.
    gaps:
      - gap_id: P6-G1
        gap_description: >
          Ad-hoc and stress-scenario aggregations consistently exceed the
          48-hour target; current best-case is five business days.
        severity: critical
        owner: Head of Risk Data (CDO)
    recommended_actions:
      - action_description: >
          Deliver the in-flight analytics-layer investment to enable ad-hoc and
          stress-scenario aggregation within 48 hours; evidence with a dry run
          before sign-off.
        owner: Head of Risk Data (CDO)
        target_date: 2026-12-31

  # Principles 4, 5, 7-14 omitted from sketch for brevity; full assessment carries all 14.

aggregate_rating_per_group:
  - group: overarching
    rating: materially-non-compliant
    rationale: P2 critical gap drives the group rating.
  - group: aggregation
    rating: materially-non-compliant
    rationale: P3 and P6 critical gaps; P4 and P5 largely-compliant.
  - group: reporting
    rating: largely-compliant
    rationale: P7, P8, P11 largely-compliant; P9 and P10 compliant.
  - group: supervisory
    rating: largely-compliant
    rationale: P13 reflects two open MRAs; P12 and P14 stable.

overall_rating: materially-non-compliant

priority_gaps_top_5: [P2-G2, P6-G1, P2-G1, P3-G1, P1-G1]

linked_open_issues: [MRA-2025-04, MRA-2025-07]

confidence_label: high

human_review_required: true

sign_offs:
  - role: Head of Risk Reporting
    status: pending
  - role: Head of Risk Data (CDO)
    status: pending
  - role: CRO
    status: pending
  - role: Chief Internal Auditor
    status: pending

reviewer_questions:
  - >
    Are we comfortable that the P2-G2 lineage gap is paced for the FRB horizontal
    review window, given the linked MRA's existing target date?
  - >
    Should the P6-G1 dry run be witnessed by the OCC examination team given the
    overlap with the heightened-standards thematic?
  - >
    Does the manual-workaround burn-down plan need a Risk Committee escalation
    trigger if the critical-severity count does not fall below six by Q3?
```

## Why the assessment shape matters downstream

- The Top 5 priority gaps drive the remediation roadmap that goes to the data-management committee and the Risk Committee.
- `linked_open_issues` ties the Principle 13 rating to the named open MRAs, so the supervisor reads consistency between the FRB letter, the issue register, and this assessment.
- The `confidence_label: high` is supportable because the methodology block evidences multiple lines of evidence per principle in groups B and C; a thinner methodology would not support `high`.
- The structured record feeds the BCBS 239 data-confidence appendix in `risk-committee-pack` for the next cycle, so the committee pack carries a consistent posture statement.
