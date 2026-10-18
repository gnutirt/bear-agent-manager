# Troubleshooting: fintech-partner-controls

Recurring pitfalls. Read before drafting if the engagement looks unfamiliar; consult after drafting if the artifact does not feel right to a senior payments compliance reviewer or to a sponsor-bank TPRM reader.

## FinCEN MSB registration cited at §1010.380 instead of §1022.380

Symptom: the BSA / AML control row cites "31 CFR §1010.380" for the program operator's MSB registration on file. Sometimes phrased as a confident assertion of registration currency.

Why it fails: §1010.380 is the FinCEN Beneficial Ownership Information rule under the Corporate Transparency Act — a different obligation, on a different reporting channel, with a different legal status (the CTA has had a multi-year litigation and rulemaking history; verify current state on the analysis date). MSB registration sits at **31 CFR §1022.380**, runs through the FinCEN MSB Registration system, with initial registration within 180 days of becoming an MSB and renewal every two years. Citing §1010.380 reads as careless or as a categorical confusion between the BSA / Title 31 Subchapter X structure and the CTA structure. A sponsor-bank BSA officer or a state-MTL examiner reading through NMLS will catch it on first pass.

Fix: every MSB-registration citation reads `31 CFR §1022.380` with the registration-status posture (registered / not-registered-because-not-an-MSB-on-current-configuration / registration-not-yet-required) and the basis. The MSB-vs-not determination remains configuration-specific against the FinCEN administrative-ruling library; the registration cite is fixed.

## Treating the BNPL Interpretive Rule as live authority

Symptom: the customer-protection control row, the Reg Z applicability discussion, or the BNPL-segment row in a multi-product pack cites the CFPB Pay-in-Four Interpretive Rule (May 2024) as live authority for credit-card-like dispute-resolution treatment of BNPL.

Why it fails: the Interpretive Rule was nullified by Public Law 119-11 (CRA resolution of disapproval) effective May 9, 2025. It is historical only. Reg Z applicability to a Pay-in-Four BNPL product now turns on the product structure under the regulatory text and the firm's counsel-routed determination, not on the nullified interpretive rule. Citing it as live authority misstates the regulatory perimeter.

Fix: where the BNPL Interpretive Rule appears, mark it nullified by Pub. L. 119-11 (May 9, 2025) and historical only. Reg Z applicability is a product-structure-and-counsel question; the artifact records the firm's position with the basis (counsel memo on file, dispute-mechanic mapping) rather than asserting a categorical applicability conclusion. Same discipline carries to the CFPB larger-participant rule for general-use digital consumer payment applications (finalised November 21, 2024; nullified by Public Law 119-11 effective May 9, 2025).

## §1033 stayed compliance-date treated as live

Symptom: the open-banking / data-access control row carries a §1033 compliance-build work plan against a compliance-date schedule from the October 22, 2024 final rule, with milestones, vendor selection, and consent-management spend treated as in-flight against an active clock.

Why it fails: the §1033 compliance dates were stayed October 29, 2025 (Forcht Bank, N.A. v. CFPB) and the CFPB initiated a reconsideration with an ANPR on August 22, 2025. The clock is not running on its original schedule. Over-investing in compliance build before the ANPR follow-on is a budget exposure and a directional risk; under-investing on the assumption the rule is dead is the symmetric mistake. The artifact has to record posture, not assume calendar.

Fix: carry the §1033 status note wherever the rule is touched. Name the firm's role under §1033 (data provider, data recipient, both, none), the implementation tier as it stood at finalisation, the stay status, and the ANPR posture. Verify on the analysis date. Recommend a phased posture: monitor the ANPR docket, hold load-bearing build investment, complete inventory and consent-architecture readiness work that survives any plausible rewrite. The deep-dive lives in `open-banking-data-controls`; this skill names the posture and cross-links.

## MTMA framework state adoption assumed instead of verified through NMLS

Symptom: the licensing posture row reads "the firm's MTL footprint operates under the Money Transmitter Modernization Act framework" as a blanket statement across the state footprint. Or: a state-by-state row that shows MTMA adoption status as a single column without the version of the model law adopted, the effective date, or the firm's licence-renewal posture under the adopted version.

Why it fails: MTMA is a CSBS model law. Each state adopts on its own schedule and may modify the model on adoption; some states have adopted in full, some partially, some not at all, and some are mid-legislative cycle. Treating MTMA as if it were a uniform federal framework collapses the state-by-state operative obligations the artifact exists to evidence. NMLS is the licensing system of record and carries the per-state status; a state-MTL examiner reads against the version their state adopted, not against the model.

Fix: one row per US state in the firm's footprint. Per-state columns: licence type held, NMLS status, last exam date, expiration, MTMA adoption status (adopted-in-full / adopted-partial / not-adopted / pending-legislation), version-of-MTMA adopted, effective date, and any state-specific overlays (NY DFS BitLicense for VC activity; CA DFPI under CA Money Transmission Act and CCFPL; state-specific EWA frameworks). Verify state-by-state on the analysis date through NMLS; do not infer from a regional pattern.

## FBO daily-floor pass-through deposit-insurance documentation incomplete for the firm's product flows

Symptom: the FBO / customer-funds row records the subledger reconciliation cadence as "daily" and the deposit-insurance representation review as "complete" without the per-product flow-by-flow documentation underneath. The Part 330 §330.5 pass-through recordkeeping evidence is referenced as "on file with the sponsor bank" without the operator's own copy of the records, the disclosure consents, or the customer-by-customer beneficial-interest detail.

