# Payments / fintech sector overlay — negative-news-triage

When the scope flags payments-fintech, load this overlay alongside `references/source-anchors.md`. It carries the fintech-specific adverse-media frame the generic capability skill does not own.

## What payments-fintech adverse-media looks like in practice

Fintech customer adverse media skews differently from banking. Volumes are higher, identity attributes are thinner (digital-only onboarding leaves less corroborable file evidence), and the customer base often includes smaller commercial sellers, marketplace participants, and gig-economy individuals whose adverse-media surface area is wider but whose materiality is harder to read.

- **Marketplace-seller fraud reporting.** Press, regulator, and consumer-complaint coverage of a marketplace seller (a customer of a payments processor or a marketplace platform under sponsor-bank arrangements). Consumer-complaint volume is itself a signal but is not a typology link by itself; the triage reads back to a primary source (regulator action, court filing, indictment, named class-action filing) before treating the hit as material.
- **Payment-processor and BIN-sponsor enforcement coverage.** Federal-agency actions against a customer that is itself a payment intermediary (a payment facilitator, a money services business, a small acquirer) raises a heightened-risk profile that flows through the sponsor-bank program. Tier-1 source class; identity confidence usually high.
- **Convertible-virtual-currency exchange and DeFi exposure.** Adverse media on a customer's CVC counterparty (an exchange, a mixer, a bridge protocol) implicating sanctions evasion, ransomware facilitation, or a named darknet-market linkage. The cyber-typology and sanctions-evasion-typology overlap is heavy in this segment.
- **Sponsor-bank-program adverse media.** Where the fintech operates under a sponsor-bank model, adverse media against the fintech itself (regulator actions, consumer-complaint patterns, BSA-AML-program enforcement) routes through the sponsor's program and is read against the program contract's CDD reliance arrangement.

## Fintech-specific identity-confidence drivers

Digital-only onboarding leaves thinner identity attributes than banking does. The triage works with what the file holds:

- **Marketplace and small-commercial sellers** match on legal name, formation date or DBA, EIN where collected, registered address, principal place of business where collected, and the business-activity description on file. Common-name false matches dominate; the business-activity-and-jurisdiction join is often the only differentiator.
- **Gig-economy and individual customers** match on legal name, date of birth, address, and device-and-contact attributes (where the program collects them). A high-confidence individual-customer identity cut frequently requires combining a CDD-file attribute with a public-record join (court records, regulator press releases, professional licensing) that the file does not carry directly.
- **CVC counterparties** are matched on entity name, registered address, foreign-jurisdiction filings, and on-chain attribution where the program ingests blockchain-analytics evidence; the on-chain attribution is itself an identity-evidence stream the triage can carry.
- **Sponsor-bank-program reliance.** Where the fintech relies on the sponsor bank for parts of CDD, the operative identity attributes the triage matches against are the program's matched set, not just the fintech's. The triage scopes the program before reading identity confidence.

## Typology-link patterns payments-fintech adverse-media triage attends to

- **Marketplace fraud (seller fraud, buyer fraud, account-takeover, friendly fraud).** Distinguish marketplace-fraud typologies from financial-crime typologies; a buyer-fraud surface is consumer-protection-relevant but is not a SAR-decision-evidence typology by itself unless it intersects with structuring, layering, or known-fraud-ring activity.
- **Convertible-virtual-currency obfuscation (mixers, chain-hopping, cross-chain bridges).** Cite to the FinCEN CVC advisory and the OFAC virtual-currency guidance in the typology tag. Routes to `sanctions-screening-qa` where a sanctions-evasion overlap is implicated.
- **Ransomware facilitation.** A CVC counterparty implicated in ransomware-payment facilitation (named in a public ransomware advisory's indicator list, or in a FinCEN or OFAC enforcement notice). Routes to `sanctions-screening-qa` and to `sar-decision-qa`.
- **BIN-sponsor abuse and prepaid-card schemes.** Adverse media on prepaid-card schemes routed through a customer's BIN sponsorship; cite to the FinCEN advisory on prepaid access (where applicable) in the typology tag.
- **Synthetic-identity fraud.** Press and regulator coverage of synthetic-identity rings; identity-confidence is bounded by how the customer file's identity attributes were collected (the synthetic identity is, by design, hard to disambiguate against a synthetic match).

## Fintech routing patterns

- A tier-1 hit on a fintech customer that is itself an MSB or a payment intermediary routes to `cdd-risk-review` for an event-driven refresh and to `edd-escalation-pack` for the heightened-risk-population read.
- A CVC counterparty hit with sanctions-evasion or ransomware linkage routes to `sanctions-screening-qa` first; the CDD lane is secondary because the screening overlap is the load-bearing decision.
- A marketplace-seller adverse-media hit without primary-source corroboration carries `[evidence needed]` for the relationship owner to corroborate; the consumer-complaint volume goes into `aggregated_themes` rather than into per-hit materiality.
- A bulk re-scan output on a sponsor-bank-program portfolio routes program-level themes (high common-name noise, high vendor-tier-3 share, recurring counterparties across sellers) back to the sponsor program's BSA function; per-customer escalation is reserved for the material subset.

## Common pitfalls in fintech adverse-media triage

- Treating consumer-complaint volume as a typology-link signal without primary-source corroboration.
- Reading CVC adverse media without consulting the on-chain attribution evidence the program may already hold.
- Letting the sponsor-bank-program and the fintech's own program collapse into one CDD-file read; the triage scopes which entity's CDD the hit bears on before routing.
- Under-reading sanctions-evasion overlap on CVC and DeFi hits; the routing line to `sanctions-screening-qa` is the load-bearing one in this segment.
- Letting digital-only-onboarding identity-attribute thinness justify a high identity-confidence call where the matchable evidence does not support it.
- Recommending the rating change, the EDD upgrade, the SAR filing, the seller suspension, the BIN-sponsor termination, or the exit; the triage routes the artifact to the named decisionmaker.
