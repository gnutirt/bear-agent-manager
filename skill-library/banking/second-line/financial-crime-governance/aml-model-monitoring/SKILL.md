---
name: aml-model-monitoring
description: |
  Reviews ongoing-monitoring evidence for an AML transaction-monitoring system, scoping which components of the stack sit inside the model-risk perimeter under the joint interagency model-risk supervisory guidance and which are deterministic rules outside it. Reads data quality, customer segmentation drift, scenario inventory and tuning evidence, below-the-line testing, alert volume and productivity trends, threshold-change governance, and validation evidence; produces a second-line monitoring memo that opens with a model-scoping read and a program-level review, carries the monitoring evidence in named structured sections, and closes with material findings, evidence-needed items, and recommended decision checkpoints with named owners. Does not approve scenario changes, set thresholds, sign off on validation conclusions, or QA individual SAR decisions.

  Best for:
  - Annual or quarterly second-line monitoring memo on a production AML transaction-monitoring system.
  - Pre-validation review scoping what the next validation cycle should cover.
  - Post-tuning review of a scenario or threshold change and the evidence chain supporting it.
  - Pre-exam-readiness review of monitoring documentation for the BSA/AML examination.

  Not the right tool when:
  - The work is the validation cycle itself; use `validation-plan` in `ai-governance-model-risk`.
  - The system is being intaked, tiered, or papered as a model card for the first time; use `ai-use-case-intake`, `ai-risk-tiering`, and `model-card-builder` in `ai-governance-model-risk`.
  - The work is QA over individual SAR decisions downstream of the alerts; use `sar-decision-qa`.
  - The work is sanctions-screening monitoring; use `sanctions-screening-qa`.
  - The decision being asked for is approval of a scenario change, a threshold change, or a validation conclusion. The skill produces review artifacts; humans decide.
argument-hint: "[monitoring evidence: scenario inventory, segmentation methodology and refresh artifacts, BTL workpapers, threshold-change log, alert and productivity data, last validation report]"
---

# AML model monitoring

A second-line monitoring memo is what the AML governance committee, the BSA officer, and the head of model risk read once a cycle to see whether the transaction-monitoring system is meeting design intent against the institution's risk profile. The work opens with a model-scoping read (which components of the stack sit inside the joint interagency model-risk supervisory guidance, which are deterministic rules outside it, which are GenAI or agentic-AI components that route to a different governance frame) and a program-level read framed off that scoping. It then walks the monitoring evidence in named structured sections: data quality, segmentation, scenarios and tuning, BTL, threshold-change governance, alert and productivity trends, validation. Findings tag to a named criterion; recommendations route to decision checkpoints with named owners. The skill produces the draft. The committee, the BSA officer, and the head of model risk decide on changes.

The output mixes shape on purpose. The opening program review is judgement-shaped prose because the program lens is what frames the rest; the evidence sections are structured-artifact tables because productivity figures, threshold-change records, and BTL posture should be read at a glance and compared cycle-over-cycle. The skill defines the artifact substance per `templates/default-output.md`; rendering goes to the `docx` skill in the `document-skills` plugin.

## Ask first

Before drafting, get plain answers to a few things. Defaults are fine when an answer is missing; flag the default in the memo.

- **What review type is this.** Annual, quarterly, pre-validation, post-tuning, or pre-exam-readiness. The review type drives what the memo weighs hardest. Annual reads breadth; pre-validation reads what the next validation should scope; post-tuning reads the change evidence chain; pre-exam reads documentation readiness through an examiner's eyes.
- **Who reads the memo.** AML governance committee reads for program-level decisions; the BSA officer reads for material defensibility issues and routing; head of model risk reads for model-risk discipline (validation, ongoing monitoring, effective challenge). Audience drives tone and depth.
- **What evidence is on file.** Scenario inventory, segmentation methodology and refresh artifacts, BTL workpapers, threshold-change governance log, alert and productivity data, last validation report, model inventory entry and tier. Where the evidence is partial, the memo names the gap rather than blocking; under-evidenced claims carry `[evidence needed]`.
- **What sector and cross-cutting overlays apply.** Banking, payments-fintech, capital-markets, or insurance — the typology surface and the segmentation expectations differ. Cyber overlay loads when the customer base or transaction history shows the typology surface (VASP-counterparty exposure, ATO loss history, BEC payouts) even if the scope did not flag it explicitly.

When the scope record is supplied, the skill consumes it for institution type, primary regulator, sector overlay, persona, and source posture. Otherwise it asks the practitioner the few facts it needs and defaults source posture to public-only with the absence flagged in the memo.

