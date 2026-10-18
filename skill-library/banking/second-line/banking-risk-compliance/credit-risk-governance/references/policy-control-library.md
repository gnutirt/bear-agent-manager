# Public-source-informed policy, risk, and control library

This library gives reusable policy sections, risks, controls, and evidence expectations derived from public financial-services regulatory and standards sources. It is deliberately generic and anonymous. Replace labels, thresholds, owners, and approval routes with firm-specific standards before production use.

## Common policy sections

| Policy section | Minimum content | Source anchors |
|---|---|---|
| AI use-case intake and inventory | Purpose, owner, users, data categories, system type, vendor or internal build, impacted customers, autonomy level, decision impact, approval status, monitoring plan | NIST AI RMF, ISO/IEC 42001, EU AI Act |
| Model and AI risk tiering | Risk-based criteria tied to customer impact, financial statement impact, regulatory reporting impact, model complexity, data sensitivity, vendor dependence, explainability, and autonomy | OCC 2026 MRM guidance, NIST AI RMF |
| Human oversight | Approval gates for high-impact outputs, limits on autonomous customer-impacting decisions, documented reviewer accountability, exception escalation | EU AI Act, NIST AI RMF, ISO/IEC 42001 |
| Third-party lifecycle | Planning, due diligence and selection, contract negotiation, ongoing monitoring, termination and exit | U.S. interagency TPRM guidance, DORA |
| ICT third-party register | Contractual arrangement, ICT service type, supported function, critical or important function flag, data location, subcontractors, entity/provider identifiers, ownership and review status | DORA register of information materials |
| Control testing | Test objective, population, sampling approach, evidence request, procedure, exception classification, issue rating, remediation owner | Public audit and supervisory examination practice, risk-based supervision guidance |
| Risk reporting | Data ownership, aggregation controls, completeness and accuracy checks, timeliness, adaptability, KRI threshold governance, board and committee commentary | BCBS 239 |
| Cyber disclosure readiness | Incident intake, materiality assessment workflow, disclosure committee involvement, evidence log, legal review, board notification, non-technical executive summary | SEC cybersecurity disclosure guide |
| CDD and suspicious activity governance | Customer risk profile, ongoing monitoring, beneficial ownership, enhanced due diligence, SAR decision documentation, confidentiality | FFIEC BSA/AML manual, 31 CFR 1010.230 |
| Small business lending data controls | Covered application identification, data-point completeness, protected demographic information firewall, recordkeeping, submission readiness | CFPB Section 1071 and Regulation B section 1002.107 |

## Baseline risk taxonomy

| Risk ID | Risk | Typical trigger | Example control objective | Evidence examples |
|---|---|---|---|---|
| R-AI-01 | AI use case bypasses governance | Business uses AI tool before intake approval | All AI use cases are recorded, risk-tiered, approved, and monitored before production use | Intake log, approval memo, inventory export, monitoring record |
| R-AI-02 | AI or model output causes customer harm | Credit, insurance, collections, fraud, or servicing decision is materially influenced | High-impact AI outputs have documented testing, explainability, human oversight, and appeal/escalation paths | Model card, validation memo, override log, customer-impact assessment |
| R-AI-03 | Agentic workflow exceeds permission boundary | AI agent can call tools, write records, send messages, or trigger actions without approval | Agent tools are least-privilege, logged, and gated for irreversible actions | Tool permission matrix, audit logs, approval queue, exception review |
| R-TPRM-01 | Critical third-party lacks lifecycle governance | New ICT or fintech relationship without due diligence or exit plan | Critical arrangements are assessed before onboarding and monitored through termination | Due diligence pack, contract checklist, monitoring scorecard, exit plan |
| R-DORA-01 | ICT register is incomplete or inconsistent | Missing subcontractor, function, LEI/EUID, or criticality fields | ICT arrangements are maintained in a complete, reconciled register | Register export, data-quality checks, owner attestation |
| R-CTRL-01 | Control evidence cannot support conclusion | Workpaper relies on narrative without source evidence | Control tests cite inspectable evidence and distinguish design from operating effectiveness | Evidence index, sample list, screenshots, system report, reviewer notes |
| R-RPT-01 | Risk report is incomplete, inaccurate, or late | Manual KRI collection, inconsistent metric definitions, stale data | Risk reports have owner-approved definitions, lineage, completeness checks, and threshold governance | KRI dictionary, data lineage, report tie-out, threshold approvals |
| R-CYB-01 | Cyber incident disclosure process is delayed or incomplete | Materiality determination not escalated or documented promptly | Incident governance supports timely materiality assessment and disclosure readiness | Incident timeline, disclosure committee minutes, legal review record |
| R-FC-01 | Customer risk profile is stale or unsupported | Material customer activity change without refresh | Customer risk profiles are maintained using risk-based CDD and ongoing monitoring | CDD file, refresh evidence, monitoring alerts, beneficial ownership certification |
| R-FL-01 | Protected data is mishandled in lending process | Protected demographic data visible to credit decision makers | Protected demographic data is collected, stored, and accessed according to firewall requirements | Access control report, training record, data collection form, exception log |

## Baseline control pattern

Use this pattern when drafting controls:

```yaml
control_id: C-[domain]-[number]
risk_id: R-[domain]-[number]
control_objective: "What must be true to reduce the risk."
control_activity: "Who does what, how often, using what system or evidence."
frequency: "event-based | daily | monthly | quarterly | annual"
owner: "named role, not a person"
evidence:
  - "source system report or file"
  - "review sign-off"
  - "exception log"
test_method: "inspection, reperformance, data-analysis, walkthrough, or hybrid"
pass_criteria: "observable condition for pass"
fail_criteria: "observable condition for fail"
human_review_required: true
```

## Human-review gates

Always surface for human review when the output could be used to approve, file, reject, rate, notify, remediate, or bind the institution. Agent outputs are drafts for qualified professionals.
