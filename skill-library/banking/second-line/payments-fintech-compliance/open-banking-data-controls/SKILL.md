---
name: open-banking-data-controls
description: |
  Drafts a controls inventory and self-evidence pack for consumer-permissioned data sharing under the named US personal-financial-data-rights frame. The pack covers data-provider duties (covered-data scope, developer-interface availability and security, consumer authorisation, scope and duration limits, revocation propagation, third-party screening) and data-recipient duties (consumer authorisation, collection and use limits, retention, deletion-on-revocation, reauthorisation, downstream sharing). The artifact aligns to industry-standard tokenised data-sharing patterns and to the migration off credential-based screen scraping. Audience is the data-provider fintech, the data-recipient fintech (account aggregator, PFM, lender, BNPL, payroll-on-demand), or the sponsor-bank programme acting as either, plus the second-line or advisory team supporting them.

  Best for:
  - A data-provider fintech (or its sponsor bank's programme) is preparing for an implementation-tier milestone, an examiner data request, or a sponsor-bank-led review of the developer interface and authorisation stack.
  - A data-recipient fintech is preparing its consumer-authorisation, scope, retention, and reauthorisation controls for second-line review.
  - A programme is migrating an aggregator integration from credential-based screen scraping to API-tokenised access and needs the side-by-side controls comparison and gap close-out plan.
  - An incoming due-diligence or contract-cycle review involves an aggregator or developer-interface partner and the team needs the data-rights-aligned controls and evidence list.

  Not the right tool when:
  - The work is a generic vendor due-diligence pack (use `third-party-operational-resilience/vendor-diligence` with the payments-fintech overlay).
  - The work is a fintech-side controls inventory across all rails (use `fintech-partner-controls`).
  - The work is an incident review where data was disclosed without authorisation (use `payment-operations-incident-review`).
  - The work is a Safeguards-only review without the personal-financial-data-rights frame in scope (use the Safeguards-side capability skills).
argument-hint: "[firm role, programme reference, integration set, source posture, audience]"
---

# Open banking data controls

The pack is what a programme-operator second line, a sponsor-bank TPRM team, an internal auditor, or an examiner reaches for when consumer-permissioned data sharing is in scope. The artifact has named sections (programme summary, current-state regulatory frame, data-provider scope, developer-interface posture, authorisation and revocation controls, data-recipient screening, data-recipient duties, screen-scraping migration, cyber controls on the data flow, privacy controls, vendor and fourth-party register, self-evidence index, gaps, recommended disposition) and a structured record. The audience is the head of payments compliance, the privacy officer, the head of TPRM, the chief information security officer, sponsor-bank programme management, and on the advisory side the second-line lead or the regulatory practice partner.

This is a data-rights controls artifact, not a generic vendor-diligence pack and not a Safeguards-only security review. The vocabulary is covered data, developer interface, consumer authorisation, scope and duration, revocation, reauthorisation, secondary use, retention and deletion, data-recipient certification, tokenised access, screen-scraping deprecation, FDX-aligned message structure, FAPI / authorisation-server posture. The artifact carries a `s1033_status_note` block as a structured field (firm role, implementation-tier date, current docket status as of the analysis date) so downstream consumers reading this record into a vendor-diligence pack, an incident review, or a privacy review pick up the same status framing without re-deriving it.

The pack is a draft. The named approver — head of payments compliance, privacy officer, head of TPRM, sponsor-bank programme management, advisory practice partner — decides.

## Ask first

Most of the spine is set by the firm's role and the integration set. A few things settle before drafting.

- **Firm role under the data-rights frame.** Data provider, data recipient, or both. The duty set is different on each side; mixing them is the most-frequent rework cause. Both-sides firms produce two parallel control families with the same status-note block.
- **Integration set in scope.** Direct API to a named aggregator, sponsor-bank developer-portal vendor, downstream data recipients consuming the firm's feed, legacy screen-scraping integrations awaiting deprecation. Each one carries its own evidence asks and its own migration posture.
- **Source posture for the controls inventory.** Public-only, public-plus-firm-policy, public-plus-firm-policy-plus-evidence, or connector-aware (system-of-record access for token-issuance logs, consent-store audit trail, deletion-job records). Source posture sets which control rows the pack can claim with evidence and which read as `[evidence needed]`.
- **Audience and engagement type.** Sponsor-bank annual review, internal-audit retrospective, examiner data request, vendor-diligence-cycle review, pre-implementation-tier readiness sprint. Audience drives length and tone, not content; the named sections stay.
- **Implementation-tier posture for the firm.** The data-rights frame phases compliance dates by data-provider asset size, and the docket has been active. The pack carries a status-note block keyed to the firm's tier as of the analysis date; the date-stamp on that note is load-bearing.

When `scope` (per `risk-compliance-core/scoping`) is supplied, the skill consumes it (`institution.type`, `institution.primary_regulators`, `sector_overlay_set`, `cross_cutting_overlay_set`, `persona.role`, `source_posture`). When it is not, the skill asks the questions above and defaults to public posture if the practitioner declines. Note in the artifact that scope was not formalised.

## How the pack gets built

The pack has the same spine across firm roles and integration types. A senior reviewer walks it roughly in the order the controls inventory comes together, not in lockstep. Cite a source from `references/source-anchors.md` (or a loaded overlay) by file path for every material claim; mark unsupported items `[evidence needed]` rather than letting them pass.

The **programme summary** is one paragraph naming the firm role (data provider / data recipient / both), the products and consumer base in scope, and the partner aggregators or developer-interface vendors integrated. Sponsor-bank-mediated programmes name the bank and the programme name; advisory engagements name the scope record.

The **current-state regulatory frame** is the section that does not soft-state. It names the personal-financial-data-rights final rule as of the analysis date, the firm's implementation tier with date, the current docket status (litigation, stays, compliance-date relief), and any active CFPB or state guidance overlays. The `s1033_status_note` field carries this as a structured block (`effective_date`, `firm_implementation_tier`, `litigation_status_as_of`, `notes`) and the same content repeats in the source-citations footer. Any downstream artifact consuming this record propagates the same block; the rule's docket has been active since finalisation, and date-stamping the verification is the operative discipline.

The **data-provider scope** block carries the covered-data inventory (one row per data element, with in-scope flag, source system, owner), the in-scope account types (consumer asset accounts under the consumer-EFT regime, credit cards under the credit-card regime, prepaid accounts, payment products), and the out-of-scope items with rationale. Categorical "covered data" answers without checking the rule's specific list against the firm's account scope are wrong; the rule's coverage is more granular than a single sentence.

The **developer-interface posture** block carries availability, performance, and security for the covered-data interface, the documentation and sandbox posture, the conformance-testing record, the third-party developer-portal vendor's role if applicable, and the prohibition on charging consumers or authorised third parties for access. Per-consumer scope enforcement (the interface returns only what the consumer authorised, not the full data envelope) is a frequent gap; the row carries the evidence link.

The **authorisation, scope, duration, revocation** block walks the consumer-facing flows end-to-end. Consent capture and content (what was disclosed, what was not), scope-narrowing (the interface enforces only-what-was-authorised at runtime), duration limits with the named reauthorisation cadence, and revocation propagation (consumer revokes; the data provider stops; the data recipient stops; deletion runs; the audit trail records each step). Authorisation language drafted as marketing copy is a finding; examiners read the scope-language vs the actual flow side by side.

The **data-recipient screening and onboarding** block carries the third-party authorisation conditions the data provider applies to recipients (the rule places duties on the recipient, but the provider retains screening and ongoing-monitoring obligations), the certifications collected, and the ongoing monitoring tied back to the firm's TPRM lifecycle. This block lives at the data-provider side; the recipient-side equivalent is in the data-recipient duties block below.

The **data-recipient duties** block fires where the firm acts as a data recipient. Collection limits, use limits, secondary-use posture, retention schedule, deletion-on-revocation path (operational, not just contractual), reauthorisation cadence, and downstream sharing with notice. A common failure mode: documenting the contractual baseline without evidencing the operational deletion job. The block records both, and reconciles the contractual against the operational.

The **screen-scraping migration plan** block fires where legacy credential-based integrations are still in production. The block names the credential-storage inventory (where the credentials sit, encryption posture, vault rotation cadence), the deprecation roadmap (named providers, target dates, status), the fallback posture during the migration window, the customer-impact assessment (re-onboarding, broken connections, fee implications), and the sponsor-bank coordination posture. Treating screen scraping as fine because it has been in production for years is a common failure; the migration plan is the artifact's centre of gravity, not a footnote.

The **cyber controls on the data flow** block carries encryption in transit and at rest, key management and rotation, token lifecycle (issuance, scope, revocation, expiry), authentication assurance level for the consumer-facing flow and the recipient-facing flow, monitoring and incident detection on the developer interface, and the breach-response chain to the consumer and the sponsor bank. The cross-cutting cyber overlay (`references/cross-cutting/cyber.md`) carries the parallel-clock and assurance-level detail.

The **privacy controls** block is the artifact's largest cross-cutting overlay because open banking is fundamentally a privacy domain. The block carries the named federal privacy notices (initial and annual, with content reviewed against the data-sharing flow), state-privacy-law obligations across the firm's resident footprint (CCPA / CPRA, the rolling state list), the dual-purpose consent stack (data-rights authorisation plus state-privacy-law consent), retention and deletion duties on revocation, secondary-use posture, and signal handling (do-not-sell / share signals where in scope). The cross-cutting privacy overlay (`references/cross-cutting/privacy.md`) is required-on for every engagement.

The **vendor and fourth-party register** block names the aggregators, the developer-portal vendor, the consent-management vendor, the identity vendor, the fraud-decision vendor, and any other parties in the data path. Each row carries function, criticality flag, and the evidence-of-oversight reference. Skipping the developer-portal vendor in the fourth-party register is a frequent gap; the portal vendor is in the data path and inherits the obligations.

The **self-evidence index** is the artifact list mapped to each control section. Each row carries control reference, artifact, owner role, last-refreshed date, and freshness flag. This is the index a sponsor-bank programme-management team or an examiner reads first; missing rows here read as the firm not having the control rather than the firm not having the evidence.

The artifact closes with **gaps and issues** (severity, owner, target close date), **recommended disposition** (`ready_for_review`, `ready_with_conditions`, `remediate_then_re_review`, `not_ready`), **conditions** attached to a ready-with-conditions disposition, **open items and named follow-ups**, and **source citations with date** (the `s1033_status_note` block repeats in the citations footer).

## Quality bar

- Every material claim cites a source from `references/source-anchors.md` (or a loaded overlay) by file path. Unsupported claims are marked `[evidence needed]`.
- The `s1033_status_note` block is required and cannot be blank. Effective date with `[verify]` flag, firm implementation tier, litigation status as of the analysis date, and notes. The same block propagates into any downstream artifact that touches the data-rights frame.
- Data-provider duties and data-recipient duties are separate control families with separate evidence. Both-sides firms produce two parallel families, not one undifferentiated list.
- The federal Safeguards control set and the data-rights control set overlap but are not the same. A gap in one is not automatically a gap in the other.
- Industry-standard data-sharing patterns are supervisory expectation, not a legal obligation by themselves. The artifact distinguishes alignment from compliance.
- Named institutions appear in narrative only when they are public defendants in a finalised enforcement action with a published consent order.
- The skill stops at draft. The named approver decides.

## Adaptation

Pack depth and length scale to the firm role and the audience. A data-provider readiness pack ahead of an implementation-tier date runs longer than a data-recipient quarterly review. A both-sides firm produces two control families with a shared current-state regulatory frame and shared cyber and privacy overlays. A screen-scraping migration plan runs deeper where the credential-storage inventory is large; where it is empty, the block collapses to a status line.

Sector overlay loading is fixed (this skill is in the payments-fintech sector flagship; the overlay is `references/sector-overlays/payments-fintech.md` and is required-on). Cross-cutting overlay loading: privacy is required-on for every engagement (open banking is a privacy domain); cyber is required-on for every engagement (the data flow runs on tokens, keys, and authentication assurance levels); conduct is recommended where the consumer-authorisation flow has UDAAP exposure (misleading scope language, broken revocation paths, post-authorisation scope creep).

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors (the data-rights final rule, federal Safeguards, federal Privacy Rule, state privacy laws, FFIEC authentication guidance, NIST authentication-assurance guidance, OAuth / FAPI profile, FDX specification, the consumer-EFT error-resolution rule, named CFPB enforcement actions in the aggregator space).
- `references/sector-overlays/payments-fintech.md` — payments-fintech sector flavour (sponsor-bank programme posture, BaaS-stack token issuance, BIN-sponsor data flows, fintech UDAAP themes on authorisation flows, larger-participant rule applicability for direct-CFPB supervision).
- `references/cross-cutting/cyber.md` — encryption, key lifecycle, token-issuance posture, authentication assurance level reasoning, monitoring on the developer interface, breach-response chain.
- `references/cross-cutting/privacy.md` — federal privacy notices, state privacy laws, dual-purpose consent, retention and deletion duties, secondary-use posture, signal handling. Required-on for every engagement.
- `references/firm-overlay.md` — firm-installed policy, taxonomy, named approver chain, programme-agreement clause-set with the sponsor bank; consumed when present.
- `templates/default-output.md` — controls-inventory pack template (named sections, structured fields including `s1033_status_note`).
- `examples/` — public-source-derived scenarios (mid-tier data-provider readiness ahead of implementation-tier date; account-aggregator screen-scraping migration to API-tokenised access).
- `TROUBLESHOOTING.md` — recurring pitfalls (categorical covered-data answers; treating screen scraping as fine; missing per-consumer scope enforcement; conflating Safeguards with the data-rights frame; data-rights status note left as marketing copy; dropping the developer-portal vendor from the fourth-party register).

The plugin-level shared references (`references/source-map.md`, `references/policy-control-library.md`, `references/public-regulatory-scenarios.md`) sit at the plugin root and are consulted alongside the skill-level files.

## Output

Default to drafting against `templates/default-output.md`. Render as Word, Excel, PowerPoint, or Markdown when the audience or workflow asks for it; the typical deliverable is a Word memo via the `docx` skill in the `document-skills` plugin, with the header block carrying the `s1033_status_note`. The plugin README names `document-skills` as a companion plugin.

Downstream consumers — `fintech-partner-controls` (programme-agreement-mapped controls inventory updates), `payment-operations-incident-review` (where an incident touches authorisation flows, developer-interface tokens, or data-recipient feeds), `third-party-operational-resilience/vendor-diligence` (aggregator or developer-portal vendor diligence) — read the named blocks and propagate the `s1033_status_note` directly. The status-note block is the cross-skill contract.
