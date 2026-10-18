# Troubleshooting: sanctions-screening-qa

Recurring pitfalls. Read before producing the QA artifact and again before sign-off.

## Scope discipline

### Drifting into the match-or-no-match decision

The QA produces findings, gaps, and recommendations against the sanctions program evidence. It does not direct whether to release, block, reject, or report a transaction or relationship. Match decisions and OFAC reporting are regulated acts reserved to the sanctions officer (and the firm's escalation chain). The skill outputs `recommendation`, not `decision`. A QA artifact that says "the alert at row 47 should have been blocked" or "this customer should be reported" has misread its scope.

### Reviewing the screening-engine model instead of program evidence

Whether the screening engine is well-tuned (precision, recall, BTL testing, threshold calibration) belongs in `aml-model-monitoring`. Whether the program evidence shows defensible work belongs here. The QA cross-references model-monitoring; it does not absorb tuning analysis.

### Treating CDD or BO posture as in-scope

Customer beneficial-ownership work belongs in `cdd-risk-review`. The screening QA can flag a 50 Percent Rule aggregation gap that depends on BO evidence and cross-reference; it does not handle the BO refresh itself.

## List-management discipline

### Measuring list-update timeliness against the institution's internal publication

The OFAC publication date is the benchmark, not the institution's internal publication. A program that publishes internally 4 hours after OFAC and reports "0-hour lag" against its own publication has measured the wrong thing. The QA reads timing against OFAC publication.

### Reading delta-update cadence without reading delta-vs-full reconciliation

A program can be fast on deltas and still drop designations between full re-scan cycles. The QA reads both the delta cadence and the reconciliation evidence; either alone is insufficient.

### Treating feed-mapping completeness as inferred from response time

A system that does not ingest a designation type (e.g., the SDN List's Digital Currency Address records) is silent on that designation type, not slow. The QA reads feed-mapping completeness as a discrete control, not an inference from observed response time.

### Missing list-as-of dates on every list citation in the artifact

OFAC lists move. Any sanctions QA artifact that does not date its list citations cannot be relied on after the next list update. Every list reference in the artifact carries a `date_as_of`.

## Screening-configuration discipline

### Match logic and fuzzy thresholds not papered

The reviewer cannot reproduce why a specific score crossed or did not cross threshold without configuration documentation. The `screening_configuration` field forces structured documentation; an undocumented configuration is a `match_logic_documentation` finding.

### Exclusion lists / good-guy lists treated as operationally invisible

An undocumented exclusion list with no owner, refresh cadence, or re-review evidence is a material `exclusion_list_governance` finding. Exclusion lists are control instruments and have to be governed as such.

### Fuzzy threshold set on vendor recommendation alone, no calibration

A fuzzy threshold inherited from the vendor without institution-specific calibration (BTL testing, false-positive-rate analysis, false-negative-rate analysis on a labelled sample) is a `fuzzy_threshold_calibration` finding. Vendor recommendations are starting points, not endpoints.

## Disposition discipline

### Generic FP rationale documented at the disposition level

"Reviewed, not a match" or "false positive" without a category from the documented rationale taxonomy is the most-common finding in alert-disposition QA. Without a taxonomy, tuning evidence is impossible. Set `fp_rationale_category` to `generic-or-boilerplate` and surface as a finding.

### Decision-maker independence not evidenced

Where the relationship owner can dispose of a sanctions alert on a customer they own, structural independence has been broken. The QA reads `decision_maker_role` against the relationship-owner role for each sampled alert.

### 50 Percent Rule applied case-by-case at analyst discretion

Aggregate ownership across multiple blocked persons is missed when the program has no documented aggregation methodology. The methodology has to be documented at program level and signed by the sanctions officer; analyst-discretion handling is a `fifty_percent_rule_methodology` finding.

### SSI and other sectoral programs collapsed into SDN-style blocking

Sectoral and restriction programs carry directive-specific prohibitions (debt / equity tenor restrictions, restricted-securities handling, prohibited service categories) that are not the same as SDN blocking. A program that treats SSI hits like SDN hits has missed the directive-specific limb.

## List-event response discipline

### No standing cyber-overlay assessment for designation types that intersect virtual currency

When the event includes virtual-currency-adjacent designations (mixer-address adds, virtual-currency-related typology adds), the cyber overlay engages as a standing list-event step. A program that runs the customer sweep and the rail re-scan but skips the designation-type cyber-overlay assessment misses the dominant evasion typology of the last several years.

### Cross-rail consistency check not documented

A customer that hits on wire and clears on ACH within the same window without documented investigation is the failure mode the cross-rail check catches. Cross-rail consistency is part of the post-event sweep, not a routine control.

### Post-event customer-base sweep documented but post-event payment-rail re-scan missing

In-flight transactions against a new designation are the exposure. A bank that sweeps the customer base and not the payment rails has missed in-flight activity.

## Cyber-evasion overlay discipline

### Treating mixer-address designations as a name-match exercise

The SDN List's Digital Currency Address identifier records require ingestion at the screening engine for address-level screening. Name-only screening does not reach mixer-address designations. The QA reads `address_level_screening_capability_status` discretely.

### Reading the analytics-vendor output as a primary source

Blockchain-analytics-vendor outputs are vendor outputs. Cite the vendor in the source trace and route vendor-diligence to `third-party-operational-resilience/vendor-diligence`. Treating the vendor's clustering or attribution as primary evidence collapses the source-tier and inflates the QA's confidence.

### Pre-payment OFAC analysis on ransomware-payment paths is policy-only

A program with a pre-payment-analysis policy and no test evidence (no example case showing the analysis actually happens before payment) carries the strict-liability exposure articulated in the OFAC ransomware advisory. The QA reads test evidence, not policy text.

### Sanctions-officer routing missing on cyber-payment paths

Treasury or operations teams making time-pressure incident-response payments without sanctions-officer routing is the failure mode. The QA reads routing evidence at the case level, not the program-level statement.

### Importing generic cyber-controls language into the sanctions-screening QA

NYDFS Part 500 program-level controls and SEC cyber 8-K disclosure are not in scope here; they sit elsewhere in the repo. The cyber overlay on this skill is tight to evasion typologies anchored in OFAC and FinCEN material.

## Sector-specific pitfalls

### Importing the FFIEC bank-flavoured frame to a BD or fund

The FFIEC OFAC section informs but does not bind BDs and funds. SEC and FINRA examiners are the primary audience. The QA reads against the firm's WSPs (FINRA Rule 3110) and the fund's compliance program (Rule 38a-1).

### Scoping insurance sanctions screening to covered products only

The insurer's BSA / SAR program operates against covered products only. The OFAC obligation does not stop at covered products; OFAC reaches every US person across all lines. A program that scopes sanctions screening to covered products only has a foundational finding.

### Reading payments-fintech screening as if the fintech were the obligor

Where the sponsor-bank program agreement allocates screening responsibility, the QA reads the allocation. Reviewing the fintech as if it were the sole obligor (or as if the bank's read were sufficient on its own) misses the dual read the program agreement requires.

### Restricted-securities-list compliance treated as a customer-screen exercise

Lists like NS-CMIC carry transaction-level prohibitions on the security itself. The QA reads whether the order-management system applies a security-level block, not just whether the customer name screened clean.

## Output discipline

### Citing without sections

Every regulator citation in the QA carries a section reference or a `[verify section]` placeholder in the source-anchors file. URL alone fails the source-anchor depth check. Use `references/source-anchors.md` for the canonical citation set; do not restate excerpts in the artifact body.

### Marking unsupported claims silently

Use `[evidence needed]` explicitly. An inferred claim presented as evidenced is the failure mode.

### Closing with too much certainty

The confidence label is `high` only when the source posture, the evidence set, and the QA criteria all line up. `medium` and `low` are normal for early-stage QA work on a program where firm policy has not yet papered every control. A `high` confidence label on a QA reviewing a program with material findings is incoherent.

### Missing date-as-of on list citations

Repeat from list-management discipline above because it is the most-common output defect: every OFAC list citation in the artifact carries a date-as-of.