## How the monitoring memo gets built

The memo has the same spine across review types. A senior reviewer fills it in roughly in the order the evidence lands, but three parts of the order are load-bearing.

First, the model-scoping read sits ahead of everything else. The joint guidance defines a model as a complex quantitative method, system, or approach that applies statistical, economic, or financial theories to process input data into quantitative estimates; deterministic rule-based processes without statistical, economic, or financial theory are explicitly out of scope. AML transaction-monitoring stacks vary. A scenario library that uses statistical segmentation, machine-learned thresholds, network analytics, anomaly detection, or productivity-tuned scoring sits inside the model-risk perimeter and is reviewed against the joint guidance. A purely deterministic rules engine (fixed-threshold structuring detection, a hard-coded country-of-residence flag, a list-based velocity rule) is not a model under the guidance, even if the firm chooses to apply model-like discipline to it. The reviewer scopes which components of the stack are models, which are deterministic rules, and which are GenAI or agentic-AI components (the joint guidance excludes those at footnote 3; AI-system governance routes elsewhere — NIST AI RMF, NIST AI 600-1, ISO/IEC 42001, EU AI Act). Stating "AML monitoring is a model" without component-by-component scoping over-gates deterministic rules into a model-risk frame that does not bind them and under-gates GenAI components into a frame that excludes them. Get the scoping right first; the rest of the memo reads cleanly off it.

Second, the program review at section one is drafted before the evidence sections, not after. The model-risk frame established by the scoping read is what the rest of the memo reads against; without it the work lands as a rules-engine check and misses the discipline that the joint guidance carries on validation, ongoing monitoring, and effective challenge for the in-scope components. The program review states the scoping conclusion explicitly and names what the firm has elected to apply model-like discipline to even where the joint guidance does not bind it.

Third, the sector overlay is loaded before reading the evidence. Reading a payments-fintech system through a deposit-bank lens, or a broker-dealer system through either, misses the typology surface that matters. The scope names the sector overlay; if not, the practitioner is asked, and the assumption is recorded.

Beyond those two anchors the work is judgement-led. The reviewer walks the evidence in this shape.

The **model-scoping read** opens. One short section. What the system covers (products, channels, geographies). Component-by-component scoping: which components are models under the joint interagency guidance definition (statistical, economic, or financial theory producing quantitative estimates), which are deterministic rules outside the perimeter, which are GenAI or agentic-AI components that route to a different governance frame. The scoping conclusion shapes what the rest of the memo holds the firm to.

