# Growth Studio

**Live demo:** https://faire-growth-studio.vercel.app

A working prototype of the two "what you'll build first" problems from Faire's **Growth Platform, Marketing Engineer** role:

1. **Marketing-led landing pages:** a self-serve, agentic landing page service. A marketer writes a brief and gets an on-brand, eval-gated page with A/B variants, in US, UK, French and German markets.
2. **Self-serve audiences and attributes:** marketers describe an audience in plain English. A typed data contract validates it, it compiles to SQL, and it syncs to Braze, Meta or Google with consent enforced in code.

It also covers one item from the role's "on our radar" list: **a learning loop for generative assets**. A/B results become learnings that feed the next generation.

**Strategy:** [Build vs. buy memo](docs/build-vs-buy.md). It recommends building the generation and eval layer in-house and buying the sync pipes, with costs and what would change the call.

It follows the role's working principles: put agents into the patterned work, with **an eval harness, monitoring and a defined failure mode before anything reaches a customer**.

> Independent interview project. Not affiliated with or endorsed by Faire. All retailer data is synthetic, and the testimonials are labelled samples.

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY (optional)
npm run dev                  # http://localhost:3000
```

The app works without a key. Landing pages then come from the approved template, which *is* the defined failure path, so the full flow is still visible. With a key, Claude (`claude-opus-5-5` by default, override with `ANTHROPIC_MODEL`) writes the copy and translates audience descriptions.

```bash
npm test          # 58 tests: evals, markets, data contract, SQL parity, consent, stats, fallback
npm run eval      # offline regression suite over evals/briefs.json
npm run lint && npm run typecheck && npm run build
```

## Landing page service

```
Brief ──▶ Claude (structured output) ──▶ code adds URL + UTMs ──▶ evals
                                                                  │
                    pass ◀────────────────────────────────────────┤
                                                                  │ blocking failure
                    pass ◀── evals ◀── Claude repair (with reasons) ◀┘
                                         │ still failing / API error / refusal / no key
                                         ▼
                                  approved template (always passes)
