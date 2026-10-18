---
name: attestation-pack
description: |
  Drafts the periodic management attestation pack a senior officer takes into the certification meeting: scope statement, source criteria, control inventory, evidence index, exceptions with compensating-control narrative, prior-period remediation status, sub-certification chain, reviewer questions, assertion language, and sign-off block. Output is the named-section pack the attesting officer (CEO, CFO, CRO, CCO, CISO, BSA officer, head of internal audit, fund CCO, function head, process owner) and the named reviewers (legal, internal audit, external assessor, regulator) carry into the sign-off conversation.

  Best for:
  - Periodic management attestation underpinning a formal certification (SOX 404 process-owner sub-certification; SOC 1 / SOC 2 management assertion package; FFIEC self-assessment; vendor-management annual attestation; BCBS 239 risk-data attestation; fund CCO Rule 38a-1 annual report; BSA officer annual certification; cyber annual certification including NYDFS Form B; privacy annual report under the GLBA Safeguards Rule).
  - Refreshing the attestation pack ahead of an external-assessor field visit (SOC auditor, internal audit, regulator-engaged third-party).
  - Producing the attestation evidence binder for a regulator response that requires named-control-by-named-control evidence.
  - Standing up the first attestation pack for a new process or product where no prior pack exists.

  Not the right tool when:
  - The artifact is the underlying risk-control matrix (use `risk-compliance-core/skills/control-matrix`; this skill consumes it).
  - The artifact is the issue write-up for an exception identified during attestation (use `risk-compliance-core/skills/issue-writeup`).
  - The artifact is a single control test workpaper (use `compliance-testing/skills/workpaper-drafter`).
  - The artifact is a management response to a regulator finding (use `management-response`).
  - The work is the executive certification under the relevant securities-law sections; this skill produces the process-owner and function-head sub-certifications that ladder to the executive certification, which is securities-counsel-led and out of scope.
argument-hint: "[attestation type, attesting role, period, upstream control matrix pointer, prior-period pack, or scope statement]"
---

# Attestation pack

The pack is what a senior officer reaches for when the certification clock comes around: the scope, the criteria, the controls, the evidence, the exceptions, the prior-period roll-forward, the chain of sub-certifications laddering up, the questions the reviewer will ask, and the assertion text the officer signs. Audience is the attesting officer, the legal reviewer, the internal-audit relationship lead, the external assessor where one is engaged, and the regulator on request. This is a sworn assertion, not a procedural step; the pack reads accordingly.

The vocabulary is attestation, sub-certification, assertion, scope, criteria, evidence, exception, compensating control, carve-out, complementary user entity controls, sign-off. Findings that flow into the pack come from upstream control-matrix and control-test work; remediation that flows out runs through the issue log and the management-response chain.

The pack is a draft until the attesting officer signs and the named reviewer reviews. The skill stops at the draft.

## Ask first

Most of the spine is set by the attestation type and the attesting role. A few things settle before drafting:

- **Which attestation type**. SOX sub-certification, SOC management assertion, vendor-management, risk-data, fund CCO annual, BSA officer annual, cyber annual, privacy annual, FFIEC self-assessment. The type drives the assertion-language register, the source criteria, the sub-certification ladder, and the named reviewer set. The same skill produces all types; the first ask sets which one.
- **Where the attesting role sits in the sub-certification ladder**. Process-owner sub-certifications ladder up to function-head sub-certifications, which ladder up to executive certifications. This skill produces the lower layers; the executive certification is securities-counsel-led and out of scope. Confirm the layer before drafting.
- **What the assertion-language version is**. Firms maintain an assertion-language register; the pack carries the version that applies to the current period. If the source criteria have updated since the prior period (standard revisions, regulator amendments, policy changes), the version increments and the text reflects the change. Stale assertion language is a frequent finding.
- **Whether a SOC report is in evidence**. Where the attestation relies on a vendor SOC 2 Type II report, the user firm reviews carve-outs, identifies complementary user entity controls (CUECs), and provides CUEC-level evidence at the user firm. A SOC report alone is not evidence of the user firm's controls.
- **What the prior-period exceptions were and where they sit now**. Every prior-period exception carries a current-status row in the pack; items not remediated by the current attestation surface as current-period exceptions. The roll-forward is part of the workflow, not an afterthought.

