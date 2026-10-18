# Example: G-SIB FBO self-assessment ahead of an ECB SREP review

## Input

A non-US G-SIB with significant US operations under FRB Y-7 reporting and an SSM-supervised EU subsidiary. The ECB has flagged risk data aggregation as a thematic SREP focus for the cycle. The engagement is run by the group CRO function with the EU-subsidiary head of risk reporting embedded. Source posture is `public-plus-firm-policy-plus-evidence`. The prior-year self-assessment carried an overall `largely-compliant` rating; the current cycle needs to address the ECB Guide on effective risk data aggregation and risk reporting (May 2024) incremental expectations distinct from the BCBS 239 baseline. Climate reporting reaches the EU subsidiary's management board, so climate-data lineage is in scope under Principles 3 and 6.

## Why this scenario matters

It exercises the cross-border supervisory lens. Principle 14 (home/host cooperation) carries weight that a single-jurisdiction self-assessment never does. The ECB Guide overlay is distinguished from the BCBS 239 baseline in the per-principle blocks so the firm can read the same assessment from either supervisor's lens. The cross-cutting climate overlay loads, and the climate-data lineage finding lands inside the Principle 3 and Principle 6 blocks rather than in a separate appendix. A new gap surfaces under Principle 11 (distribution controls on the EU subsidiary's risk pack) that the prior-year assessment had missed.

## Output sketch