```

**Constrain, then generate.** The model returns a typed `PageCopy` ([`schema.ts`](src/lib/landing/schema.ts)) through `messages.parse` + Zod structured output. Anything legal or brand would review is an enum from [`catalog.ts`](src/lib/landing/catalog.ts): CTA destinations, categories, icons, palettes, and **testimonials, which the model selects by id and cannot write**.

**Code owns attribution.** URLs and UTM parameters are built in [`build.ts`](src/lib/landing/build.ts) from the brief's channel, never by the model.

**Evals** ([`evals.ts`](src/lib/landing/evals.ts)) are deterministic, fast, and run on the server *and* in the browser as the marketer edits:

| Check | Severity |
| --- | --- |
| Matches the page schema | blocking |
| Fits layout length limits (headline 70, subhead 160, meta, cards…) | blocking |
| Section counts (3 value props, 3–4 categories, 3–4 FAQs) | blocking |
| Destination and testimonial match the audience (retailer vs brand) | blocking |
| CTA carries `utm_source` / `utm_medium` / `utm_campaign` | blocking |
| No prohibited claims (guarantees, "#1", "risk-free", fee claims…) | blocking |
| Offer claims carry qualifiers (free shipping, free returns, Net 60) | blocking |
| No placeholders / template variables | blocking |
| Descriptive hero alt text | blocking |
| Reads at Flesch-Kincaid grade ≤ 9 | warning |
| Brief's offer and focus categories appear | warning |
| Copy is in the market's language (function-word check) | blocking |
| Only the market's currency appears | blocking |
| British spelling on UK pages | blocking |

**Defined failure mode.** Blocking failures get one repair round, where Claude receives the exact failing checks. If that still fails, or if the API errors, refuses, or no key is set, the marketer gets the approved template. Every result shows which path produced it and why. The brief itself is treated as untrusted: the eval suite caught the template pasting a non-compliant offer ("Unlimited free shipping") into the fallback page, so the template now runs brief text through the same claim checks.

**Publishing is gated.** The Publish button is disabled while any blocking check fails, including after a marketer's inline edits.

## Markets

Each brief targets a market: `en-US`, `en-GB`, `fr-FR` or `de-DE` ([`locale.ts`](src/lib/landing/locale.ts)). "Localize to all markets" generates the other three from the same brief.

- **Compliance is per language.** French and German have their own banned-claim and qualifier rules ("garanti", "risikofrei", "livraison gratuite" without a qualifier), because a translated guarantee is still a guarantee.
- **Market-correct output.** Currency, spelling (UK), CTA paths (`/en-gb`, `/fr-fr`, `/de-de`) and category labels come from code.
- **Reviewed fallbacks per market.** The template fallback has approved copy for every market and never machine-translates at request time.

## Experiment learning loop

`/experiments` closes the loop from generated pages to better generated pages ([`src/lib/experiments`](src/lib/experiments)):

1. Start an A/B test from two variants in the studio.
2. Traffic is **simulated**: each arm has a hidden true conversion rate based on page features plus noise. In production this comes from the warehouse, joined on `utm_content`.
3. **Bayesian readout** (Beta posteriors): P(B beats A), lift and credible intervals. The stopping rule guards against peeking: at least 1,500 visitors per arm and 95% confidence, or stop at 21 days with no winner.
4. Concluding a test with a winner extracts **interpretable differences** ("Leading with payment terms beat leading with product discovery") into a learning memory scoped by audience and channel.
5. The next generation for that audience sends those learnings to Claude. Marketers can switch individual learnings off.

Learnings are stored as patterns, not wording, so they carry over to new briefs instead of overfitting to one headline.

## Self-serve audiences

- **Data contract** ([`contract.ts`](src/lib/audiences/contract.ts)): a typed attribute catalog (enum / number / boolean, nullable where relevant), with operators allowed per type. Every rule, whether hand-built or proposed by Claude, goes through `validateRule` before it can be counted or synced. Validated rules compile to SQL so analysts can audit them.
- **Claude proposes, the contract decides** ([`translate.ts`](src/lib/audiences/translate.ts)): plain English becomes a draft rule via structured output. Anything the contract can't express is returned as `unsupported` instead of being approximated with a wrong attribute.
- **Consent in code** ([`sync.ts`](src/lib/audiences/sync.ts)): Braze requires `email_opt_in`; Meta and Google require `ads_consent` and get SHA-256-hashed identifiers. Non-consented records are dropped for every destination, however the audience was defined. Syncs are dry runs that show the exact payload.

## Monitoring

Every generation logs its path (first-pass / repaired / fallback), per-check eval results, latency and tokens. The server emits structured JSON log lines, and the `/monitoring` page shows first-pass, repair and fallback rates, p50/p95 latency, and pass rate by check. **Fallback rate and repair rate are the on-call signals.** A spike means the model, the prompt or an upstream dependency regressed.

**Latest live run** (11 briefs, Claude Opus 5.5): 82% passed every blocking check first time, 18% passed after one repair, 0% fell back to the template. About $0.06 and ~19s (p50) per page. Adversarial briefs asking for guarantees came back compliant on the first pass.

`npm run eval` runs a fixed brief set, including adversarial briefs that ask for guarantees or mismatch the audience, through the full pipeline. It fails if anything would ship with a blocking failure, or if the live first-pass rate drops below `EVAL_MIN_FIRST_PASS` (default 0.5). CI runs it on every push.

## Data: SQLite

Everything persists in SQLite through `@libsql/client` ([`src/lib/db`](src/lib/db)): a local `local.db` file in development, and [Turso](https://turso.tech) (hosted SQLite, via the Vercel Marketplace) in production. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`; without them the app falls back to a local file.

| Table | Holds |
| --- | --- |
| `runs` | Every generation and audience translation, logged server-side (path, evals, latency, tokens) |
| `published_pages` | Pages published from the studio, served to anyone at `/p/<slug>` |
| `experiments`, `learnings` | A/B tests (simulated and concluded on the server) and the learning memory |
| `retailers` | The synthetic retailer table that audiences query |
| `audience_syncs` | Every dry-run sync, with the rule and consent exclusions |

- **Audiences run as real SQL.** A validated rule compiles to a parameterized `WHERE` clause (`toWhere`). Column names come from the attribute allowlist and every value is bound. A test checks that SQL results match the in-memory reference for every operator type.
- **The publish gate lives on the server.** `POST /api/published` re-validates the schema, rebuilds the URL and slug from the brief, and re-runs blocking evals, so a tampered request can't publish a non-compliant page or a hostile link.
- **Learnings are read server-side** when generating, never accepted as free text from the browser.

## Stack and production notes

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Zod · `@anthropic-ai/sdk` · Vitest.

Production would differ in these ways:
- SQLite is shared by every visitor of the demo. In production, runs would go to the warehouse (with alerting on the fallback-rate metric), pages to the CMS, and audiences would query the warehouse model directly.
- The retailer table is synthetic and seeded. In production, the contract would be generated from the warehouse model (dbt / protobuf), so the schema and the UI can't drift.
- Next steps: an LLM-as-judge eval for brief adherence (scored offline against the regression set, not used as a gate), a feedback loop from page conversion back into the prompt, and vendor-vs-build cost tracking per page.