When the scope record is supplied, the skill reads `institution.type`, `institution.primary_regulators`, `persona.role`, `attestation_type` (where the scope carries it), `sector_overlay_set`, `cross_cutting_overlay_set`, and `source_posture` from it. Otherwise the skill works with what the practitioner names and flags the rest.

## How the pack gets built

The pack has the same spine across attestation types, with depth and overlay-driven content flexing per the type. The order below is roughly how a senior practitioner walks it; in practice sections fill out as upstream artifacts arrive.

Start with the cover, the scope statement, and the source criteria. The scope statement names the precise boundary being attested: which processes, which systems, which legal entities, which time period. Vague scope is the most common defect; "the firm's vendor-management program" is not a scope statement. The source criteria name the framework or rule against which the attestation is made; multiple criteria may apply (a sector framework, a cross-cutting overlay, a firm policy) and each is named with its version.

The control inventory pulls from the upstream control matrix. One row per control, with owner role (not named individual), framework component, design effectiveness, operating effectiveness, linked evidence IDs, and linked exception IDs. Where a sector or cross-cutting overlay applies, the inventory organises by the framework component the overlay specifies (lifecycle stage for vendor-management; principle group for risk-data; functional categories for cyber). A control rated `not-tested` in the period is itself a sign-off question; surface it.

The evidence index is one row per piece of evidence. Description, evidence type, system of record, period covered, producer role, linked control IDs. "All evidence is in the SharePoint folder" does not satisfy the section. Where a vendor SOC report is cited, the index includes both the SOC report row and a CUEC-evidence row at the user firm for each complementary user entity control the report identifies.

The exceptions section names every control that did not operate as designed in the period or where evidence is insufficient. Each exception carries severity, the compensating-control narrative (named control, evidenced; not hand-waving), status, target remediation date, and the linked issue ID. A clean exceptions section in scope with material open issues elsewhere is a stated determination, not an absence; document the determination explicitly. Every exception that has a compensating control names a discrete control with its own evidence; "compensated by management oversight" without a named control fails the section.

The prior-period remediation status section carries every prior-period exception with a current-status row. Items not remediated by the current attestation date are reportable and surface as current-period exceptions; the prior-issue ID links to the current-period exception ID where the item rolls forward. Skipped roll-forward is a recurring defect.

The sub-certification chain section names the ladder. Roles received-from (the upstream sub-certifications consumed) and roles provides-to (the executive certification this pack supports). The chain is explicit because the pack's place in the ladder bounds what the assertion can claim; a process-owner pack does not assert the executive-level scope.

The reviewer-question list anticipates the questions the named reviewer (internal audit, external assessor, regulator) will surface. Five to ten questions, each tied to a specific exception, compensating control, source-criteria change, sub-certification chain item, or SOC-report reliance row. The list is for the reviewer to address before sign-off; it is not for the attesting officer to answer in the pack.

The assertion language is carried verbatim from the firm's assertion-language register, version flagged. Where exceptions exist, the qualification clause surfaces the carve-outs; the assertion text does not concealment a material exception. The version field reflects any year-over-year change in the source criteria.

The sign-off block names the attesting role, the witness role (where one is required by firm policy or by the assertion structure), the legal-review role, and the internal-audit relationship lead. Signature fields and dates are blank until signed; the pack does not assert sign-off.

The source trace is the appendix that maps every material claim to its evidence pointer with a confidence label. The confidence label reflects the strength of the evidence base, not the substantive control posture; `high` requires complete evidence-index coverage of in-scope controls.

### Sector overlays