Why it fails: the daily-floor reconciliation is the practitioner floor that has emerged from post-2023 sponsor-bank consent orders and from the July 2024 Joint Statement; meeting it on cadence is necessary but not sufficient. Pass-through deposit insurance under 12 CFR Part 330 §330.5 requires the records to disclose the existence of the agency or custodial relationship, identify the actual owner of each deposit and the relationships and interests of all parties — the program operator owes evidence that those records exist for each product flow, not just that the sponsor bank reconciles a master-account total. Where the fintech runs multi-product flows (a checking-style deposit account, a savings-style yield product, a card-funding sub-balance, a BNPL repayment-pull holding flow) each flow has its own pass-through posture. A blanket "complete" hides the gap.

Fix: one row per product flow under the FBO architecture. Per-flow columns: subledger source system, reconciliation cadence (daily floor; intraday is common in BaaS-deposit), break-resolution SLA, aging, customer-facing FDIC representation per surface (web, mobile app, marketing email, statement, in-app push) reviewed against 12 CFR Part 328 Subpart B, pass-through recordkeeping evidence per Part 330 §330.5 with the actual record naming convention and storage location, escheatment posture by state. Cite the Joint Statement as supervisory guidance; cite Part 330 and Part 328 Subpart B as the binding text. Post-2024 examiner findings concentrate here.

## SAR-decision QA boundary between fintech and sponsor bank confused

Symptom: the BSA / AML control row records "fintech-side SAR-decision QA" as the firm's full coverage of the SAR programme, with no naming of the sponsor bank's principal-side QA, the §1867(c) third-party-bank-services-bank-examination posture (where the program operator is performing services subject to examination as if performed by the bank itself), or the operative SAR-filing chain.

Why it fails: the SAR-filing chain is not boilerplate. Different program operators sit in different places: filing directly under §1022.320 as an MSB; filing through the sponsor bank as the regulated FI; filing in both channels for the same activity in different roles; not filing because the activity does not trigger the threshold. The sponsor bank ultimately answers for the SAR programme its examiner reads against — the FFIEC BSA/AML manual, the principal-side QA, and §1867(c) examiner-access through services performed by the program operator. Conflating fintech-side QA with sponsor-bank-side QA misstates accountability and leaves the boundary undocumented; that boundary is where examiner findings and consent-order language sit.

Fix: the SAR-filing-chain row records, as fact: which entity files in which channel for which activity (MSB-direct under §1022.320 / through-the-sponsor-bank / both / not-applicable), the SAR-aging posture per channel, the fintech-side QA scope and sample posture, the sponsor-bank-side QA pass that the bank's BSA officer runs and the fintech's evidence-production duty into that pass, and the §1867(c) examiner-access posture (the sponsor bank's primary federal regulator can examine the activity at the program operator as if performed by the bank). Keep the determinations as fact, not as legal conclusions; counsel owns the legal characterisation.

## Program-agreement reporting cadence skipped or generic when the agreement is granular

Symptom: the sponsor-bank reporting cadence row reads "monthly operating-committee report; quarterly TPRM report" as a flat list. The underlying program-agreement clauses specify a granular cadence (Reg E timing-data report weekly within five business days of period end; FBO subledger reconciliation report daily within four hours of EOD; complaint-volume report monthly within ten business days; SAR-aging report monthly to the sponsor-bank BSA officer; control-event notification within 24 hours; quarterly KRI pack to the sponsor-bank operating committee) but the artifact does not surface them.

Why it fails: the program agreement is the operative authority on reporting cadence; the contractual clock typically runs tighter than any named-rail or regulator clock and is the row sponsor-bank TPRM reads first. A generic cadence row strips the artifact of its primary controls-evidence value. The same gap shows up in the missed-clock pattern from the sibling skill `payment-operations-incident-review` ("the program-agreement notification clause is contractual, runs independently of any named-rail or regulator clock, and is typically the tightest").

Fix: each load-bearing report named with definition, source system, threshold, clause reference, clock-start basis (per the program agreement), contractual deadline, owner role, recipient (sponsor-bank operating committee, sponsor-bank TPRM, sponsor-bank BSA officer, sponsor-bank consumer-compliance officer), cadence, and evidence of last delivery. Reg E §1005.11 timing data is the load-bearing report; NACHA return-rate monitoring is next; FBO subledger reconciliation report sits beside both; the control-event notification clock is named separately. If a named report has slipped, the artifact records it as a finding with named remediation.

## Engagement scope absent and not flagged

Symptom: the artifact reads as if a formal scope record were on file when it was not.

Why it fails: downstream skills key off the scope record (institution type, primary regulators, sector overlay set, persona, source posture). When scope was not formalised, the pack must say so; otherwise downstream consumers (`payment-operations-incident-review` reading the control inventory when an incident lands; `payments-risk-assessment` reading the program-agreement control map; `concentration-risk-review` reading the subcontractor register) cannot calibrate.

Fix: when the practitioner did not supply a formal scope record, ask the four questions (program-operator role and sponsor-bank construct; rails / products / customer base in scope; review trigger and audience; source posture) and default to public posture if the practitioner declines. Note in the artifact that scope was not formalised; do not silently apply a default.
