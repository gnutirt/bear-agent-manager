# Banking sector overlay — negative-news-triage

When the scope flags banking, load this overlay alongside `references/source-anchors.md`. It carries the bank-specific adverse-media frame the generic capability skill does not own.

## What banking adverse-media looks like in practice

Banking customer adverse media skews to four recurring shapes. The triage reads against the shape the hit fits, not against a generic "negative news" template.

- **Regulatory-enforcement coverage of a commercial customer.** A federal agency (CFPB, OCC, FRB, FDIC, FTC, SEC) or a state regulator publishes a press release or a consent order naming the customer or the customer's principals. Tier-1 source class by definition; identity confidence usually high (the press release names the entity); materiality depends on the typology framing of the underlying conduct (a bank customer hit with a CFPB UDAAP order is reputational and conduct-relevant but may not be financial-crime-typology-relevant).
- **Indictments and civil filings naming the customer's principals.** Federal-court or state-court filings naming a director, officer, or beneficial owner of a customer entity. Identity confidence requires the entity-to-principal linkage from the CDD file or the public ownership chain; common-name false matches on the principal are routine. Materiality depends on the alleged conduct's typology link (a fraud indictment routes differently from a non-financial-crime civil matter).
- **Cash-intensive-business adverse media.** Local and regional press coverage of a customer's storefront business naming structuring, money-laundering, or tax-evasion patterns. Source-class often tier-2 or tier-3; the triage reads back to a primary source (regulator action, court filing, indictment) before treating the hit as material.
- **Correspondent-banking and foreign-counterparty adverse media.** Foreign-press, regulator, or court coverage of a foreign FI the bank holds a correspondent relationship with, or a foreign counterparty to a customer's transactions. The foreign-language and foreign-jurisdiction read raises identity-confidence-bar and source-corroboration-bar; a single foreign-press tier-3 hit on a correspondent should not move materiality on its own.

## Bank-specific identity-confidence drivers

The CDD file's matchable attributes do most of the identity-cut work. For banking:

- **Legal-entity customers** match on legal name, formation date, EIN where present, registered agent or registered address, principal place of business, and beneficial-ownership chain.
- **Individuals** match on legal name, date of birth, address (residence and any prior address on file), occupation, employer where on file, and known counterparties.
- **Common-name false-match patterns**: the dominant noise category in bulk re-scan output. The triage names common-name patterns explicitly in the `aggregated_themes` rather than dispositioning each hit individually when the false-match basis is the same.
- **Principal-versus-entity drift**: a hit where the customer entity is not named but a principal is named. The triage scopes the principal's role (control-prong individual under `§1010.230`; ownership-prong individual; signatory; non-named-on-file affiliate) before reading materiality at the entity level.

## Typology-link patterns banking adverse-media triage attends to

- **Fraud (commercial loan fraud, deposit fraud, mortgage fraud, ACH and wire fraud, BEC).** Cite to FinCEN advisories on the relevant typology and to applicable enforcement actions in the source trace.
- **Structuring.** Cash-intensive customer adverse media frequently links to structuring patterns; tier-1 corroboration (regulator action, court filing) is the materiality threshold.
- **Trade-based money laundering (TBML).** Commercial customers with international counterparties; cite to FinCEN TBML advisory in the typology tag.
- **Sanctions evasion.** A correspondent-banking adverse-media hit implicating a foreign FI in sanctions evasion routes to `sanctions-screening-qa` for the screening overlap, not just to the CDD or EDD lane.
- **Public-corruption and PEP-adjacency.** A hit surfacing a customer's principal in a foreign-corruption matter routes to `edd-escalation-pack` against the FFIEC PEP and private-banking EDD frames.

## Bank routing patterns

- A tier-1 hit with direct involvement on a financial-crime typology routes to `cdd-risk-review` for an event-driven refresh and to `edd-escalation-pack` if the customer is not already in EDD; an in-flight alert against the same customer also pulls a routing line to `sar-decision-qa`.
- A tier-1 hit with mention-only linkage routes as evidence input to a CDD refresh on cycle, not as an event-driven escalation.
- A tier-2 or tier-3 hit pending corroboration carries `[evidence needed]` and an open-question for the relationship owner to corroborate against the primary source; the triage does not escalate on uncorroborated tier-3 content.
- A bulk re-scan output dominated by tier-3 and common-name false matches surfaces a source-posture finding (the vendor or the query is producing high noise) that routes to the BSA program rather than to per-customer escalation.

## Common pitfalls in banking adverse-media triage

- Treating tier-2 or tier-3 hits as material without primary-source corroboration.
- Collapsing identity confidence into "name matches"; the matchable-attribute discipline is what distinguishes a real hit from a common-name false match.
- Dispositioning each common-name false match individually instead of naming the pattern in `aggregated_themes`.
- Letting vendor self-tagging of source reliability stand in for the source-class read.
- Treating a CFPB UDAAP order on a commercial customer as a financial-crime-typology hit when the underlying conduct is conduct-risk only; the conduct overlay (when loaded) carries the parallel routing.
- Recommending the rating change, the EDD upgrade, the SAR filing, or the exit; the triage routes the artifact to the named decisionmaker, who decides.
