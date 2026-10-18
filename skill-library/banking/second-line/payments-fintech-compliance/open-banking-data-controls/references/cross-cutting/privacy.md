# Cross-cutting overlay — privacy

Required-on for every engagement run through this skill. Open banking is fundamentally a privacy domain: the data being shared is consumer financial data, the consumer's authorisation and revocation is the operative control, and the federal and state privacy frames sit alongside the data-rights frame as parallel duty sets that overlap but are not the same. This overlay is the artifact's largest cross-cutting block; it carries the federal privacy-notice posture, the state-privacy-law inventory, the dual-purpose consent stack, the retention and deletion duties, the secondary-use posture, and the signal-handling detail that the **privacy controls** named section reflects.

The overlay does not substitute for a privacy-counsel-led review of customer-facing notices, for a state-by-state privacy-law inventory across the firm's resident footprint, or for a data-mapping exercise. The pack records the supervisory-level controls posture and the evidence-of-oversight; deeper privacy work flows to the privacy office or to a counsel-led review.

## Anchor frame

- **CFPB Personal Financial Data Rights Final Rule under §1033 of the Dodd-Frank Act** (October 22, 2024 — verify Federal Register citation, exact citation, implementation tier dates, and current docket status). The rule is the central anchor; the `s1033_status_note` block carries the firm-specific application.
- **GLBA Privacy Rule / Reg P, 12 CFR Part 1016**. Initial and annual privacy notices, sharing limits, opt-out mechanics. Applies where the firm is CFPB-supervised under the prudential framework.
- **FTC GLBA Privacy Rule, 16 CFR Part 313**. Applies where the firm is FTC-supervised.
- **GLBA Safeguards Rule, 16 CFR Part 314** as amended (FTC, December 2021 amendments effective 2023). The Safeguards Rule and the Privacy Rule sit as parallel federal duties; both apply to the same data.
- **California Consumer Privacy Act / California Privacy Rights Act** — Cal. Civ. Code §1798.100 et seq. Consumer rights to know, delete, correct, opt-out of sale and sharing; sensitive-personal-information limits; data-breach private right of action under specific conditions.
- **Rolling state-privacy-law landscape** — Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Utah (UCPA), Texas (TDPSA), Oregon (OCPA), Montana (MTCDPA), and others (verify currency on the analysis date). Each carries its own consumer-rights set, sensitive-data category, opt-out mechanics, and enforcement posture.
- **State breach-notification statutes** — state-by-state; verify per state in the firm's resident footprint.

## §1033 status note

The `s1033_status_note` block is required and cannot be blank. It is the cross-skill contract; the same field structure propagates into any downstream artifact that touches the data-rights frame. The block carries:

- **`effective_date`** — the rule's effective date as cited in the Federal Register, with `[verify]` flag where the analysis date has not been re-checked.
- **`firm_implementation_tier`** — the firm's tier under the data-provider asset-size phase-in, with the tier's compliance date.
- **`litigation_status_as_of`** — date of the most recent docket check, with notes on any active litigation, stays, or compliance-date relief.
- **`notes`** — any firm-specific posture (early-adopter, lagging, BaaS-stack-coordinated, awaiting sponsor-bank readiness, screen-scraping migration in progress).

Defaulting the status note to "we will be ready" without naming the firm's tier and implementation-date posture is a finding. The block is structured, not narrative.

## Federal privacy notices

The artifact's **privacy controls** block records:

- **Initial privacy notice content** (Reg P §1016.4 / FTC §313.4). Reviewed against the data-sharing flow: the categories of information collected, the categories of affiliates and non-affiliates with which information is shared, the categories of consumers, and the firm's policies and practices for protecting confidentiality and security. A notice drafted before the data-rights programme launched and not updated to reflect data-recipient flows is a frequent gap.
- **Annual privacy notice posture** (Reg P §1016.5 / FTC §313.5). The firm provides an annual notice unless an exception applies. The artifact records the exception posture and the annual-notice cadence where the exception does not apply.
- **Opt-out mechanics** (Reg P §1016.7 / FTC §313.7). Where the firm shares non-public personal information with non-affiliates outside the §502(e) exceptions, the opt-out mechanism applies. The data-rights frame's consumer-authorisation flow is not a substitute for the GLBA opt-out; the two run as parallel consumer-facing surfaces.

