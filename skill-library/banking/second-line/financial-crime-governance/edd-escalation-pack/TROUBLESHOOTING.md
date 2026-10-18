# Troubleshooting: edd-escalation-pack

Recurring pitfalls. Read before producing the EDD pack and again before sign-off.

## Scope discipline

### Drifting into the retention or exit decision

The EDD pack assembles evidence and surfaces decision options. It does not retain, restrict, or exit. The named decisionmaker is the EDD committee or the designated EDD approver. A pack that reads "retain the relationship" or "exit the relationship" as a conclusion has misread its scope. Frame the pack's output as decision options the gate evaluates, with stop conditions and conditions on retention.

### Building the EDD pack without an upstream CDD baseline

The EDD pack consumes a CDD baseline. Where `cdd-risk-review` has not run on the customer or has run with material gaps, the EDD pack notes the missing baseline and flags it as a finding; it does not paper over the gap. A pack drafted on no upstream CDD baseline is structurally thin.

### Re-litigating adverse-media triage

Adverse media on the customer is triaged by `negative-news-triage`. The EDD pack consumes the triaged outputs; it does not replay the source-tier or identity-confidence work. A pack that re-triages adverse media has stepped into the adjacent skill's scope.

### Re-disposing sanctions hits

Sanctions hits on the customer are disposed by `sanctions-screening-qa`. The EDD pack reads the screening QA outputs and the dispositions; it does not re-dispose. A pack that re-disposes a hit has stepped into the adjacent skill's scope.

### Re-tuning monitoring scenarios

Scenario tuning belongs to `aml-model-monitoring`. The EDD pack flags scenario implications for the post-EDD profile and cross-references; it does not re-tune. A pack that includes scenario thresholds or tuning recommendations has stepped into the adjacent skill's scope.

## PEP discipline

### Treating PEP status as automatically EDD-required

The 2020 joint statement clarifies that PEP status alone does not trigger EDD; firms apply EDD on a risk basis. The pack records the PEP determination, the source of the finding, and the date, then builds the EDD case on the risk-based combination (PEP plus product, jurisdiction, structure, transactional pattern, adverse media). A pack that triggers EDD on PEP status alone is over-reading the rule.

### PEP status assessed once and treated as immutable

Family / close-associate status, political role changes, and adverse-media accumulation move; PEP determinations need a refresh date and a refresh trigger. The pack records the date of latest assessment and the source; a stale PEP determination on a long-tenured relationship is itself a finding.

### Treating commercial PEP-screening-tool flags as evidence

A commercial PEP-screening tool's flag is one input. The pack reads the underlying source (public political register, government appointment record, news source) and dates the read.

## Source-of-wealth discipline

### Customer self-attestation treated as corroboration

A SoW statement from the customer is the customer's claim. Corroboration is what other file evidence provides (public records, third-party documentation, prior-firm references, asset documentation). The pack keeps the statement and the corroboration on different lines.

### Stale SoW left in place at EDD refresh

Long-tenured high-net-worth customers frequently carry SoW statements that predate material life events (business sale, inheritance, role change). The EDD refresh is the moment to refresh the SoW with corroboration; leaving an 11-year-old SoW in place at refresh is a finding.

### SoW corroboration mis-matched to the wealth category

Corroboration that fits inherited wealth (probate, family-trust deeds) does not fit a business-sale narrative (transaction documentation, public-source confirmation). The pack matches corroboration to the category; otherwise the corroboration field is thin.

### Treating prior-firm references as standalone corroboration

A prior-firm reference is one input on top of independent public-source or transactional documentation. The pack does not treat a prior-firm reference as standalone corroboration on a high-risk SoW.

## Source-of-funds discipline

### SoF on inbound wires summarised without the originating account

The originating account, the originating account holder, and the relationship of that holder to the customer are the load-bearing details. A "wire from a foreign correspondent" summary without the originating-account read is thin SoF.

### Third-party funding not surfaced as such

Where the customer is not the funder of an inbound flow (third-party-funded premium on a covered insurance product; third-party-funded inbound wire on a private-banking account), the pack reads the third-party relationship explicitly. Glossing the funder as "customer-related" is a finding.

## Beneficial-ownership discipline

### Stopping at the certification form on a complex-structure entity

The `§1010.230` certification form is one layer. The EDD pack walks the chain layer by layer for high-risk profiles: certification → entity filings → trust intermediaries → foreign holding companies → control parties. Residual uncertainty per layer goes in the pack explicitly.

