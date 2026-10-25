# Build vs. buy: landing pages and audiences

**Recommendation:** build the *intelligence layer* (generation, evals, data contract, learning loop) in-house on the existing Next.js and warehouse stack. Buy, or keep, *pipes*: audience sync into ad platforms and ESPs. Don't buy a standalone landing page builder.

This is written from the outside. The numbers marked *assumption* are the first things I'd replace with real figures in week one.

## What marketing actually needs

From the role description and the shape of the requests:

1. **Speed without a ticket.** Blog, newsroom, lifecycle and paid teams ship pages and tests themselves.
2. **Brand and claim safety at volume.** More pages, written partly by models, means review has to be automated (claims, qualifiers, audience fit) rather than done by a human on every page.
3. **Attribution that can't break.** UTMs and destinations built by code, joined to signups in the warehouse.
4. **Experiments that compound.** A/B results stored as reusable knowledge, not slides.
5. **Multiple markets.** UK and EU pages with market-specific compliance, not a translation pass at the end.
6. **Self-serve audiences** with a data contract and consent enforced in code.

## Landing pages: options

| | Page builder (e.g. Unbounce) | Visual CMS (e.g. Webflow) | ESP pages (e.g. Braze) | In-house on Faire's Next.js |
| --- | --- | --- | --- | --- |
| Time to first page | Days | Weeks | Days, if already licensed | 6–8 weeks to production *(assumption)* |
| List price | $99–249/mo published tiers; higher traffic is custom-priced [1] | Plan + $9–29 per locale/mo; Enterprise custom [2] | Quote-based, sold with the platform [3] | Engineer time + ~$0.10–0.30 of model cost per page *(assumption: confirm with `npm run eval` token counts)* |
| Uses Faire's design system | No (separate templates) | Partly (rebuilt components) | No | **Yes** |
| On faire.com, same session and SEO | Subdomain or proxy | Subdomain or proxy | Hosted by the ESP | **Yes** |
| Claim and brand evals | Manual review | Manual review | Manual review | **Automated, gating publish** |
| A/B testing | Yes, from $149/mo tier [1] | Via add-ons | Limited | Yes, results land in the warehouse |
| Learning across tests | Inside the vendor UI | No | No | **Learnings fed back into generation** |
| Multi-market compliance | Manual | Localization add-on, manual review | Manual | **Per-market claim rules, currency, spelling** |
| Lock-in and exit cost | Pages are trapped in the vendor | Medium | High | None |

**Why not a builder:** it solves the first need, speed, and fails the next three. The pages would sit outside the design system and the main domain, and claim review would stay manual. Every result would live in a vendor dashboard instead of the warehouse. That's fine for a 10-page program. It breaks at the volume an agentic workflow produces.

**Why not the ESP's pages:** good for opt-in capture inside lifecycle, but not for paid or SEO traffic. It adds no evals.

**Why in-house works here:** Faire already runs Next.js and a warehouse, and already has engineers on-call. The marginal cost is the generation, eval and contract layer, which is exactly what this prototype is. The rendering and hosting already exist.

## Audiences: options

| | Composable CDP (e.g. Hightouch) | In-house contract + sync |
| --- | --- | --- |
| Price | Usage-based, quote only [4] | Engineer time + run cost |
| Destinations | 200+ maintained connectors | Each connector built and maintained by us |
| Data contract | Model and schema in the vendor UI | Typed in code, reviewed in PRs, compiled to SQL |
| Consent enforcement | Configurable | Enforced on every sync path in code |
| Natural-language audience builder | Vendor AI features | Model proposes, contract decides (this repo) |

**Recommendation:** if a reverse-ETL vendor is already licensed, keep it as the pipe. Put the contract and the self-serve layer (`contract.ts`, the natural-language translation, the size and SQL preview) in front of it, so marketers use one interface and the vendor handles delivery to Meta, Google and Braze. Building connectors in-house is undifferentiated work. Build them only if the vendor bill grows past roughly one engineer's annual cost *(assumption)*.

## Rough cost picture (year one)

| | Buy (builder + CDP) | Build (this approach) |
| --- | --- | --- |
| Licences | Builder at scale is custom-priced; CDP is quote-based | CDP pipe only, if kept |
| Engineering | Integration and review process: ~2–3 weeks | ~6–8 weeks to production, then ~15% of one engineer to maintain *(assumption)* |
| Model cost | n/a | ~$0.10–0.30 per page × pages per month *(assumption)* |
| Hidden cost | Manual claim review per page; insights stuck in vendor UIs; off-domain SEO | On-call ownership; eval upkeep as claims rules change |

The deciding factor isn't licence cost. It's **review time per page × page volume**. If agents let marketing ship 10× more pages, manual review becomes the bottleneck, and only the build path removes it.

## What would change my mind

- Page volume stays low (fewer than about 20 per month). Then a builder is cheaper and faster.
- No engineering capacity for on-call on a new service. Then use a vendor and add evals as a pre-publish check in CI.
- Legal requires human sign-off on every page regardless. Evals still cut review time, but the speed argument weakens.

## How I'd validate in the first 30 days

1. Pull the last quarter of landing-page requests: count, turnaround time, revisions, and which claims legal flagged.
2. Price the current vendor contracts. Model cost per page from real `npm run eval` token counts.
3. Pilot with one team (lifecycle is the most patterned), and measure turnaround and first-pass eval rate before scaling.

---

Sources: [1] Unbounce published tiers via [CASRAI](https://www.casrai.org/software/unbounce-review) and [Leadpages](https://leadpages.com/blog/unbounce-pricing) · [2] [Webflow Localization](https://webflow.com/localization) · [3] [Automation Atlas: Braze pricing](https://automationatlas.io/answers/braze-pricing-explained-2026/) · [4] [Hightouch: Is Hightouch expensive?](https://hightouch.com/blog/is-hightouch-expensive), [Rework](https://resources.rework.com/tools/customer-data/best-hightouch-alternatives). Third-party prices change often. Confirm them with vendors.
