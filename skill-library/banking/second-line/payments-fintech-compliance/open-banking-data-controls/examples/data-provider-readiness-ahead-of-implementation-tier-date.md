# Example: mid-tier data-provider fintech preparing developer-interface and authorisation stack ahead of its implementation-tier date

## Input description

A mid-tier programme operator running a consumer neobank on a BaaS sponsor-bank stack is preparing for its data-provider implementation-tier date under the personal-financial-data-rights frame. The firm is a data provider for checking-equivalent and credit-card-equivalent products; it currently exposes a partner-portal API to a small set of aggregator-recipients but does not enforce per-consumer authorisation scope at the API runtime, charges aggregators a per-call fee, and has no documented one-year reauthorisation mechanism. The sponsor bank's TPRM team has scheduled a controls-inventory review.

The engagement was scoped at public-plus-firm-policy-plus-evidence posture. The audience is the sponsor-bank operating committee for the readiness review, with a parallel artifact for the firm's internal-audit retrospective.

## Output sketch

The pack opens with a **programme summary** naming the firm role (data provider), the products in scope (consumer asset accounts under the consumer-EFT regime; credit-card-equivalent product under the credit-card regime), the consumer base, the integrated aggregators, and the sponsor-bank programme name.

The **current-state regulatory frame** carries the structured `s1033_status_note` block: the effective date with `[verify]` flag re-checked on the engagement date; the firm's tier date under the asset-size phase-in; the docket-status note as of the engagement date (with notes on the litigation history and any compliance-date relief); the firm-specific notes (BaaS-stack-coordinated; sponsor-bank readiness on the depository side; partner-portal API legacy posture). The block propagates into the artifact's source-citations footer.

The **data-provider scope** block carries the covered-data inventory (transaction data, account balance, configuration data, payment-initiation information; verified against the published rule), the in-scope account types (consumer asset accounts; the credit-card-equivalent product), and the out-of-scope items with rationale.

The **developer-interface posture** block fires the gaps:

- Per-consumer scope enforcement at the API runtime: gap. The partner-portal API returns a fixed data envelope and relies on the recipient to filter. Migration-path commitment recorded.
- Free-access posture: gap. The firm charges aggregators a per-call fee. The rule prohibits charging consumers or authorised third parties for access; the fee structure must change before the tier date. Recorded as a finding with target-close date.
- Documentation, sandbox, conformance testing: partial. Sandbox available; conformance testing against the FDX message-structure profile not yet completed.
- Third-party developer-portal vendor: in scope. The vendor is recorded in the **vendor and fourth-party register** with criticality flag.

The **authorisation, scope, duration, revocation** block fires:

- Consumer-facing scope language vs actual data flow: the scope description in the consent flow is broader than the actual data envelope returned by the partner-portal API. Recorded as a finding (worse failure mode: actual flow broader than scope language; this is the inverse, but still a finding).
- One-year reauthorisation cadence: not implemented. The firm relies on aggregator-side periodic re-prompting rather than a data-provider-enforced reauthorisation surface. Migration-path commitment recorded.
- Revocation propagation: provider stops on revocation; recipient-stop and deletion-runs evidence not aggregated into a single audit feed. Migration-path commitment recorded.

The **data-recipient screening** block carries the third-party authorisation conditions the firm applies to recipients (basic certification collected; ongoing monitoring posture light) with the tie-back to the firm's TPRM lifecycle.

The **cyber controls on the data flow** block carries:

- Encryption in transit: TLS 1.2+ with mutual-TLS for the partner-portal API; gap on FAPI message-signing posture for high-value scopes.
- Token issuance: programme-operator-side; OAuth 2.0 authorisation-code flow; FAPI 1.0 not yet adopted. Recorded as a migration commitment.
- Token scope enforcement: gap (per the developer-interface row above).
- Authentication assurance level (consumer-side): AAL2 asserted; evidence reviewed (TOTP authenticator app plus password); meets the floor.
- Monitoring on the developer interface: anomaly detection at the API gateway; alert-investigation cadence acceptable.

The **privacy controls** block carries the federal initial privacy notice content (reviewed and current; data-recipient sharing categories listed), the annual privacy notice posture (delivered on cadence), the state-privacy-law inventory (one row per state in the firm's resident footprint; CA / VA / CO / CT / UT in scope; verify currency on the engagement date), the dual-purpose consent stack (data-rights authorisation, GLBA notice, state-privacy-law consent: three separate surfaces with three separate content sets), and the GPC signal handling posture (honoured for CA/CCPA opt-outs).

The **vendor and fourth-party register** carries the sponsor bank, the developer-portal vendor, the authorisation-server (in-house), the consent-management vendor, the identity vendor, the fraud-decision vendor, and three named aggregator-recipients with criticality flags and evidence-of-oversight references.

The **self-evidence index** carries the artifact list mapped to each control section; the freshness flags surface three stale items that need refresh ahead of the tier date.

The **gaps** block elevates four to issue level: free-access posture, per-consumer scope enforcement at the API runtime, one-year reauthorisation cadence, and FAPI message-signing posture for high-value scopes. Each carries severity, owner role, target close date, and escalation path.

The **recommended disposition** is `remediate_then_re_review`. The conditions block names the four issues that must close before re-review.

## Why this scenario matters

The scenario tests three of the most-frequent findings on the data-provider side: the free-access posture (charging aggregators is a frequent legacy practice that does not survive the tier date), per-consumer scope enforcement at the API runtime (legacy partner-portal APIs return fixed envelopes), and the one-year reauthorisation cadence (most data providers had no such surface before the rule). It also exercises the `s1033_status_note` block discipline (the litigation history, the firm's tier date, the engagement-date verification) and the FAPI / authentication-assurance-level discipline (asserting AAL2 with evidence, not just policy).

The scenario uses only public-source-derived material. CFPB final rule text and supervisory signal establish the conceptual fact pattern; no named institution is used in the artifact narrative.