### Inconsistency check skipped

The certification on file may be inconsistent with the latest entity filings, signatory list, public filings, or transactional patterns implying undisclosed control. The pack runs the inconsistency check and flags the finding.

### Asserting BOI filing status without an as-of date

`31 CFR §1010.380` (CTA implementing rule) has had live litigation; the entity-class scope and the rule-state have moved. The pack marks `boi_filing_status` with an as-of date and the rule-state read on that date, and uses the `[verify]` flag where the rule-state is unsettled.

### Trust-customer scope mis-applied

`§1010.230` does not apply to trusts as legal-entity customers. Trust-specific due diligence sits in the institution's program, which the EDD pack reads against. Applying the BO certification form to a trust customer is a rule-scope error.

## Section 312 (foreign correspondent) discipline

### Reading `§1010.610` on a customer that is not a foreign FI

The rule has a defined scope. The pack confirms the customer is a foreign FI under the rule before applying the EDD elements. A bank's wire counterparty in a foreign jurisdiction is not automatically a `§1010.610` customer.

### Treating the respondent's CBDDQ as standalone evidence

CBDDQ is industry-standard documentation; it is one input on top of the rule's elements. The pack reads the CBDDQ alongside the home-country regime read, the public-information read, and the nested-correspondent disclosure.

### Missing the nested-correspondent disclosure

The respondent's downstream correspondent customer base by jurisdiction is the load-bearing element on indirect exposure. Incomplete or stale disclosure is a finding.

### Sanctions exposure through customer base not quantified

Clear screening of the respondent itself does not close the sanctions-exposure-through-customer-base question. The pack reads both; the customer-base read is at named-jurisdiction granularity where the firm's program supports it.

### Payable-through-account considerations missed

Where the respondent's account permits its customers to engage in banking activities directly, the heightened-scrutiny path applies. The pack reads the product mix at the respondent and flags any payable-through-account-adjacent product line.

## Section 311 discipline

### Asserting a Section 311 position without a current designation read

Section 311 designations and the special measures they impose move. The pack reads the current designation status against the customer's exposure where applicable; an outdated read is a finding.

## Conduct overlay discipline

### Folding conduct in as a label

A conduct finding needs an indicator type, evidence, severity, and an anchor. "PEP-adjacent reputational exposure" without source, date, or materiality is a label, not a finding.

### Loading the conduct overlay where it does not bear on the relationship

An institution-to-institution correspondent relationship without a retail-customer-conduct nexus does not load the conduct overlay. The pack loads the overlay only where the customer profile makes conduct exposure material.

### Conduct overlay anchors mis-matched to the firm's regulator constellation

FCA conduct anchors on a US-only firm without UK nexus are out of scope. The pack loads the conduct anchors that apply to the firm's regulator constellation.

## Sanctions-screening posture discipline

### Importing screening dispositions without the rationale pointer

A historical hit marked "resolved" with no disposition rationale pointer is a thin posture statement. The pack carries the disposition rationale pointer (cross-reference to `sanctions-screening-qa`).

### Connected-party screening posture summarised without the named parties

Beneficial owners, signatories, and key counterparties are connected parties. The pack names the parties screened and the disposition; "all connected parties screened" without naming is thin.

## Output discipline

### Citing without sections

Every regulator citation in the pack carries a section reference or a `[verify section]` placeholder in the source-anchors file. The pack body does not carry `[verify section]`; the source-anchors file does.

### Marking unsupported claims silently

Use `[evidence needed]` explicitly. An inferred claim presented as evidenced is the failure mode the source-trace structure exists to prevent.

### Closing with too much certainty

The confidence label is `high` only when source posture, file evidence, and EDD criteria all line up. `medium` and `low` are normal where the gaps are part of the finding; `unknown` is honest where the firm has not yet resourced the evidence ask. A `high` confidence label on a pack with material SoW or sanctions-exposure gaps is incoherent.

### Pack over-extending into the next skill or the prior skill

`cdd-risk-review` is upstream. `negative-news-triage`, `sanctions-screening-qa`, `aml-model-monitoring`, `sar-decision-qa` are adjacent. The EDD pack consumes upstream and adjacent records and cross-references; it does not re-do their work.

### No sign-off block

The pack carries a sign-off block (drafter, reviewer, approver) so the audit trail is on the artifact. A pack without a sign-off block has shipped half the artifact.
