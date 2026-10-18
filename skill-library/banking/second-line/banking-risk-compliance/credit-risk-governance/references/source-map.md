# Public source map

This repository intentionally uses public, regulator, standards-body, and official documentation as its default source base. It does not include private firm policies, client data, confidential enforcement materials, or proprietary regulatory content.

## Claude plugin and agent conventions

| Source | What this repo uses it for | URL |
|---|---|---|
| Anthropic financial-services repository | Reference pattern for marketplace manifest, self-contained agent plugins, plugin source entries, skill bundles, and financial-services disclaimer posture | https://github.com/anthropics/financial-services |
| Claude Code plugin docs | Plugin root structure, `.claude-plugin/plugin.json`, `skills/`, `agents/`, MCP, and distribution behavior | https://code.claude.com/docs/en/plugins |
| Claude Code plugin reference | Agent frontmatter, plugin path rules, manifest behavior, component locations, versioning, and validation expectations | https://code.claude.com/docs/en/plugins-reference |
| Claude Code skills docs | `SKILL.md` structure, skill invocation, supporting files, argument hints, and current guidance that skills supersede legacy commands for new plugins | https://code.claude.com/docs/en/skills |
| Claude Code subagent docs | Focused subagents, agent frontmatter, tool scoping, separate contexts, and manual or automatic invocation | https://code.claude.com/docs/en/sub-agents |

## Regulatory and standards anchors

| Domain | Public anchor | URL |
|---|---|---|
| Model risk management | Joint Interagency Revised Guidance on Model Risk Management (OCC Bulletin 2026-13 / FRB SR 26-2 / FDIC FIL-15-2026, April 17, 2026; supersedes SR 11-7 and SR 21-8). Non-binding; most relevant to banks over $30B; GenAI / agentic AI explicitly out of scope (footnote 3). | https://www.occ.gov/news-issuances/bulletins/2026/bulletin-2026-13.html ; https://www.federalreserve.gov/supervisionreg/srletters/SR2602.htm ; https://www.fdic.gov/news/financial-institution-letters/2026/agencies-revise-interagency-model-risk-management-guidance |
| Model risk management | FDIC FIL on revised model risk guidance | https://www.fdic.gov/news/financial-institution-letters/2026/agencies-revise-interagency-model-risk-management-guidance |
| AI governance | NIST AI RMF 1.0 | https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10 |
| AI governance | NIST AI RMF crosswalks | https://www.nist.gov/itl/ai-risk-management-framework/crosswalks-nist-artificial-intelligence-risk-management-framework |
| AI management system | ISO/IEC 42001 overview | https://www.iso.org/standard/42001 |
| EU AI governance | Regulation (EU) 2024/1689, Artificial Intelligence Act | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024R1689 |
| Digital operational resilience | EBA DORA register of information preparation page | https://www.eba.europa.eu/activities/direct-supervision-and-oversight/digital-operational-resilience-act/preparation-dora-application |
| Digital operational resilience | EBA DORA oversight framework | https://www.eba.europa.eu/activities/direct-supervision-and-oversight/digital-operational-resilience-act/dora-oversight |
| Third-party risk | U.S. interagency third-party risk management guidance, OCC release | https://www.occ.gov/news-issuances/news-releases/2023/nr-ia-2023-53.html |
| Third-party risk | U.S. interagency third-party risk management guidance, FDIC release | https://www.fdic.gov/news/press-releases/2023/pr23047.html |
| Risk data and reporting | BCBS 239 principles for effective risk data aggregation and risk reporting | https://www.bis.org/publ/bcbs239.htm |
| Cyber reporting | SEC cybersecurity risk management, strategy, governance, and incident disclosure guide | https://www.sec.gov/corpfin/secg-cybersecurity |
| Small business lending and fair lending | CFPB Section 1071 small business lending revised final rule (May 1, 2026; 1,000 covered transactions; effective June 30, 2026; compliance January 1, 2028) | https://www.consumerfinance.gov/rules-policy/final-rules/small-business-lending-under-the-equal-credit-opportunity-act-regulation-b-2026/ |
| Small business lending data | CFPB Regulation B section 1002.107 data compilation rule text | https://www.consumerfinance.gov/rules-policy/regulations/1002/107 |
| Financial crime governance | FFIEC BSA/AML CDD manual | https://bsaaml.ffiec.gov/manual/AssessingComplianceWithBSARegulatoryRequirements/02 |
| Financial crime governance | FFIEC BSA/AML SAR manual | https://bsaaml.ffiec.gov/manual/AssessingComplianceWithBSARegulatoryRequirements/04 |
| Beneficial ownership | 31 CFR 1010.230 text via Cornell LII | https://www.law.cornell.edu/cfr/text/31/1010.230 |

## Evidence rules

1. Treat every public source as an anchor, not a substitute for legal interpretation.
2. Date every external source used in work product.
3. Separate public requirement, firm policy, management assertion, evidence, and inference.
4. Use public examples in this repository only for demonstration and tests. Real implementation requires firm policy overlays, jurisdiction-specific legal review, and system-of-record evidence.
