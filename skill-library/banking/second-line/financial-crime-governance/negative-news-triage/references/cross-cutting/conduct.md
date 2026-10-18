# Conduct cross-cutting overlay — negative-news-triage

Loads when the scope `cross_cutting_overlay_set` includes `conduct`. The overlay shapes the materiality read and the routing for adverse-media hits whose substance is customer-facing harm, sales-practice exposure, market-conduct exposure, or vulnerable-customer-overlap rather than (or in parallel with) a financial-crime typology.

## Why the conduct overlay matters here

Adverse media on a customer frequently surfaces conduct-risk content alongside or instead of financial-crime-typology content. A CFPB UDAAP order on a commercial customer is reputationally and conduct-relevant but may carry no financial-crime typology link. A churning or fiduciary-duty enforcement on an investment-adviser customer is conduct-relevant; the AML-typology link runs only through the proceeds-typology read where applicable. A sales-practice press surface on an insurance-producer customer is conduct-relevant in the producer-oversight lane. The overlay's discipline is to name the conduct dimension as a parallel routing — to consumer compliance, to the conduct-risk committee, to producer oversight, to the fair-lending function — rather than collapse it into the AML triage or drop it because it does not fit the typology library.

A second motivation: vulnerable-customer profiles (elderly customers, customers in financial distress, customers with cognitive impairment, customers in protected classes) intersect with high-risk-customer profiles. Adverse media on a customer that surfaces vulnerable-customer-harm patterns belongs in the conduct lane even when it also triggers an AML-typology read.

## Source basis

- **CFPB UDAAP Examination Manual** — unfairness, deception, and abusive-act framing for consumer-finance customer-harm patterns. https://www.consumerfinance.gov/compliance/supervision-examinations/
- **CFPB Compliance Bulletins and Circulars** — CFPB published positions on UDAAP and adjacent consumer-finance topics. https://www.consumerfinance.gov/compliance/circulars/
- **FINRA Rule 2010** (standards of commercial honor and just and equitable principles of trade) and **FINRA Rule 2111** (suitability) — broker-dealer conduct framing.
- **17 CFR §240.15l-1 (Regulation Best Interest)** and **17 CFR §275.211 (Investment Adviser fiduciary-duty interpretation)** — adviser and broker-dealer conduct framing.
- **SEC EXAMS Risk Alerts on adviser conduct** — published priorities on fiduciary duty, fee transparency, suitability, churning.
- **NAIC Market Regulation Handbook** — insurance market-conduct, sales-practice, claims-handling, advertising, and producer-oversight framing.
- **State insurance department market-conduct examinations and enforcement** — state-by-state.
- **State unfair-trade-practice statutes** — vary by state; the firm overlay names state-specific anchors.
- **FinCEN Advisory on Elder Financial Exploitation (FIN-2022-A002)** [verify date] — the elder-financial-exploitation typology overlap with vulnerable-customer adverse media.
- **FCA Conduct Risk framework (UK reference)** — sometimes useful as a taxonomy in US firms with UK affiliates; not US-binding.

## What the overlay adds to the triage

### Materiality read additions

When the underlying adverse-media substance is customer-facing harm or sales-practice exposure rather than (or in parallel with) a financial-crime typology, the per-hit materiality field carries a **conduct-dimension tag** alongside the AML typology tag. The conduct-dimension tag distinguishes:

- **Customer-finance UDAAP exposure** (CFPB UDAAP framing) on a commercial-customer hit.
- **Sales-practice exposure** (FINRA Rule 2010 / 2111 framing, Reg BI framing, adviser fiduciary-duty framing) on a broker-dealer or adviser customer hit.
- **Market-conduct exposure** (NAIC Market Regulation framing) on an insurance customer hit.
- **Vulnerable-customer overlap** (elder financial exploitation, customers in protected classes, customers in financial distress) on any customer hit.
- **Cultural-pattern indicator** (multiple findings together suggesting a culture-and-conduct-risk pattern across the customer's product lines or operating segments).

A hit can carry both an AML typology tag and a conduct-dimension tag; they are not mutually exclusive. A hit can carry only a conduct-dimension tag with no AML typology link; the routing is then conduct-only.

### Linkage-strength interaction

The linkage-strength label (direct involvement, association, mention only) reads the same way for conduct as for AML typologies. A tier-1 conduct hit with direct involvement (the customer is the named respondent in a CFPB UDAAP order, the named subject in a FINRA disciplinary action, the named subject in a state-insurance-department market-conduct enforcement) carries different routing weight than a mention-only conduct hit.

### Vulnerable-customer overlap

Where the customer or a beneficiary is a vulnerable individual or where the customer's customer base includes vulnerable individuals (e.g., the customer is a small business serving an elder-care population, a debt-collector serving low-income customers, a payday-product issuer), adverse media on the customer's harm patterns carries a heightened materiality read in the conduct lane. The FinCEN elder-financial-exploitation advisory provides the typology link where elder-customer-harm patterns are surfaced, and the conduct lane carries the parallel conduct-risk routing.

### Routing additions

When the conduct-dimension tag is present, the routing line names a parallel destination alongside (or instead of) the AML routing:

- **Consumer compliance / CCO routing** for UDAAP-flavored hits on consumer-finance customers.
- **Conduct-risk committee routing** for sales-practice and culture-pattern hits.
- **Producer-oversight routing** for insurance-producer-customer hits with sales-practice or market-conduct exposure.
- **Fair-lending function routing** where the underlying conduct surfaces a fair-lending overlap (ECOA, Fair Housing Act, HMDA implications).
- **Adviser-supervision routing** for SEC-EXAMS-risk-alert-aligned adviser-conduct hits.

The conduct routing is parallel to the AML routing, not a substitute. A hit that carries both a fraud typology tag and a UDAAP conduct tag routes to the AML lane (`cdd-risk-review` event-driven refresh and `edd-escalation-pack` where applicable) and to the conduct lane (consumer-compliance routing) simultaneously.

### Severity calibration interaction

The conduct lane uses the AML triage's source-tier and identity-confidence reads as inputs but layers its own severity calibration on top. Identifiable-systemic-harm patterns with restitution-eligible scope sit at the top of the conduct severity scale even when the AML typology is borderline. A disclosure-deficiency pattern without identified harm sits lower; the conduct-lane note records that absence of identified harm does not foreclose harm and the firm's continuous-monitoring stance addresses the residual.

## Common pitfalls in adding the conduct overlay to the triage

- Collapsing conduct exposure into the AML lane and overstating materiality for AML purposes when the typology link is absent.
- Dropping conduct-only hits because they do not carry an AML typology tag; the conduct routing exists for these.
- Letting "no AML typology, therefore not material" become the disposition on a hit with strong customer-harm content; the conduct dimension is the materiality.
- Under-reading vulnerable-customer overlap on customer hits; the elder-financial-exploitation typology carries an explicit AML link and the conduct lane carries the parallel routing.
- Recommending the consumer-restitution scope, the conduct-rating change, the producer-suspension, or the disclosure-correction; the triage routes to the named conduct-side decisionmaker, who decides.

## Joint ownership

Conduct-tagged adverse-media hits frequently carry joint ownership between the BSA officer (for the AML lane) and the consumer-compliance / fair-lending / producer-oversight function (for the conduct lane). The triage memo's routing block names both the BSA-side decisionmaker and the conduct-side decisionmaker; the open-questions block notes any cross-functional review the routing depends on.
