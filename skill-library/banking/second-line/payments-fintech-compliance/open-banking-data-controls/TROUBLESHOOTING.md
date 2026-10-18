# Troubleshooting: open-banking-data-controls

Recurring pitfalls. Read before drafting if the engagement looks unfamiliar; consult after drafting if the artifact does not feel right to a senior payments-compliance reviewer or to a sponsor-bank programme-management reader.

## Categorical "covered data" answers

Symptom: the data-provider scope block carries a single sentence asserting that "all consumer transaction data is covered" or "balance and transaction data are in scope" without the row-by-row inventory.

Why it fails: the rule's covered-data list is granular against the firm's specific account scope. Different account types carry different covered-data sets; a credit-card-equivalent product and a consumer asset account do not have the same scope. A categorical assertion is an examiner-friendly target; it also pre-commits the firm on edge cases (e.g., configuration data, stored payment instruments, payment-initiation information) that the rule treats specifically.

Fix: the data-provider scope block carries a row-by-row covered-data inventory against the firm's account scope, with each row's in-scope flag verified against the published rule and the firm's product configuration. Out-of-scope items carry a rationale row.

## Treating screen scraping as fine because it has been in production for years

Symptom: the screen-scraping migration plan block is empty, abbreviated, or framed as a footnote. The credential-storage inventory is missing or carries a single-line "vaulted" entry without recoverability detail.

Why it fails: the migration off credential-based screen scraping is the artifact's centre of gravity for any firm with legacy integrations. The rule explicitly contemplates the migration; the supervisory signal in CFPB and FTC actions establishes the credential-storage failure mode. Hashed-but-recoverable credentials are still credentials; reporting the storage as "vaulted" without addressing recoverability is a finding.

Fix: the screen-scraping migration plan block carries the credential-storage inventory (where credentials sit, encryption posture, vault rotation cadence), the deprecation roadmap (one row per legacy integration, with target migration date and status), the fallback posture during the migration window, the customer-impact assessment, and the sponsor-bank coordination posture where applicable. Where the inventory is empty, the block records "no legacy screen-scraping integrations" with the basis.

## Per-consumer scope enforcement at the recipient rather than at the API runtime

Symptom: the developer-interface posture block reports per-consumer scope enforcement as compliant, but the API runtime returns a fixed data envelope and the recipient is expected to filter to the consumer-authorised subset.

Why it fails: the rule places per-consumer scope enforcement at the data provider's API runtime, not at the recipient. A fixed-envelope API that relies on the recipient to filter is a finding regardless of whether the recipient does the filtering correctly. The compliance test is at the runtime.

Fix: the developer-interface posture block records the per-consumer scope enforcement row honestly. Where the API runtime does not enforce, the row records the gap and the migration-path commitment; the gap rolls into the gaps block with severity, owner, and target-close date.

## Conflating Safeguards with the data-rights frame

Symptom: the artifact treats GLBA Safeguards controls and the data-rights frame as a single undifferentiated control set. The cyber-controls block and the privacy-controls block carry the same row set.

Why it fails: the federal Safeguards Rule and the data-rights frame overlap on encryption, MFA, monitoring, and incident response, but the data-rights frame adds authorisation, scope, duration, revocation, secondary-use limits, and reauthorisation cadence as duties the Safeguards Rule does not carry. A Safeguards-compliant programme is not automatically data-rights-compliant; a gap in one is not automatically a gap in the other.

Fix: the cyber-controls block records the security posture (encryption, MFA, monitoring, incident response). The data-provider scope block, the developer-interface posture block, the authorisation-controls block, and the data-recipient duties block record the data-rights-specific duties separately. The privacy-controls block records the privacy-specific duties. Cross-references between blocks are explicit; the duty sets do not collapse into one row set.

## §1033 status note left as marketing copy

Symptom: the `s1033_status_note` block carries narrative language ("the firm is preparing for §1033", "we will be ready", "compliance roadmap in flight") without the structured field set.

Why it fails: the field is structured by design. Downstream consumers (vendor-diligence packs, incident reviews, privacy reviews) read the block directly; narrative language does not propagate. The rule's docket has been active since finalisation, and the date-stamp on the verification is load-bearing for any artifact claiming the firm's posture.

Fix: the block carries the four structured fields. `effective_date` with the Federal Register effective date and the `[verify]` flag where the analysis date has not been re-checked. `firm_implementation_tier` with the tier under the asset-size phase-in and the tier's compliance date. `litigation_status_as_of` with the date of the most recent docket check. `notes` with firm-specific posture. The block repeats verbatim in the source-citations footer.

## Dropping the developer-portal vendor from the fourth-party register

Symptom: the vendor and fourth-party register lists the sponsor bank, the aggregators, and the identity vendor, but does not list the developer-portal vendor that hosts the API documentation, the sandbox, and (often) the key issuance.