Load only the overlay the scope names. Banking attestations carry the SOX 404 framework with COSO 2013, the Heightened Standards risk-governance-framework attestation linkage, the vendor-management attestation under the interagency third-party guidance, the BCBS 239 risk-data attestation, the regulatory-capital-reporting attestation chain, and the BSA officer annual certification. Insurance attestations carry the NAIC Model Audit Rule (Model #205) ICFR attestation and the ORSA management assertion (Model #505). Capital-markets attestations carry the fund CCO annual report under Rule 38a-1, the adviser CCO annual review under Rule 206(4)-7, the broker-dealer Rule 17a-5 annual report, and the FINRA Rule 3130 CEO certification chain. Payments-fintech attestations carry the PCI DSS Attestation of Compliance, the sponsor-bank-partnership attestation linkage, and the state money-transmitter and MSB attestation expectations.

The sector overlay is content that lands in the pack, not background reading. An insurance overlay loaded but no Model #205 mapping in the pack is the failure mode the troubleshooting file calls out.

### Cross-cutting overlays

Cyber overlay loads when cyber-control attestation is in scope (annual CISO certifications, NIST CSF-aligned program attestations, PCI DSS AOC, NAIC Model #668 for state-licensed insurers in adopting jurisdictions). Privacy overlay loads when the scoped process touches consumer financial information (GLBA Safeguards Rule annual report; state-privacy-law attestation linkages). Conduct overlay loads at firms with consumer-facing businesses (FINRA 3130 CEO certification, Reg BI attestation, fair-lending self-assessment, sales-practices and suitability attestations, UDAAP-program attestations). Each overlay names content that lands in the pack as control-inventory rows, evidence categories, exception types, and assertion-text elements.

## Quality bar

- Every material claim cites a source. Unsupported claims carry `[evidence needed]` and route to the engagement issue log, not silently into the pack.
- Evidence is separated from inference. The source-trace appendix shows the seam.
- Exceptions where they exist are named in the exceptions section and reflected as a carve-out in the assertion text. A clean attestation with material open issues elsewhere is the failure mode this skill is built to prevent.
- Compensating controls are named, discrete, and evidenced. Hand-waving narrative without a named control fails the section.
- Prior-period exceptions carry forward as current-period exceptions where not remediated; the roll-forward is enforced.
- Where a SOC report is in evidence, CUEC-level evidence at the user firm is included.
- The confidence label reflects evidence-base strength, not control posture; `high` requires complete evidence coverage.
- The pack is a draft until the attesting officer signs and the named reviewer reviews. The skill does not assert sign-off, distribute, or post to the certification system.

## Adaptation

Attestation type drives the assertion-language register, the sub-certification ladder, and the named reviewer set. Audience drives tone (process-owner sub-certification is technical; function-head sub-certification is wider; executive-facing material is challenge-shaped). Sector and cross-cutting overlays load from the scope. Where firm-specific certification framework, sub-certification ladder, named officer roles, assertion-language register, or policy-evidence taxonomy applies, it lives in `references/firm-overlay.md` (consumed when present) and never in the pack directly.

## Output

Default to drafting against `templates/default-output.md`. Render as Word, Excel, PowerPoint, or Markdown when the audience or workflow asks for it; the typical attestation pack rides as a Word memo with the control inventory in Excel for SOX, SSAE, or sub-certification cycles. Produce the structured record at `schemas/attestation-pack.schema.json` when downstream automation or a registered consumer needs it. The structured object reuses `control.schema.json` (from `risk-compliance-core`) for control-inventory rows and `issue.schema.json` (from `risk-compliance-core`) for exception linkage; this skill owns the wrapper.

Downstream consumers: the structured object feeds the firm's certification system of record, the external auditor work file, the `risk-committee-pack` issues section (where the attestation surfaces a material exception), and the `management-response` chain (where the attestation supports a sub-certification consumed by a response to a regulator finding). The schema is the cross-skill contract; additive changes only, never silent renames. Breaking changes ship as a versioned migration with the consumers told in advance.

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors.
- `references/sector-overlays/{banking,insurance,capital-markets,payments-fintech}.md` — sector overlays loaded from scope.
- `references/cross-cutting/{cyber,privacy,conduct}.md` — cross-cutting overlays loaded from scope.
- `references/firm-overlay.md` — firm-installed certification framework, sub-certification ladder, named officer roles, assertion-language register, policy-evidence taxonomy (consumed when present).
- `templates/default-output.md` — pack template with the named sections.
- `schemas/attestation-pack.schema.json` — structured-output contract.
- `examples/` — anonymised public-source-derived scenarios.
- `TROUBLESHOOTING.md` — recurring defects.