The **program review** follows. Three to five paragraphs of prose. The model-risk frame for the in-scope components; the load-bearing question for this review (design intent against risk profile / change evidence / next validation scope / documentation readiness); the regulator constellation and overlays in scope; material context the audience needs (open MRAs touching the system, prior-period validation themes, recent enforcement themes adjacent to the firm's typology surface). Generic regulatory language; specifics live in `references/source-anchors.md`.

The **scope, source posture, and engagement context** records the institution profile, primary regulators, overlays loaded, source posture, scope reference, and whether a firm overlay is consumed. A short table.

The **model identifier and inventory linkage** carries the model inventory ID, tier, owner, last validation date, last full tuning cycle, last segmentation refresh, and cross-references to the model card, the validation report, the change-governance log, and the BSA/AML risk assessment. Without these links the memo is read in isolation; with them, it sits inside the firm's model-risk evidence chain.

The **data quality posture** reads completeness, timeliness, integrity controls, and identifier stability. Outstanding multi-cycle data-quality issues read as governance gaps, not technical gaps. The structured table records each issue with the cycle it was first surfaced, the remediation owner, and the target date; a short narrative covers any issue outstanding more than two cycles.

The **customer segmentation** read covers methodology and last refresh date, drift indicators, and open issues. Drift is read on both axes — population per segment (count) and behaviour per segment (volume, velocity, counterparty mix, geography). Population stable while behaviour moved is its own signal. Refresh-cadence adherence is read against the firm's program cadence, not against an external default; missed cadence is a finding with the affected segments named.

The **scenario inventory and tuning evidence** carries each active scenario with typology, last-tuned date, tuning method summary, BTL posture, productivity metric (with denominator), SAR conversion (with denominator), and open issues. BTL posture reads as an explicit category — not-performed, performed-without-sample-size-or-signoff, or performed-with-sample-and-signoff — because "performed" as a binary is not enough. Productivity figures without denominator definitions carry `[evidence needed]` until the definition is on file. Coverage gaps against active typology advisories the firm's risk assessment named in scope are findings; the QA does not specify the new scenario, it surfaces the gap.

The **threshold-change governance** records each change in the window with effective date, approval evidence date, approver role, approver-independence documentation status, and post-change effect. Approval evidence post-dating the change effective date is the recurring failure mode and is recorded as an observation against the specific change with a programmatic remediation routed to the change-governance owner; the change itself is not unwound by the QA.

The **alert volume and productivity trends** carry total alert volume, per-scenario productivity, SAR conversion, false-positive rate, and auto-closure rate where applicable. Each metric carries its denominator definition. Productivity declines without documented tuning hypothesis are findings. Auto-closure-rate changes in payments populations are heightened-attention items; auto-closure rules without documented validation or BTL coverage of the auto-closed population are findings.

The **validation evidence** carries last validation date, validation scope, validator independence, open findings with severity and target dates, and any re-baselining since validation. The skill consumes validation evidence; it does not produce it. Scope creep into validation methodology is out of scope; hand off to the validation skill in the model-risk plugin.

The **material findings, recommended decision checkpoints, and source trace** close the memo. Each finding tags to a named criterion (the relevant supervisory guidance section in the source-anchors file, the FFIEC manual section, the firm's program), a severity, and an evidence pointer. Each checkpoint names the owner role and the condition that holds it open (what state must change before sign-off). The skill produces routing recommendations — threshold values, scenario design, segmentation cuts, validation conclusions, and SAR-side decisions are made by the named decisionmaker. Customer self-attestation, file evidence, firm policy, sector overlay, source-anchor citation, firm overlay, and generated inference each carry their own confidence label so the seams stay visible.

Depth flexes with audience and review type. A pre-exam-readiness memo reads long and formal because the next reader is an examiner; an internal annual review at a firm with a strong model-risk function reads tighter; a post-tuning review on a single scenario change is focused and short. Where the firm has installed `references/firm-overlay.md` (segmentation taxonomy, scenario inventory naming, change-governance procedure, refresh-cycle policy, named systems and owners), the skill consumes it; firm-specific facts never live in the SKILL.md body.

The non-negotiables: every material claim cites a source from the file, the sector overlay, `references/source-anchors.md`, or the firm overlay where present. Unsupported items carry `[evidence needed]`. Source evidence, customer / management self-attestation, public-source obligation, generated inference, and open compliance question stay distinguishable. No fabricated regulatory facts; unknown section references carry `[verify section]` in the source-anchors file, never in the memo body. No named institutions in narrative unless they are public defendants in a finalised enforcement action with a published consent order. The skill stops at draft; the named decisionmaker decides on changes.

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors.
- `references/sector-overlays/{banking,payments-fintech,capital-markets,insurance}.md` — sector overlays loaded per scope.
- `references/cross-cutting/cyber.md` — cyber-typology lens for monitoring scenario coverage; loaded when the scope flags cyber or when the typology evidence is on file.
- `references/cross-cutting/privacy.md` — privacy frame on the regulated personal data the monitoring stack consumes; loaded when the scope flags privacy and treated as default for any monitoring memo not at public-only source posture (NPI, FCRA-covered, third-party enrichment, vendor-derived, §314.4(f) service-provider data).
- `references/firm-overlay.md` — firm-installed taxonomy, change-governance procedure, refresh-cycle policy, named systems and owners; consumed when present.
- `templates/default-output.md` — content spec for the memo (named sections, structured tables for the evidence side).
- `examples/` — annual second-line monitoring memo at a mid-size US bank; post-tuning review of a structuring-scenario threshold change at a regional bank.
- `TROUBLESHOOTING.md` — recurring defects in monitoring-review work product.

## Output

The deliverable is a Word memo. Render via the `docx` skill in the `document-skills` plugin using the named sections from `templates/default-output.md`. The opening program review section is prose; the evidence sections are structured tables (data quality, segmentation drift indicators, scenario inventory, threshold-change log, alert and productivity trends, validation evidence, findings, recommended decision checkpoints, source trace). The AML governance committee, the BSA officer, and the head of model risk are the typical reviewers; routing of checkpoints flows to the named owners. Findings tagged to expected-activity-versus-monitoring-scope mismatch route back to `cdd-risk-review` for upstream context; findings touching SAR-decision quality route to `sar-decision-qa`; findings indicating re-tiering or re-validation need route to the model-risk plugin.
