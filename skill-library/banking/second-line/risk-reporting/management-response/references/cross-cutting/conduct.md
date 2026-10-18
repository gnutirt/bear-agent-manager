# Conduct cross-cutting overlay for management-response

When the scope record flags `conduct` for a management-response engagement, this overlay sets conduct-specific evidence-of-effectiveness expectations and the customer-remediation strand for findings touching customer-conduct controls, fair-lending controls, retail-investor-protection controls, and unfair-deceptive-acts-or-practices.

Loaded by: `management-response/SKILL.md` when `scope.cross_cutting_overlay_set` includes `conduct`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- CFPB UDAAP authority under sections 1031 and 1036 of the Consumer Financial Protection Act (12 USC §§5531, 5536) and supervisory framework under 12 CFR Part 1090 (larger participants in defined markets) and the agency's general supervisory authority.
- Equal Credit Opportunity Act (Regulation B, 12 CFR Part 1002) and Fair Housing Act for fair-lending findings.
- Truth in Lending Act (Regulation Z, 12 CFR Part 1026), Real Estate Settlement Procedures Act (Regulation X, 12 CFR Part 1024), Fair Credit Reporting Act (Regulation V, 12 CFR Part 1022) and other consumer-protection regulations frequently cited in CFPB and federal banking agency conduct findings.
- FINRA Rule 2010 (Standards of Commercial Honor and Principles of Trade), FINRA Rule 2111 (Suitability), FINRA Rule 2210 (Communications with the Public), and SEC Regulation Best Interest (17 CFR §240.15l-1) for retail-investor-protection findings.
- State unfair-deceptive-acts-and-practices statutes (50-state landscape) and state attorney-general enforcement frameworks.
- FTC Act §5 (15 USC §45) authority for unfair or deceptive acts or practices, where the firm is in scope of FTC jurisdiction.

## What changes for conduct-flagged management responses

### 1. Customer-remediation strand

Conduct findings frequently turn on remediation the firm owes affected customers in addition to control redesign. The response carries the customer-remediation strand alongside the control strand:

- **Affected-population identification methodology** — how the firm identifies customers affected by the conduct (lookback period, criteria for inclusion, sampling vs full-population review, source-system queries used).
- **Restitution methodology** — what remediation is owed (refund of fees, interest adjustments, account-status corrections, credit-bureau corrections, reinstatement of products or services improperly denied or terminated).
- **Restitution delivery** — how restitution is delivered (account credit, check, electronic transfer, third-party administrator), the consumer-notice form, the timeline for completion.
- **Customer-remediation reporting** — how the firm reports completion to the supervisor, separately from control-redesign reporting; commonly periodic restitution-status reports with completion percentage and exception cases.

A conduct response with no customer-remediation strand on a finding where customers were affected reads as a defense of the control without acknowledgement of the harm; the supervisor will surface this gap.

### 2. Evidence-of-effectiveness expectations

Conduct findings turn on whether the consumer-protection gap has been closed in customer outcomes, not just whether the policy or control was updated. The evidence-of-effectiveness plan section must distinguish:

- **Control-completion evidence** — the consumer-protection control is updated, training is delivered, attestations are collected.
- **Customer-outcome evidence** — the consumer-protection gap is closed in customer experience (complaint volume on the affected practice has reduced; outcome-testing or fair-lending statistical analysis shows the disparate impact has been addressed; mystery-shopping or sample testing shows the customer-facing process operates as designed).

The evidence-of-effectiveness method commonly used for conduct findings:

- **KRI trend** — two consecutive periods of GREEN on the relevant conduct KRI (complaint volume on the affected practice, fair-lending disparity ratio, suitability exception rate, communications-review exception rate).
- **Control test** — outcome testing or transactional sampling, with documented evidence of the consumer-facing process operating as designed and consumer harm not recurring.
- **External validation** — third-party review (commonly used for fair-lending findings where statistical analysis is required, or for consumer-product-design findings where independent assessment of the customer experience is appropriate).

### 3. Fair-lending and disparate-impact analysis

For fair-lending findings (Regulation B, Fair Housing Act) and findings touching disparate-impact analysis, the response references:

- The firm's fair-lending statistical analysis methodology and any change committed.
- The protected-class analysis approach (race, ethnicity, sex, age, marital status, recipient of public assistance, exercise of consumer-protection rights).
- The remediation methodology where statistical analysis identified disparate impact or disparate treatment.
- The ongoing-monitoring approach post-remediation, typically including periodic statistical re-runs and exception-handling.

### 4. Retail-investor-protection findings

For broker-dealer and investment-adviser findings on retail-investor protection (Regulation Best Interest, FINRA suitability rules, FINRA communications rules), the response references:

- Whether the finding affects the firm's Form CRS disclosures (Reg BI requires Form CRS for retail customers).
- Whether the finding affects the firm's care-obligation, disclosure-obligation, conflict-of-interest-obligation, or compliance-obligation under Reg BI.
- For FINRA suitability findings, whether the finding affects the reasonable-basis, customer-specific, or quantitative suitability obligations.

### 5. Linkage to public-disclosure obligations

Conduct findings can give rise to public-disclosure obligations on the public-company parent (e.g., Form 10-K Item 103 legal proceedings; Form 8-K Item 8.01 other events; potential restatement implications where the finding affects financial-statement assertions). The response cross-links to the disclosure committee where applicable; the response does not make the disclosure decision.

### 6. Cross-link to other capability skills

- Underlying issue write-up: `risk-compliance-core/skills/issue-writeup`.
- Standing committee pack: `risk-reporting/skills/risk-committee-pack` (issues-and-remediation-status section; conduct heat-map cell where the firm separately reports conduct).
- Privacy overlay where consumer-data handling is also implicated: `references/cross-cutting/privacy.md`.

## Conduct-specific output additions

Added to the response (mapped to schema where present):

- `interim_mitigation` — conduct responses commonly carry the suspension of the affected practice as interim mitigation (e.g., "fee charge suspended pending remediation"; "product offering paused for affected segment"); the suspension is named with start date and sunset condition.
- `action_plan_milestones[]` — conduct responses commonly carry both control-redesign milestones and customer-remediation milestones; the schema accommodates both.
- `evidence_of_effectiveness_plan.evidence_method` — for conduct findings, commonly KRI-trend (complaint volume, exception rate) or control-test (outcome testing, transactional sampling).
- `linked_finding_ids` — conduct responses commonly cross-link to other consumer-protection findings sharing root cause (e.g., a customer-onboarding-system gap surfacing across multiple consumer-product findings).

## Common pitfalls in conduct-flagged management responses

- Customer-remediation strand omitted on findings where customers were affected. The response must carry both strands; defense of the control without acknowledgement of harm reads poorly to consumer-protection supervisors.
- Affected-population identification methodology missing or unclear. The supervisor reads for whether the firm has identified the right population; vague language ("affected customers will be remediated") does not carry the response.
- Restitution methodology vague ("appropriate remediation will be provided"). The methodology must name what remediation is owed, how it is calculated, and how it is delivered.
- Evidence-of-effectiveness method limited to "training and policy updates". Conduct findings turn on customer outcomes; the evidence plan must address whether the customer experience has actually changed.
- Fair-lending statistical analysis methodology missing on Regulation B / Fair Housing Act findings. The response must reference the analytical methodology, not just the procedural change.
- Reg BI / FINRA suitability linkage missing on retail-investor-protection findings. The specific obligation should be named.
- Public-disclosure linkage missing on conduct findings with disclosure implications. The response cross-links to the disclosure committee referral status.
