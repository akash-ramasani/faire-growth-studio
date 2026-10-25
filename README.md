# Growth Studio

A working prototype of the two "what you'll build first" problems from Faire's **Growth Platform, Marketing Engineer** role:

1. **Marketing-led landing pages:** a self-serve, agentic landing page service. A marketer writes a brief and gets an on-brand, eval-gated page with A/B variants.
2. **Self-serve audiences and attributes:** marketers describe an audience in plain English. A typed data contract validates it, it compiles to SQL, and it syncs to Braze, Meta or Google with consent enforced in code.

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
npm test          # unit tests: evals, data contract, consent, fallback
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

**Defined failure mode.** Blocking failures get one repair round, where Claude receives the exact failing checks. If that still fails, or if the API errors, refuses, or no key is set, the marketer gets the approved template. Every result shows which path produced it and why. The brief itself is treated as untrusted: the eval suite caught the template pasting a non-compliant offer ("Unlimited free shipping") into the fallback page, so the template now runs brief text through the same claim checks.

**Publishing is gated.** The Publish button is disabled while any blocking check fails, including after a marketer's inline edits.

## Self-serve audiences

- **Data contract** ([`contract.ts`](src/lib/audiences/contract.ts)): a typed attribute catalog (enum / number / boolean, nullable where relevant), with operators allowed per type. Every rule, whether hand-built or proposed by Claude, goes through `validateRule` before it can be counted or synced. Validated rules compile to SQL so analysts can audit them.
- **Claude proposes, the contract decides** ([`translate.ts`](src/lib/audiences/translate.ts)): plain English becomes a draft rule via structured output. Anything the contract can't express is returned as `unsupported` instead of being approximated with a wrong attribute.
- **Consent in code** ([`sync.ts`](src/lib/audiences/sync.ts)): Braze requires `email_opt_in`; Meta and Google require `ads_consent` and get SHA-256-hashed identifiers. Non-consented records are dropped for every destination, however the audience was defined. Syncs are dry runs that show the exact payload.

## Monitoring

Every generation logs its path (first-pass / repaired / fallback), per-check eval results, latency and tokens. The server emits structured JSON log lines, and the `/monitoring` page shows first-pass, repair and fallback rates, p50/p95 latency, and pass rate by check. **Fallback rate and repair rate are the on-call signals.** A spike means the model, the prompt or an upstream dependency regressed.

`npm run eval` runs a fixed brief set, including adversarial briefs that ask for guarantees or mismatch the audience, through the full pipeline. It fails if anything would ship with a blocking failure, or if the live first-pass rate drops below `EVAL_MIN_FIRST_PASS` (default 0.5). CI runs it on every push.

## Stack and production notes

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Zod · `@anthropic-ai/sdk` · Vitest.

Production would differ in these ways:
- Published pages and run logs live in `localStorage` for the demo. In production they go to the CMS and the warehouse, with alerting on the fallback-rate metric.
- The retailer table is synthetic and seeded. In production, the contract would be generated from the warehouse model (dbt / protobuf), so the schema and the UI can't drift.
- Next steps: an LLM-as-judge eval for brief adherence (scored offline against the regression set, not used as a gate), a feedback loop from page conversion back into the prompt, and vendor-vs-build cost tracking per page.