Why it fails: the developer-portal vendor sits in the data path. The vendor manages keys, hosts documentation that consumers may rely on, and runs the sandbox that recipients certify against. The Interagency Guidance on Third-Party Relationships (June 2023) sets the risk-based fourth-party expectation; missing the portal vendor is a TPRM gap regardless of whether the data flows through it directly.

Fix: the vendor and fourth-party register carries one row for the developer-portal vendor (function, criticality, evidence-of-oversight reference). Where the function is split across multiple vendors (documentation vendor, key-issuance vendor, authorisation-server vendor), each is a separate row.

## Mixing data-provider duties and data-recipient duties for both-sides firms

Symptom: a both-sides firm produces a single undifferentiated controls inventory mixing data-provider duties (developer interface, authorisation, third-party screening) and data-recipient duties (collection limits, retention, deletion-on-revocation, secondary use).

Why it fails: the duty sets are separate. The recommended disposition can differ across the two sides. Mixing them hides which side has gaps and which side is ready.

Fix: a both-sides firm produces two parallel control families with a shared current-state regulatory frame, shared cyber and privacy overlays, a shared vendor register, and a shared `s1033_status_note` block. Each side has its own self-evidence index, gaps row, and recommended disposition. The recommended dispositions are recorded separately in the artifact.

## Treating FDX alignment as compliance

Symptom: the artifact frames FDX-aligned message structure as evidence of compliance with the data-rights frame.

Why it fails: FDX is the de facto US industry standard. Alignment is supervisory expectation, not a legal obligation by itself. A firm that aligns to the FDX message structure but does not enforce per-consumer scope, does not propagate revocation, or charges for access is not compliant regardless of the FDX-alignment row.

Fix: the artifact distinguishes FDX alignment (an industry-standard implementation pattern) from compliance with the data-rights frame (the operative legal duty set). The developer-interface posture block records FDX alignment as one row; the rule-specific duties (per-consumer scope, free access, authorisation, revocation) carry their own rows.

## Default-to-USA on the state-privacy-law inventory

Symptom: the privacy-controls block carries a single "USA" or "state privacy" line for the state-privacy-law inventory.

Why it fails: state privacy laws diverge on consumer rights, sensitive-data category, opt-out mechanics, signal-handling, and enforcement. CCPA / CPRA differs from VCDPA differs from CPA differs from CTDPA. A default-to-USA row hides the state-by-state work an examiner or state AG will look for.

Fix: one row per state where the firm meets the comprehensive privacy law's threshold or the breach-notification statute applies. The block names the firm's resident footprint, the rights set in scope by state, the opt-out posture, and the signal-handling posture. Verify currency on the analysis date.

## Reauthorisation flow that drops authentication assurance

Symptom: the authorisation-controls block reports the one-year reauthorisation cadence as compliant; the cyber-controls block reports AAL2 for the consumer-facing flow. The reauthorisation flow itself runs on a magic link without a second factor.

Why it fails: the reauthorisation should re-establish authentication at the same AAL as the initial authorisation. A magic-link reauthorisation does not meet AAL2 because the authenticator type does not resist phishing in the same way. The artifact rows are consistent on paper but inconsistent in operation.

Fix: the authorisation-controls block records the reauthorisation cadence and the authentication-assurance posture in the reauthorisation flow. The cyber-controls AAL row reconciles against the reauthorisation flow specifically; a reauthorisation that drops AAL is recorded as a finding.

## DPA contractual coverage as evidence of operational compliance

Symptom: the data-recipient duties block reports operational compliance on collection limits, secondary use, retention, and deletion-on-revocation by citing the DPA.

Why it fails: DPA coverage is the contractual baseline. Operational evidence is the test. A DPA that contractually restricts secondary use to model improvement is not evidence that the model-training pipeline runs on de-identified data; a DPA that contractually requires deletion-on-revocation is not evidence that the deletion job runs and closes against the data store, the analytics derivatives, and the vendor-managed copies.

Fix: each row in the data-recipient duties block carries the DPA-vs-actual reconciliation. The DPA reference and the operational evidence reference both appear; where the operational evidence is missing, the row is `[evidence needed]` and the gap rolls into the gaps block.

## Engagement scope absent and not flagged

Symptom: the artifact reads as if a formal scope record were on file when it was not.

Why it fails: downstream skills key off the scope record (institution type, primary regulators, sector overlay set, persona, source posture). When scope was not formalised, the pack must say so; otherwise downstream consumers (`fintech-partner-controls` updating after this review, `payment-operations-incident-review` cross-linking on a subsequent incident, `third-party-operational-resilience/vendor-diligence` running on an aggregator-recipient) cannot calibrate.

Fix: when the practitioner did not supply a formal scope record, ask the questions in the SKILL's "Ask first" section and default to public posture if the practitioner declines. Note in the artifact that scope was not formalised; do not silently apply a default.