## State privacy frame

The artifact records one row per state where the firm meets the comprehensive privacy law's threshold or the breach-notification statute applies. The block is not a single "state privacy" line; states behave differently and the artifact must keep them separate.

- **California CCPA / CPRA.** Consumer rights to know, delete, correct, opt-out of sale and sharing, opt-out of sensitive-data processing. Sensitive personal information includes financial-account data; the data-rights flow implicates the SPI category. Opt-out signals (Global Privacy Control) must be honoured. The data-breach private right of action under §1798.150 applies for unauthorised access and exfiltration of certain categories of personal information, subject to specific conditions.
- **Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Montana.** Each carries its own consumer-rights set, sensitive-data category, opt-out mechanics, and enforcement posture (verify currency on the analysis date). The artifact records the state-by-state row with the firm's resident footprint, the rights set in scope, and the opt-out posture.
- **State breach-notification statutes** — one row per state where customer information was implicated and the state's notification trigger is met. Timing windows vary; the artifact records each state's clock separately. Defaulting to a single "USA" row is a finding.

## Dual-purpose consent stack

The data-rights frame's consumer authorisation runs alongside the GLBA notice/opt-out frame and the state-privacy-law consent frame. The three are not interchangeable. The artifact records:

- The consumer-facing **authorisation flow** under the data-rights frame (scope, duration, revocation, reauthorisation). This is the data-rights-specific consent.
- The consumer-facing **GLBA notice** (initial and annual) and the **opt-out posture** (where applicable). This is the federal privacy frame's consent surface.
- The consumer-facing **state-privacy-law consent** (CCPA / CPRA opt-outs, sensitive-data limits, GPC signal handling; rolling state-law equivalents). This is the state frame's consent surface.

A common failure mode: rolling all three into a single "Privacy Policy" page with a checkbox at the bottom. The three serve different statutory frames with different content requirements; the artifact records each as a separate row with the named anchor and the evidence of operational delivery.

## Retention and deletion duties

The artifact records the operational deletion path end-to-end:

- **Retention schedule** by data category (covered data under the data-rights frame; non-covered data subject to GLBA and state privacy frames). The schedule names the retention period and the legal basis.
- **Deletion-on-revocation path.** Consumer revokes authorisation; the data recipient stops collecting; the recipient runs the deletion job against its data store, against any analytics derivatives, against any vendor-managed copies, and against any backup-restore exclusions. The audit trail records each step. A revocation captured in the consent store but not enforced operationally is a finding.
- **Deletion-on-state-rights-request path.** Consumer exercises a state-law deletion right (CCPA / CPRA / VCDPA / etc.); the firm runs the same deletion job under the state-law rather than the data-rights basis. The two paths can converge on the same operational job; the artifact records both as covered.
- **Backup-restore posture.** Most firms exclude deleted records from backup-restore; the artifact records the exclusion mechanism and the named retention period for backup-only records.

Treating DPA contractual coverage as evidence of operational deletion is a frequent failure mode. DPA coverage is the contractual baseline; the artifact reconciles the contractual baseline against the operational deletion-job evidence.

## Secondary-use posture

The data-rights frame places secondary-use restrictions on data recipients: the recipient may use covered data only for purposes the consumer authorised. Common secondary uses that require separate analysis:

