# Sector overlay — payments-fintech

This skill sits in the payments-fintech sector flagship. The overlay is not "extra payments flavour layered on a generic primitive"; it is the workflow itself. This file carries the sponsor-bank programme posture, the BaaS-stack token issuance, the BIN-sponsor data flows, the fintech UDAAP themes on authorisation flows, and the larger-participant rule applicability that the named sections must reflect.

The overlay is required-on for every engagement run through this skill. SKILL.md does not gate on it.

## Firm role under the data-rights frame

The firm runs as a **data provider** when consumers hold accounts with the firm and the firm exposes covered data through a developer interface to authorised third parties. Sponsor-bank programmes split the data-provider role: the sponsor bank is the depository institution of record, and the programme operator runs the consumer-facing app and often the developer interface. Both inherit data-provider duties; the programme-agreement clause-set names the allocation. A neobank running on a BaaS stack is a data provider for its consumer base; a wallet operator running on stored-value or payment-product structures is a data provider for the products in scope.

The firm runs as a **data recipient** when it consumes consumer-permissioned data from a data provider through an aggregator, a direct API integration, or a legacy screen-scraping integration. Account aggregators, PFM apps, lenders running cash-flow underwriting, BNPL platforms, payroll-on-demand providers, gig-economy disbursement platforms, and tax-prep services are typical recipients. The duty set is collection and use limits, retention schedule, deletion-on-revocation, secondary-use posture, and reauthorisation cadence.

The firm runs as **both** when it is a data recipient on the inbound side (consuming aggregated data for product features) and a data provider on the outbound side (exposing its own consumer accounts through a developer interface). Both-sides firms produce two parallel control families with a shared current-state regulatory frame, shared cyber and privacy overlays, and a shared `s1033_status_note` block. Mixing the two duty sets in a single undifferentiated list is the most-frequent rework cause.

## Sponsor-bank programme posture

The sponsor-bank programme-agreement clause-set is the row that runs first in most data-rights engagements. The clause-set typically allocates the data-provider role between the bank and the programme operator, names the developer-interface stack (bank-hosted, programme-operator-hosted, or third-party vendor), names the consent-store ownership, and sets the bank's audit and reporting rights over the data-rights programme.

Anchored to the **Interagency Guidance on Third-Party Relationships** (June 6, 2023) — the bank's principal-side oversight expectation, which the bank cascades into the programme-agreement clauses on data-rights compliance applied to the programme operator. Subcontractor / fourth-party expectations under risk-based application apply (the developer-portal vendor, the consent-management vendor, the identity vendor, the aggregator-side recipient is a fourth party). A subcontractor-side issue still flows to the sponsor bank under the programme operator's notification clause.

Anchored to the **Joint Statement on Banks' Arrangements with Third Parties to Deliver Bank Deposit Products and Services** (July 25, 2024 — verify exact date). The statement frames the sponsor-bank-side oversight of the data-rights programme; FBO subledger reconciliation, deposit-insurance representation review, and operational-resilience expectations apply where the data-rights programme touches deposit products.

The artifact's **vendor and fourth-party register** block records the sponsor bank, the developer-portal vendor, the consent-management vendor, and the aggregator-side recipients with criticality flag and evidence-of-oversight reference. The artifact's **self-evidence index** mirrors the programme-agreement audit-rights clause; missing rows are findings.

## BaaS-stack token issuance and the developer interface

In a BaaS programme, the developer interface is typically built on a vendor stack: a developer-portal vendor (for documentation, sandbox, and key issuance), an authorisation-server vendor (for OAuth / FAPI flows), and a consent-management vendor (for consumer-facing consent capture and the consent store). Each is a fourth-party participant in the data path. The artifact records:

- Where token issuance sits (sponsor-bank side, programme-operator side, vendor-managed). The artifact records the key-management posture (HSM-backed, software-vault-backed) and the rotation cadence.
- Where consent capture sits (programme-operator app, vendor-hosted widget, sponsor-bank-hosted page). The consent-store ownership matters; downstream revocation propagation runs through whichever party owns the store.
- Where the audit trail sits (token-issuance log, consent-change log, deletion-job log). Aggregating these into a single audit feed for sponsor-bank review and examiner access is the operative discipline.

Per-consumer scope enforcement at the developer interface is a frequent gap in BaaS stacks: the partner-portal API was built before the data-rights frame and returns a fixed data envelope rather than a consent-narrowed subset. The artifact records the gap as a developer-interface finding with the migration-path commitment.

## BIN-sponsor data flows (where applicable)

Where the programme operator runs a card programme on a BIN-sponsor stack, card-account data sits in the sponsor's stack, and the data-rights frame applies to the credit-card or prepaid-account scope through the BIN-sponsorship relationship. The developer interface for card data typically runs through the BIN sponsor's vendor; the programme operator's data-rights duties flow through the sponsorship agreement. The artifact records the BIN-sponsor relationship in the **vendor and fourth-party register** block and the BIN-sponsor's developer-interface posture in the **developer-interface posture** block.

## Fintech UDAAP themes on authorisation flows

The CFPB has signalled UDAAP exposure on authorisation-flow disclosure, revocation-path failures, post-authorisation scope creep, and dark-pattern consent capture. The artifact records:

