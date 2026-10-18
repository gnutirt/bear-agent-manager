# Open banking data controls pack

**Programme ID**: [stable ID; reused across the four sector-skill artifacts]
**Programme**: [legal entity; brand name if different]
**Engagement ID**: [pointer to scope record, or "none — scope not formalised"]
**Firm role**: [data_provider | data_recipient | both]
**Sponsor bank** (where applicable): [bank name and programme name]
**Drafted (UTC)**: [ISO datetime]
**Reviewed by**: [named approver — head of payments compliance | privacy officer | head of TPRM | sponsor-bank programme management | advisory practice partner]
**Audience**: [sponsor-bank operating committee | sponsor-bank TPRM | internal audit | board risk committee | CFPB EXAMS direct | state-MTL examiner via NMLS]
**Source posture**: [public-only | public-plus-firm-policy | public-plus-firm-policy-plus-evidence | connector-aware]
**Confidence label**: [high | medium | low | unknown]

## Programme summary

[One paragraph. Firm role under the data-rights frame, products in scope, consumer base, partner aggregators or developer-interface vendors integrated, sponsor-bank programme name where applicable. Names the scope record or notes "scope not formalised".]

## Current-state regulatory frame

This section does not soft-state. It carries the structured `s1033_status_note` block as the load-bearing record.

### `s1033_status_note`