```yaml
assessment_id: BCBS239-2026-ECB-SREP-02
scope_id: ENG-2026-ECB-SREP-02

scope:
  legal_entity_perimeter:
    - Group HoldCo (home jurisdiction)
    - US IHC (FRB Y-7 reporter)
    - EU Subsidiary (SSM-supervised)
  supervisory_context: multi-jurisdiction
  supervisory_context_notes: ECB SREP thematic on RDARR; FRB consolidated supervision; home supervisor as lead
  assessment_date: 2026-05-06
  prior_assessment_date: 2025-04-15
  prior_overall_rating: largely-compliant

methodology:
  lines_of_evidence:
    - document-review
    - system-tracing
    - reconciliation-test
    - interview
    - ad-hoc-aggregation-run
  interview_count: 31
  document_count: 124
  reconciliation_test_count: 6
  manual_workaround_inventory_status: captured
  ad_hoc_aggregation_evidence: recent-runs-evidenced

principles:
  - principle_number: 1
    principle_group: overarching
    principle_name: Governance
    rating: largely-compliant
    direction: improving
    evidence_summary: >
      Group Risk Data Council reviewed; charters of US IHC and EU subsidiary
      data councils reviewed; CDO direct line to group CRO confirmed at all
      three entities.
    ecb_overlay_delta: >
      ECB Guide expects an explicit data-quality-management framework reviewed
      annually by the management body; EU subsidiary framework was last
      reviewed thirteen months ago.
    per_entity_ratings:
      - legal_entity: Group HoldCo
        rating: largely-compliant
      - legal_entity: US IHC
        rating: largely-compliant
      - legal_entity: EU Subsidiary
        rating: largely-compliant
        rationale: >
          ECB Guide expectation on annual management-body review of the data-
          quality-management framework is currently overdue but has a near-term
          remediation date.
    gaps:
      - gap_id: P1-G1
        gap_description: >
          EU subsidiary's data-quality-management framework annual management-
          body review is overdue by one month against the ECB Guide expectation.
        severity: medium
        owner: EU Subsidiary Head of Risk Reporting
    recommended_actions:
      - action_description: >
          Schedule the EU subsidiary management-body review of the data-quality-
          management framework before the SREP submission.
        owner: EU Subsidiary Head of Risk Reporting
        target_date: 2026-06-30

  - principle_number: 3
    principle_group: aggregation
    principle_name: Accuracy and integrity
    rating: largely-compliant
    direction: stable
    evidence_summary: >
      Reconciliation tests across credit, market, liquidity, and operational
      risk evidenced; manual workaround inventory captured (29 entries);
      climate-data lineage reviewed, including vendor-supplied scenario data
      and sustainability-provider feeds.
    ecb_overlay_delta: >
      ECB Guide raises expectations on data-quality measurement and reporting
      to the management body; the firm's data-quality KPI set is current but
      the threshold framework is being refreshed against the ECB expectation.
    gaps:
      - gap_id: P3-G1
        gap_description: >
          Climate-data lineage from vendor-supplied scenario provider through
          to the EU subsidiary's climate stress aggregation is documented but
          not reconciliation-tested; vendor refresh cadence is unverified
          against the firm's quarterly stress cycle.
        severity: high
        owner: EU Subsidiary Head of Risk Data
    recommended_actions:
      - action_description: >
          Add a quarterly reconciliation test for climate-scenario vendor data
          aligned to the climate stress cycle; verify vendor refresh cadence
          before each cycle close.
        owner: EU Subsidiary Head of Risk Data
        target_date: 2026-12-31

  - principle_number: 6
    principle_group: aggregation
    principle_name: Adaptability
    rating: largely-compliant
    direction: improving
    evidence_summary: >
      Three ad-hoc stress aggregations run in the last six months; group-level
      runs delivered within 48 hours; EU-subsidiary runs delivered within 72
      hours; climate-stress run delivered within five business days.
    ecb_overlay_delta: >
      ECB Guide highlights climate-stress adaptability; the EU subsidiary's
      climate-stress timeframe sits behind the BCBS expectation and is the
      explicit ECB Guide finding.
    gaps:
      - gap_id: P6-G1
        gap_description: >
          Climate-stress aggregation timeframe (five business days) lags the
          general-stress timeframe; ECB Guide flags this for SSM-supervised
          entities.
        severity: high
        owner: EU Subsidiary Head of Risk Data
    recommended_actions:
      - action_description: >
          Reduce climate-stress aggregation timeframe to 48 hours through
          analytics-layer investment already approved at group level; deliver
          before the next ECB climate-stress exercise.
        owner: EU Subsidiary Head of Risk Data
        target_date: 2027-03-31

  - principle_number: 11
    principle_group: reporting
    principle_name: Distribution
    rating: materially-non-compliant
    direction: deteriorating
    evidence_summary: >
      Distribution-list controls reviewed; classification labelling sampled
      across three risk-pack cycles; redaction protocols evidenced for the
      group risk pack but not for the EU subsidiary risk pack.
    ecb_overlay_delta: >
      ECB Guide expects controlled distribution of risk reports including
      classification and need-to-know enforcement; EU subsidiary distribution
      practice falls short.
    per_entity_ratings:
      - legal_entity: Group HoldCo
        rating: largely-compliant
      - legal_entity: US IHC
        rating: largely-compliant
      - legal_entity: EU Subsidiary
        rating: materially-non-compliant
        rationale: >
          EU subsidiary risk pack was distributed beyond the SSM perimeter
          without classification controls in two of the last three cycles.
    gaps:
      - gap_id: P11-G1
        gap_description: >
          EU subsidiary risk pack distributed beyond the SSM perimeter without
          classification labelling in two of the last three quarterly cycles.
        severity: critical
        owner: EU Subsidiary Head of Risk Reporting
    recommended_actions:
      - action_description: >
          Apply classification labelling and need-to-know distribution controls
          to the EU subsidiary risk pack; remediate the two prior-cycle
          breaches with a documented retrospective analysis.
        owner: EU Subsidiary Head of Risk Reporting
        target_date: 2026-08-31

  - principle_number: 14
    principle_group: supervisory
    principle_name: Home/host cooperation
    rating: largely-compliant
    direction: stable
    evidence_summary: >
      Home/host data-sharing protocol reviewed; supervisory college submission
      for prior cycle reviewed; FRB Y-7 reporting and ECB SREP submission
      timelines deconflicted; cross-border issue-escalation path documented.
    ecb_overlay_delta: >
      ECB Guide stresses the supervisory-college role; the firm's protocol is
      consistent with the expectation.
    gaps: []
    recommended_actions: []

  # Principles 2, 4, 5, 7-10, 12, 13 omitted from sketch for brevity.

aggregate_rating_per_group:
  - group: overarching
    rating: largely-compliant
    rationale: ECB Guide annual-review delta on the EU subsidiary; otherwise stable.
  - group: aggregation
    rating: largely-compliant
    rationale: P3 climate-data finding and P6 climate-stress timeframe gap; otherwise stable.
  - group: reporting
    rating: materially-non-compliant
    rationale: P11 EU subsidiary distribution finding drives the group rating.
  - group: supervisory
    rating: largely-compliant
    rationale: P13 reflects no open MRAs at SSM; P14 stable.

overall_rating: largely-compliant

priority_gaps_top_5: [P11-G1, P3-G1, P6-G1, P1-G1]

linked_open_issues: []

cross_cutting_overlays_applied: [climate]

confidence_label: medium

human_review_required: true

sign_offs:
  - role: EU Subsidiary Head of Risk Reporting
    status: pending
  - role: EU Subsidiary Head of Risk Data
    status: pending
  - role: Group Head of Risk Reporting
    status: pending
  - role: Group CRO
    status: pending

reviewer_questions:
  - >
    Should the EU subsidiary's P11 finding be reported to the SSM ahead of the
    SREP submission as a self-disclosed issue, or surfaced through the
    submission?
  - >
    Does the climate-data reconciliation test under P3-G1 need to be coordinated
    with the model-validation team given the scenario-vendor model dependency?
  - >
    The confidence label is medium because some EU-subsidiary evidence is
    pending translation; should the assessment be re-rated to high after
    translation completes?
```

## Why the assessment shape matters downstream

- The ECB Guide overlay deltas are written into the per-principle blocks rather than as a separate appendix, so the SSM reviewer sees the SSM-relevant findings inside the principle they apply to.
- The per-entity rating array surfaces the EU-subsidiary-specific finding under Principle 11 without forcing the group rating down.
- The climate cross-cutting overlay is recorded in `cross_cutting_overlays_applied`, so downstream consumers (risk-committee-pack, the SREP submission file) inherit the overlay flag.
- The `confidence_label: medium` reflects the methodology constraint (pending translations); it is not a finding-driven rating, and the reviewer question makes the path to `high` explicit.