- The consumer-facing scope language and the actual data flow side by side. Examiners and plaintiffs read these against each other; a scope description broader than the actual flow is a finding, and a flow broader than the scope description is a worse finding.
- The revocation path end-to-end. Consumer revokes; the data provider stops; the data recipient stops; deletion runs; the audit trail records each step. A revocation that stops the inbound feed but does not propagate to deletion is a finding; a revocation captured in the consent store but not enforced at the API runtime is a worse finding.
- The reauthorisation cadence and the consumer-facing reauthorisation experience. A reauthorisation flow that re-confirms an already-authorised scope without surfacing the actual data subset to the consumer is a dark-pattern finding.

Cross-link to `consumer-compliance-fair-lending/udaap-risk-review` (with the payments-fintech overlay) where the UDAAP exposure is material; the cross-cutting conduct overlay carries the named UDAAP frame.

## CFPB direct supervision and the larger-participant rule

Where the CFPB final rule defining larger participants of digital consumer payment applications (December 2024 — verify Federal Register citation and current state) designates the firm, the regulator-facing posture for the data-rights programme is direct CFPB EXAMS rather than sponsor-bank-mediated. The artifact's regulator-facing posture carries a direct-CFPB row for designated firms; the scope record names the larger-participant designation status.

Cross-link to `regulatory-change-management/exam-brief` (with the payments-fintech overlay) for the three-track exam-prep posture (sponsor-bank-led, CFPB-direct, state-MTL).

## Screen-scraping migration in the payments-fintech context

Account aggregators and many data-recipient fintechs continue to run legacy screen-scraping integrations against data providers that have not yet exposed a developer interface, or against products outside the data-rights covered scope. The migration plan in this context is not a single sprint; it is a multi-quarter programme with a credential-storage retirement schedule, a fallback posture for providers without an interface yet, and a sponsor-bank coordination cadence where the BaaS-stack programme is in scope.

Common failure modes in this lane:

- Treating the screen-scraping integration as fine because it has been in production for years. The migration path is the artifact's centre of gravity.
- Storing credentials in a hashed-but-recoverable form ("vaulted") and reporting the storage as compliant. The recoverability is the issue; vaulted recoverable credentials are still credentials.
- Running consumer-revoked authorisations through the consent store without propagating to credential-vault deletion. The deletion path must close end-to-end.
- Mis-stating the consumer-facing scope to match the screen-scraping data envelope rather than the actual data being consumed by the recipient.

## Both-sides firm posture

Where the firm is both a data provider and a data recipient, the artifact carries:

- A single **current-state regulatory frame** with the firm's tier date as data provider and the firm's status as data recipient.
- Two parallel control families: **data-provider duties** and **data-recipient duties**. Each has its own self-evidence index, its own gaps row, and its own recommended disposition. The recommended dispositions can differ; one side may be `ready_for_review` while the other is `remediate_then_re_review`.
- A shared **cyber controls** block (encryption, key management, token lifecycle, authentication assurance level) and a shared **privacy controls** block (notices, state privacy, consent stack, retention and deletion). The cross-cutting overlays are loaded once.
- A shared **vendor and fourth-party register** with criticality flags that note which vendors sit in the data-provider path, which sit in the data-recipient path, and which sit in both.
- A single **`s1033_status_note`** block that propagates into both control families and any downstream artifact.

## §1033 status note

The `s1033_status_note` block is required and cannot be blank. The block carries:

- `effective_date` — the rule's effective date as cited in the Federal Register, with `[verify]` flag where the analysis date has not been re-checked against the current docket.
- `firm_implementation_tier` — the firm's tier under the data-provider asset-size phase-in, with the tier's compliance date.
- `litigation_status_as_of` — date of the most recent docket check, with notes on any active litigation, stays, or compliance-date relief.
- `notes` — any firm-specific posture (early-adopter, lagging, BaaS-stack-coordinated, awaiting sponsor-bank readiness).

The block propagates into any downstream artifact that touches the data-rights frame: a vendor-diligence pack on an aggregator, a payment-operations incident review where authorisation flows or developer-interface tokens were involved, a privacy-counsel-led review touching consumer-permissioned data. The cross-skill contract is the same field structure; downstream artifacts read the block directly rather than re-deriving it.

## Audience notes

- **Sponsor-bank operating committee and programme-management team.** Lead with the **current-state regulatory frame**, the **data-provider scope**, the **developer-interface posture**, and the **vendor and fourth-party register**. The authorisation-controls block and the self-evidence index support.
- **Sponsor-bank TPRM team.** Lead with the **vendor and fourth-party register**, the **data-recipient screening** block, the **self-evidence index**, and the **gaps and recommended disposition**. The rest goes in the appendix.
- **Internal audit and board risk committee.** Lead with the **current-state regulatory frame**, the **gaps and recommended disposition**, and the **lessons learned** if the artifact follows an incident or examination. The control-family detail goes in the appendix.
- **CFPB EXAMS where the larger-participant rule designates the firm.** Lead with the **authorisation, scope, duration, revocation** block, the **data-recipient duties** block (where applicable), the **privacy controls** block, and the consumer-facing scope language. The vendor register and the cyber overlay support.