| Field | Value |
|---|---|
| `effective_date` | [Federal Register effective date with `[verify]` flag where the analysis date has not been re-checked] |
| `firm_implementation_tier` | [tier under the data-provider asset-size phase-in, with the tier's compliance date] |
| `litigation_status_as_of` | [date of most recent docket check; notes on active litigation, stays, compliance-date relief] |
| `notes` | [firm-specific posture: early-adopter, lagging, BaaS-stack-coordinated, awaiting sponsor-bank readiness, screen-scraping migration in progress] |

The block propagates into any downstream artifact that touches the data-rights frame. The same field structure repeats in the source-citations footer.

### Other frame elements

| Element | Status | Notes |
|---|---|---|
| Active CFPB Circulars touching §1033 | [list with dates] | [verify which circulars are current on the analysis date] |
| Active CFPB enforcement in the aggregator space | [list with dates] | [public defendants in finalised actions only] |
| Larger-participant rule designation status | [designated / not designated / pending] | [drives direct-CFPB vs sponsor-bank-mediated supervision] |
| State privacy laws active in the firm's footprint | [CA, VA, CO, CT, UT, TX, OR, MT, others] | [verify currency on the analysis date] |

## Data-provider scope (where firm is data provider)

### Covered data inventory

| Data element | In-scope (yes / no / [verify]) | Source system | Owner role | Notes |
|---|---|---|---|---|
| Transaction data | | | | |
| Account balance | | | | |
| Configuration data | | | | |
| Payment-initiation information | | | | |
| [other elements as the rule's covered-data list specifies — verify against the published rule] | | | | |

### Accounts in scope

| Account type | In-scope (yes / no / [verify]) | Notes |
|---|---|---|
| Consumer asset accounts (under the consumer-EFT regime) | | |
| Credit cards (under the credit-card regime) | | |
| Prepaid accounts | | |
| Payment products | | |
| Other | | |

### Out-of-scope items with rationale

| Item | Rationale | Source citation |
|---|---|---|
| | | |

## Developer-interface posture (where firm is data provider)

| Finding | Posture | Evidence reference | Owner role | Notes |
|---|---|---|---|---|
| Availability and uptime SLO posture | | | | |
| Performance posture | | | | |
| Security (encryption, mutual-TLS, FAPI profile) | | | | |
| Documentation, sandbox, conformance testing | | | | |
| Third-party developer-portal vendor (if applicable) | | | | |
| Per-consumer scope enforcement at the API runtime | | | | |
| Free-access posture (no consumer / authorised-party fees) | | | | |

## Authorisation, scope, duration, revocation

| Finding | Posture | Evidence reference | Owner role | Notes |
|---|---|---|---|---|
| Consent capture content (what was disclosed) | | | | |
| Consumer-facing scope language vs actual data flow | | | | |
| Scope-narrowing at the API runtime | | | | |
| Duration limits | | | | |
| One-year reauthorisation cadence | | | | |
| Revocation propagation: provider stops | | | | |
| Revocation propagation: recipient stops | | | | |
| Revocation propagation: deletion runs | | | | |
| Audit trail end-to-end | | | | |

The consumer-facing scope language vs the actual flow is the row examiners and plaintiffs read first.

## Data-recipient screening and onboarding (where firm is data provider)

| Finding | Posture | Evidence reference | Owner role | Notes |
|---|---|---|---|---|
| Third-party authorisation conditions | | | | |
| Certifications collected | | | | |
| Ongoing monitoring posture | | | | |
| Tie-back to TPRM lifecycle | | | | |
| Termination posture | | | | |

## Data-recipient duties (where firm is data recipient)

| Finding | Posture | Evidence reference | Owner role | Notes |
|---|---|---|---|---|
| Collection limits (only authorised data) | | | | |
| Use limits (only authorised purposes) | | | | |
| Secondary-use posture (model training, benchmarking, marketing) | | | | |
| Retention schedule by data category | | | | |
| Deletion-on-revocation operational path | | | | |
| Reauthorisation cadence | | | | |
| Downstream sharing posture | | | | |
| Consumer-facing scope language vs actual data flow | | | | |

A common gap: contractual baseline documented, operational deletion-job evidence missing.

## Screen-scraping migration plan (where applicable)

### Credential-storage inventory

| Integration name | Provider | Credential storage location | Encryption posture | Vault rotation cadence | Status |
|---|---|---|---|---|---|
| | | | | | active / deprecating / retired |

### Deprecation roadmap

| Provider | Target migration date | Status | Customer-impact assessment | Sponsor-bank coordination |
|---|---|---|---|---|
| | | not started / in progress / complete | re-onboarding required / broken connections / fee implications | clause reference, status |

### Fallback posture during migration

| Provider | Fallback posture | Notes |
|---|---|---|
| | active screen-scraping during API ramp / API-only with no fallback / dual-write | |

Hashed-but-recoverable credentials are still credentials. The recoverability is the issue.

## Cyber controls on the data flow

| Finding | Posture | Evidence reference | Owner role | Notes |
|---|---|---|---|---|
| Encryption in transit (TLS, mutual-TLS) | | | | |
| Encryption at rest | | | | |
| Key management (HSM-backed, rotation cadence, custody) | | | | |
| Token issuance posture (OAuth / FAPI flow type) | | | | |
| Token scope enforcement at API runtime | | | | |
| Token revocation propagation | | | | |
| Token expiry cadence | | | | |
| Authentication assurance level (consumer-side) | | | | |
| Authentication assurance level (recipient-side) | | | | |
| Monitoring on the developer interface | | | | |
| Bot / credential-stuffing detection | | | | |
| Account-takeover detection | | | | |
| Breach-response chain | | | | |

Cross-link to `references/cross-cutting/cyber.md` for the parallel-clock and assurance-level detail.

## Privacy controls

| Finding | Posture | Evidence reference | Owner role | Notes |
|---|---|---|---|---|
| Federal initial privacy notice content | | | | |
| Federal annual privacy notice posture | | | | |
| Federal opt-out mechanics | | | | |
| State privacy laws (one row per state in footprint) | | | | |
| State breach-notification posture (one row per state) | | | | |
| Dual-purpose consent stack (data-rights / GLBA / state) | | | | |
| Retention schedule by data category | | | | |
| Deletion-on-revocation operational path | | | | |
| Deletion-on-state-rights-request operational path | | | | |
| Backup-restore posture | | | | |
| Secondary-use posture (model training) | | | | |
| Secondary-use posture (benchmarking, analytics) | | | | |
| Secondary-use posture (marketing, cross-sell) | | | | |
| Global Privacy Control signal handling | | | | |
| Vendor DPA-vs-actual reconciliation | | | | |

Cross-link to `references/cross-cutting/privacy.md` for the named anchors and the state-by-state detail.

## Vendor and fourth-party register

| Vendor | Function | Criticality | Evidence-of-oversight reference | Notes |
|---|---|---|---|---|
| Sponsor bank (where applicable) | depository institution of record | critical | programme-agreement clause | |
| Aggregator (one row per) | data-recipient feed | | | |
| Developer-portal vendor | API documentation, sandbox, key issuance | | | |
| Authorisation-server vendor | OAuth / FAPI flows | | | |
| Consent-management vendor | consumer consent capture and store | | | |
| Identity vendor | consumer authentication | | | |
| Fraud-decision vendor | account-takeover detection | | | |
| BIN sponsor (where applicable) | card-account data path | | | |
| Other fourth-party | | | | |

Skipping the developer-portal vendor is a frequent gap. The portal vendor is in the data path.

## Self-evidence index

| Control reference | Artifact | Owner role | Last refreshed (UTC) | Freshness flag | Notes |
|---|---|---|---|---|---|
| | | | | current / stale / missing | |

This is the index a sponsor-bank programme-management team or an examiner reads first.

## Gaps

| Description | Source citation | Severity | Owner role | Target close date |
|---|---|---|---|---|
| | | low / moderate / high / critical | | |

## Issues (material gaps elevated)

| Description | Source citation | Severity | Owner role | Target close date | Escalation path |
|---|---|---|---|---|---|
| | | | | | |

## Recommended disposition

[ready_for_review | ready_with_conditions | remediate_then_re_review | not_ready]

### Conditions (where ready_with_conditions)

| Condition | Owner role | Target date |
|---|---|---|
| | | |

### Where firm is both data provider and data recipient

A both-sides firm produces two parallel control families. The recommended disposition can differ across the two sides.

| Side | Recommended disposition | Notes |
|---|---|---|
| Data provider | | |
| Data recipient | | |

## Open items and named follow-ups

| Description | Owner role | Target date |
|---|---|---|
| | | |

## Source citations

| Claim | Source | Section | Retrieval date | URL or file ref | Notes |
|---|---|---|---|---|---|
| | | | | | [verify section] / current state confirmed |

### `s1033_status_note` (repeated from current-state regulatory frame)

| Field | Value |
|---|---|
| `effective_date` | |
| `firm_implementation_tier` | |
| `litigation_status_as_of` | |
| `notes` | |

The status-note block repeats here so the citation footer carries the same date-stamp as the regulatory-frame section. Cite `references/source-anchors.md` for canonical citations.

---

*Pack depth scales to the firm role and the audience.* A data-provider readiness pack ahead of an implementation-tier date runs longer than a data-recipient quarterly review. A both-sides firm produces two control families with a shared current-state regulatory frame and shared cyber and privacy overlays. A screen-scraping migration plan runs deeper where the credential-storage inventory is large; where it is empty, the block collapses to a status line.

The deliverable is a Word memo. Render this template as a `.docx` via the `docx` skill in the `document-skills` plugin; the markdown above is the content spec, and the Word file is what the programme-operator second line, the sponsor-bank operating committee, and the regulator-facing reviewer receive.
