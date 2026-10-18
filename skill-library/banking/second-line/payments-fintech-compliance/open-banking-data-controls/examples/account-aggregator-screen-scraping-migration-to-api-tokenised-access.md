# Example: account aggregator (data recipient) migrating screen-scraping integrations to API-tokenised access

## Input description

A US account aggregator running PFM and lending-underwriting feeds for a portfolio of fintech recipients is migrating its data-provider integrations from credential-based screen scraping to API-tokenised access. The firm runs as a data recipient under the personal-financial-data-rights frame. It has 14 active screen-scraping integrations against banks and fintechs that have not yet exposed a developer interface, hashed-but-recoverable credentials in a vendor-managed vault for those integrations, no end-to-end deletion path for consumer-revoked authorisations on the legacy integrations, and a consumer-facing scope description in its app that is broader than the actual data flow for several integrations. The firm is preparing for its second-line review ahead of a downstream lender's vendor-diligence cycle.

The engagement was scoped at connector-aware posture (the firm has system-of-record access for token-issuance logs, consent-store audit trail, and deletion-job records). The audience is the firm's second-line lead and the downstream lender's TPRM team for the vendor-diligence-cycle review.

## Output sketch

The pack opens with a **programme summary** naming the firm role (data recipient; aggregator), the products consuming the feed (PFM, lending-underwriting), the consumer base, the data-provider integrations (mix of API-tokenised and legacy screen-scraping), and the downstream-recipient portfolio.

The **current-state regulatory frame** carries the structured `s1033_status_note` block: the effective date with `[verify]` flag re-checked on the engagement date; the firm's posture as a data recipient (the implementation-tier dates phase data-provider obligations; data-recipient duties apply earlier on consumer-permissioned flows); the docket-status note as of the engagement date; the firm-specific notes (screen-scraping migration in progress; legacy-integration credential-vault retirement on a 12-month roadmap).

The **data-recipient duties** block fires:

- Collection limits: the firm collects only authorised data on API-tokenised integrations; on legacy screen-scraping integrations, the data envelope is broader than the consumer-facing scope description. Finding recorded.
- Use limits: PFM and lending-underwriting are the authorised purposes; secondary use for analytics-derivative production runs on de-identified aggregated data. The de-identification posture is reviewed and current.
- Secondary-use posture: model-training pipeline runs on de-identified data; benchmarking products run on aggregated data; marketing posture is opt-in only. The DPA-vs-actual reconciliation is current.
- Retention schedule: 24-month retention by category; legacy-integration retention reviewed against the rule's "reasonably necessary" standard; finding recorded for one category that exceeds the necessary-period.
- Deletion-on-revocation operational path: API-tokenised integrations have an end-to-end deletion path; legacy screen-scraping integrations have a partial path (consent-store revocation propagates to the data store but not to the credential vault). Finding recorded as a critical gap.
- Reauthorisation cadence: the firm runs a 12-month consumer-facing reauthorisation surface; reauthorisation flow re-establishes authentication at the same AAL.
- Downstream sharing: the firm shares with downstream lender-recipients under DPAs that mirror the upstream consent scope; DPA-vs-actual reconciliation is current.
- Consumer-facing scope language vs actual data flow: the scope description in the firm's app is broader than the actual flow for three legacy integrations and matches the actual flow for the API-tokenised integrations. Finding recorded.

The **screen-scraping migration plan** is the artifact's centre of gravity:

- **Credential-storage inventory**: 14 active integrations, hashed-but-recoverable credentials in a vendor-managed vault; the vault's recoverability is the issue. Vault rotation cadence quarterly.
- **Deprecation roadmap**: 9 integrations with target migration dates within 12 months; 5 integrations awaiting data-provider-side developer-interface readiness; sponsor-bank coordination not applicable (the firm is not a sponsor-bank programme on the recipient side).
- **Fallback posture**: dual-write during the API ramp for 6 integrations; API-only for 3; active screen-scraping during ramp for 5 awaiting provider readiness.
- **Customer-impact assessment**: re-onboarding required for the 9 in-progress integrations; broken-connection risk recorded with the customer-communications plan.

The **cyber controls on the data flow** block carries:

- Token lifecycle for the API-tokenised integrations: OAuth 2.0 with PKCE for consumer-facing flows; FAPI 2.0 message-signing for high-value scopes; refresh-token expiry tied to the 12-month reauthorisation cadence.
- Token revocation propagation: end-to-end on API-tokenised integrations; partial on legacy integrations (the credential-vault deletion lags). Finding recorded.
- Authentication assurance level (consumer-side): AAL2 with phishing-resistant authenticator types; evidence reviewed.
- Monitoring on the developer interface side and the legacy-integration side: anomaly detection on both; alert-investigation cadence current.

The **privacy controls** block fires the largest finding set, because the firm is a data recipient and the privacy frame layers on top of the data-rights frame:

- Federal privacy notice content: current; data-recipient flows reflected.
- State-privacy-law inventory: CA / VA / CO / CT / UT / TX / OR / MT in scope (verify currency on the engagement date).
- Dual-purpose consent stack: three surfaces (data-rights authorisation, GLBA notice, state-privacy-law consent) with three separate content sets; reviewed and current.
- Retention and deletion duties: the deletion-on-revocation operational path gap on legacy integrations is the largest finding; recorded as critical.
- Secondary-use posture: model-training, benchmarking, and marketing rows reviewed; DPA-vs-actual reconciliation current.
- GPC signal handling: honoured for CA/CCPA opt-outs.
- Vendor DPA-vs-actual reconciliation: 12 vendor relationships reviewed; one DPA-vs-actual gap recorded.

The **vendor and fourth-party register** carries the credential-vault vendor (legacy), the authorisation-server vendor (current), the consent-management vendor, the identity vendor, the fraud-decision vendor, and the data-provider integrations as upstream relationships with criticality flags.

The **gaps** block elevates three to issue level: deletion-on-revocation operational path on legacy integrations (critical), consumer-facing scope description vs actual flow on three legacy integrations (high), and the credential-vault retirement timeline (high; the 12-month roadmap is reasonable, but the interim posture is the issue).

The **recommended disposition** is `remediate_then_re_review`. The conditions block names the three issues that must close before re-review.

## Why this scenario matters

The scenario tests the most-frequent findings on the data-recipient side: the deletion-on-revocation operational path (the contractual baseline and the operational job often diverge), the consumer-facing scope description vs the actual flow (legacy integrations carry envelopes broader than the consent language), and the credential-vault retirement (hashed-but-recoverable credentials are still credentials, and reporting "vaulted" as compliant is a frequent failure). It also exercises the screen-scraping migration plan as the artifact's centre of gravity and the dual-purpose consent stack discipline (data-rights, GLBA, and state-privacy-law are three separate frames).

The scenario uses only public-source-derived material. CFPB and FTC enforcement actions in the aggregator and credential-storage space establish the conceptual fact pattern; no named institution is used in the artifact narrative.
