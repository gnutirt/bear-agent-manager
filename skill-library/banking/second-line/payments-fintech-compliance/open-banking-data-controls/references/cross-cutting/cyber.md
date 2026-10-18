# Cross-cutting overlay — cyber

Required-on for every engagement run through this skill. The data-rights programme runs on tokens, keys, authentication assurance levels, and an exposed developer interface; the cyber controls on the data flow are not a separate workstream but the operative substance of the controls inventory. This overlay carries the encryption, key lifecycle, token-issuance posture, authentication-assurance reasoning, monitoring, and breach-response detail that the **cyber controls on the data flow** named section reflects.

The overlay does not substitute for the firm's own information-security programme, for an architectural review of the developer interface, or for a penetration-test programme. The pack records the supervisory-level controls posture and the evidence-of-oversight; deeper engineering work flows to the firm's information-security function or to a counsel-led security review.

## Anchor frame

- **GLBA Safeguards Rule, 16 CFR Part 314** as amended (FTC, December 2021 amendments effective 2023). **§314.4** the written information security programme; **§314.4(c)** access controls, encryption, MFA, secure disposal; **§314.4(d)** monitoring; **§314.4(e)** training; **§314.4(f)** service-provider obligations; **§314.4(h)** incident response; **§314.4(i)** annual report to the board. The Safeguards Rule is the federal floor for the data-flow security posture.
- **NYDFS 23 NYCRR Part 500** including **§500.11** third-party service-provider security, **§500.12** multi-factor authentication, **§500.15** encryption, **§500.16** incident-response plan, **§500.17(a)** cybersecurity-event notification (72 hours from determination). Applies where the firm is a NYDFS Covered Entity; many fintechs are by virtue of NY footprint.
- **FFIEC IT Examination Handbook — Information Security booklet** [verify current edition]. Sets the supervisory expectation for the information-security programme.
- **FFIEC Authentication and Access to Financial Institution Services and Systems Guidance** (August 11, 2021). Sets the supervisory expectation for authentication posture, including for high-risk transactions and customer-permissioned data sharing.
- **NIST SP 800-63B Digital Identity Guidelines** [verify current revision]. Authentication assurance levels (AAL1, AAL2, AAL3) and the lifecycle controls each level requires.
- **OAuth 2.0 (RFC 6749)** and **OpenID FAPI security profile** [verify whether the firm cites FAPI 1.0 Final, FAPI 2.0, or a later profile]. The authorisation-server pattern for tokenised access.

## Encryption and key management

The artifact's **cyber controls on the data flow** block records:

- Encryption in transit (TLS version, cipher suite posture, certificate-rotation cadence, mutual-TLS posture for B2B integrations).
- Encryption at rest (key strength, vault posture, customer-data-store coverage, token-store coverage, audit-trail-store coverage).
- Key management (HSM-backed vs software-vault-backed, key-rotation cadence, key-escrow posture, separation of duties for key custody, vendor-managed-key posture for any layer the vendor controls).
- The named GLBA Safeguards §314.4(c) encryption requirement and the named FFIEC IT Information Security supervisory expectation as the anchor.

Common failure mode: vendor-managed-key posture without firm-side key-custody evidence. The artifact records the vendor's SOC 2 Type II key-custody attestation and reconciles against the firm's own audit-rights evidence.

## Token lifecycle for the developer interface

The token lifecycle is the operative control set for the data-rights programme. The artifact records:

- **Token issuance.** Where issuance sits (sponsor-bank side, programme-operator side, vendor-managed authorisation server). The OAuth / FAPI flow type (authorisation-code with PKCE, client-credentials for B2B, FAPI message-signing posture). The audience scope for issued tokens (which data-recipient app, which consumer, which scope subset).
- **Token scope.** Per-consumer scope enforcement at the API runtime, not just at the consent-store record. The artifact records whether the API enforces consent-narrowing (the developer interface returns only what the consumer authorised) or whether it relies on the recipient to filter (a finding).
- **Token revocation.** The propagation path from consumer revocation through the consent store, the authorisation server, the active-token registry, and the API runtime. Revocation that stops the next token issuance but does not invalidate the active token is a finding.
- **Token expiry.** The named expiry cadence for access tokens and refresh tokens; the reauthorisation cadence under the data-rights frame for refresh-token reissuance.
- **Audit trail.** Token-issuance log, token-scope log, token-revocation log, token-use log. Aggregating these into a single audit feed for sponsor-bank review and examiner access is the operative discipline.

## Authentication assurance level

The artifact's authentication-assurance row carries the named AAL for each consumer-facing flow:

- Consumer authentication into the consent flow at the data provider. AAL2 is the typical supervisory expectation for high-value financial-data access; AAL3 may apply for high-risk programmes.
- Consumer reauthorisation flow. The reauthorisation should re-establish authentication at the same AAL; a reauthorisation flow that drops to a lower AAL (e.g., a magic link without a second factor) is a finding.
- Recipient-side authentication into the developer interface. The OAuth client authentication (mutual-TLS, FAPI message signing, signed JWTs) and the named recipient-side authentication assurance.

The artifact distinguishes the AAL the firm asserts from the AAL the firm evidences. Asserting AAL2 with username-and-password plus an email-OTP flow is a frequent gap; the AAL2 floor requires authenticator types that resist phishing in the same way. The cross-cutting cyber overlay carries the evidence ask.

## Monitoring and incident detection on the developer interface

The artifact records:

- Anomaly detection on the developer interface (unusual access patterns, unusual scope requests, unusual recipient behaviour). The named monitoring vendor where applicable; the alert-volume and alert-investigation cadence.
- Bot and credential-stuffing detection on consumer-facing authentication flows. The named bot-management vendor where applicable.
- Account-takeover detection at the data provider and the data recipient. The named ATO-detection vendor where applicable.
- The breach-response chain: detection, internal escalation, sponsor-bank notification, customer notification, regulator notification. The named GLBA Safeguards §314.4(h) incident-response posture is the anchor.

## Breach-response chain to the consumer and the sponsor bank

Where a breach in the data flow touches consumer information, the artifact records the parallel notification clocks:

- The sponsor-bank programme-agreement contractual clock for cyber-incident notification (typically tighter than any regulator clock; often 24 hours or less for cyber events).
- The federal banking agencies' Computer-Security Incident Notification Rule 36-hour clock (binds the sponsor bank, not the programme operator; the programme operator's clock to the sponsor bank under the programme agreement is the input).
- The NYDFS 23 NYCRR Part 500 §500.17(a) 72-hour clock (where the firm is a Covered Entity).
- The state breach-notification clocks (one row per state with affected residents; timing windows vary; cross-link to the privacy overlay for the resident-by-resident detail).
- The GLBA Safeguards Rule notification (where the firm is FTC-supervised and the affected-customer threshold is met; verify current threshold).
- The §1033-specific incident posture: where consumer authorisation flows or developer-interface tokens were affected, the data-rights frame implicates the reauthorisation cadence, the revocation propagation path, and the data-recipient duties chain. The artifact records the §1033-implications row separately and propagates the `s1033_status_note` block.

Cross-link to `payment-operations-incident-review` for the payments-operational chain when an incident has both an open-banking leg and a payments-rail leg, and to `risk-reporting/cyber-disclosure-readiness` for the public-disclosure leg where the firm or its sponsor bank is a public registrant.

## Vendor-stack cyber posture for the developer interface

Where the developer interface, the authorisation server, or the consent-management runtime sits with a vendor, the artifact's **vendor and fourth-party register** records:

- The vendor's most-recent SOC 2 Type II report status (current, expired, qualified opinion, exception with management response) and the audit-rights posture under the firm-vendor contract.
- The vendor's penetration-test cadence and the firm's right-to-receive-results posture.
- The vendor's incident-notification clock under the firm-vendor contract (often 24 hours or less for cyber events) and the firm's right-to-cooperate posture.
- The vendor's fourth-party exposure (the vendor's own subcontractors with relevant access) — the Interagency Guidance on Third-Party Relationships (June 2023) sets the risk-based fourth-party expectation; the artifact records the firm's visibility.

Treating SOC 2 Type II as a substitute for the firm's own evidence is a common failure mode. The artifact records SOC 2 status as one input among several.

## Common pitfalls

- Asserting AAL2 without evidencing the authenticator type. SMS-OTP for first-factor reauthentication does not meet AAL2; the artifact records the gap.
- Reporting per-consumer scope enforcement as compliant when the API runtime returns the full data envelope and relies on the recipient to filter. The compliance is at the runtime, not at the recipient.
- Storing credentials in a hashed-but-recoverable form for legacy screen-scraping integrations and reporting the storage as compliant. The recoverability is the issue.
- Running consumer-revoked authorisations through the consent store without propagating to the active-token registry, the API runtime, or the credential-vault deletion. The deletion path must close end-to-end.
- Treating the federal banking agencies' 36-hour rule as the programme operator's clock rather than the sponsor bank's. The programme operator's clock is contractual.
- Omitting the §1033-implications row from the incident-response posture. Where authorisation flows or developer-interface tokens were affected, the data-rights frame implicates duties downstream of the cyber-event response.
- Treating SOC 2 Type II as a substitute for the firm's own evidence on vendor-managed key posture, vulnerability-management cadence, or incident-response cooperation terms.