- **Model training.** Using covered data to train fraud-detection models, underwriting models, recommendation engines. The artifact records whether the secondary use sits within the consumer-authorised scope, whether the firm has a separate consent for it, and whether the model-training pipeline runs on de-identified or aggregated data.
- **Benchmarking and analytics.** Using covered data to produce aggregate insights, benchmarks, or analytics products. The artifact records the de-identification posture (re-identification-resistance evidence) and the consumer-disclosure posture.
- **Marketing and cross-sell.** Using covered data to drive marketing or cross-sell. The data-rights frame is restrictive on this; the artifact records the consumer-consent basis and the §1033-specific limits.

A recipient that documents the secondary-use posture in the DPA but cannot evidence operational enforcement is a finding.

## Signal handling

The artifact records the firm's handling of consumer privacy signals:

- **Global Privacy Control (GPC)** for state-law opt-outs (CCPA / CPRA mandates honouring the signal as an opt-out of sale and sharing; other state laws are converging).
- **Do-not-track and other browser signals** (informational; few statutes mandate honouring them).
- **Consumer-direct revocation requests** through the data-rights consent flow, the firm's privacy-rights portal, and any vendor-managed consent surface. The artifact records the routing and the operational deletion path for each surface.

A signal received at one surface that does not propagate to the operational deletion path at all data stores is a finding.

## Vendor data-processing posture

Where the data flow runs through a vendor (aggregator, developer-portal vendor, consent-management vendor, identity vendor, fraud-decision vendor), the artifact's **vendor and fourth-party register** records:

- The vendor's **data-processing agreement (DPA)** coverage of the affected data category and the secondary-use scope (model-improvement, benchmarking, anonymous-aggregate use).
- The vendor's notification clock under the DPA and the vendor's actual notification posture.
- DPA-vs-actual reconciliation (the contractual baseline against the operational fact).
- The vendor's fourth-party exposure (the vendor's own subcontractors with relevant access) — the Interagency Guidance on Third-Party Relationships sets the risk-based fourth-party expectation.

## Customer-notification posture for privacy-leg breaches

Where a breach in the data flow touches personal data, the artifact's customer-notification block records:

- **Notification content.** Tracks each state's content requirements (date of incident, nature of personal information involved, steps taken, advice on what the resident can do, contact information). Some states require specific language (e.g., on credit-monitoring offers).
- **Channel.** Tracks each state's channel requirements (substitute notice when direct notice is impracticable; specific direct-notice methods). Email is permitted in many states but not all.
- **The data-rights-specific posture.** Where the breach implicates the data-rights consent flow (e.g., unauthorised access to the consent store, unauthorised token issuance), the artifact records the §1033-implications row and the cross-link to `payment-operations-incident-review`.

Vague language ("we are addressing a security matter") is a finding; state AG offices have pursued under-disclosed customer notifications.

## Common pitfalls

- Treating GLBA as the only privacy frame and missing the state regimes in CA, VA, CO, CT, UT, TX, OR, MT, and other states where the firm meets the threshold.
- Rolling the data-rights authorisation flow, the GLBA notice/opt-out, and the state-privacy-law consent into a single "Privacy Policy" surface. The three serve different statutory frames.
- Defaulting the §1033 status note to "we will be ready" without naming the firm's tier and implementation-date posture.
- Treating DPA contractual coverage as evidence of operational deletion. DPA coverage is the baseline; operational deletion-job evidence is the test.
- Documenting secondary-use restrictions in the DPA without evidencing operational enforcement (model-training-pipeline scope, benchmarking-derivative posture, marketing-use posture).
- Storing the consumer-revocation event in the consent store without propagating to the data store, the analytics derivatives, the vendor-managed copies, and the backup-restore exclusions.
- Failing to honour the Global Privacy Control signal for CCPA / CPRA opt-outs.
- Drafting customer-notification text against a single state's content requirements when the affected population spans multiple states.
- Treating the data-rights frame and the GLBA Safeguards Rule as the same control set. They overlap on encryption, MFA, monitoring, and incident response, but the data-rights frame adds authorisation, scope, duration, revocation, secondary-use limits, and reauthorisation cadence as duties the Safeguards Rule does not carry.
