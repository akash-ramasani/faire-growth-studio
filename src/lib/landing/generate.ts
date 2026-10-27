import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { describeError, getClient, MODEL } from "../claude";
import { DESTINATIONS, TESTIMONIALS } from "./catalog";
import { assembleSpec } from "./build";
import { LOCALE_CONFIG } from "./locale";
import { blockingFailures, runEvals } from "./evals";
import { PageCopySchema, type Brief, type EvalResult, type GenerationResult, type PageCopy } from "./schema";
import { templateCopy } from "./template";

const SYSTEM = `You write landing page copy for Faire, a wholesale marketplace connecting independent brands with independent retailers.

Voice: warm, plain-spoken, confident without hype. Write for a busy shop owner or maker. Sentence case headlines. Short sentences.

Hard rules (pages that break these are rejected automatically):
- Never use guarantees, "risk-free", "#1", "best in the world", "cheapest", "100%", "unlimited", "overnight", or claims about fees.
- If you mention free shipping, free returns or Net 60, qualify it in the same sentence (e.g. "on eligible opening orders", "for approved retailers").
- Stay within the character limits in the schema descriptions. Count carefully.
- Pick a destination and testimonialId that match the brief's audience. You may not write testimonials.
- Exactly 3 valueProps, 3-4 categories with no duplicates, 3-4 FAQs. Include the brief's focus categories.
- No placeholders, brackets or template variables.
- Only mention offers (free shipping, free returns, Net 60 or other payment terms) if the brief's Offer field includes one.
- Non-English markets: the same claim rules apply in that language (e.g. "garanti", "garantiert"), and only that market's currency may appear.

Destinations: ${Object.entries(DESTINATIONS)
  .map(([k, d]) => `${k} (${d.audience}: ${d.label})`)
  .join("; ")}
Testimonials: ${Object.entries(TESTIMONIALS)
  .map(([k, t]) => `${k} (${t.audience}): "${t.quote}"`)
  .join("; ")}`;

export type GenerateOptions = {
  variantHint?: string;
  learnings?: string[];
  /** When set, skip the model entirely (for example, the daily AI budget is spent) and use the template. */
  skipModelReason?: string;
};

function briefPrompt(brief: Brief, { variantHint, learnings = [] }: GenerateOptions = {}): string {
  const market = LOCALE_CONFIG[brief.locale];
  return [
    `Market: ${market.label}. Write every customer-facing string in ${market.language}. ${market.promptNotes}`,
    `Campaign: ${brief.campaignName}`,
    `Audience: ${brief.audience}`,
    `Channel: ${brief.channel}`,
    `Goal: ${brief.goal}`,
    brief.keyMessage && `Key message: ${brief.keyMessage}`,
    brief.offer && `Offer: ${brief.offer}`,
    `Tone: ${brief.tone}`,
    brief.focusCategories.length > 0 && `Focus categories: ${brief.focusCategories.join(", ")}`,
    brief.featuredBrand &&
      [
        `Featured brand: ${brief.featuredBrand.name}. This page invites independent retailers to stock ${brief.featuredBrand.name} through Faire. Use destination "brand_storefront".`,
        `You know nothing about ${brief.featuredBrand.name} beyond its name and its category (${brief.focusCategories.join(", ") || "not given"}).`,
        "Do not state or imply anything about the brand's products, materials, ingredients, origin, location, founders, history, awards, certifications, values, size or popularity.",
        "Describe what Faire gives retailers and what the category offers in general. You may name the brand, but only as a maker in that category.",
      ].join(" "),
    variantHint && `Variant direction: ${variantHint}`,
    learnings.length > 0 &&
      [
        "Patterns that won past A/B tests for similar pages. These are suggestions, not rules: use at most one, only if it genuinely fits this brief, and never copy their wording.",
        "Never introduce an offer, discount or payment term that isn't in the brief because a learning mentions one.",
        ...learnings.map((l) => `- ${l}`),
      ].join("\n"),
  ]
    .filter(Boolean)
    .join("\n");
}

type Attempt = { copy: PageCopy; usage: { inputTokens: number; outputTokens: number } };

async function callClaude(content: string): Promise<Attempt> {
  const client = getClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY is not set");
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: "medium", format: zodOutputFormat(PageCopySchema) },
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined this brief");
  if (response.stop_reason === "max_tokens") throw new Error("Response hit max_tokens before finishing");
  if (!response.parsed_output) throw new Error("Claude returned output that did not match the page schema");
  return {
    copy: response.parsed_output,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}

function repairPrompt(brief: Brief, copy: PageCopy, failures: EvalResult[], opts: GenerateOptions): string {
  return `${briefPrompt(brief, opts)}

Your previous draft failed these automated checks:
${failures.map((f) => `- ${f.name}: ${f.detail}`).join("\n")}

Previous draft:
${JSON.stringify(copy)}

Return a corrected page. Change only what is needed to pass the checks.`;
}

/**
 * Brief -> Claude draft -> evals -> (one repair attempt) -> template fallback.
 * The returned page always passes blocking evals; `source` records which path produced it.
 */
export async function generatePage(brief: Brief, opts: GenerateOptions = {}): Promise<GenerationResult> {
  const started = Date.now();
  const usage = { inputTokens: 0, outputTokens: 0 };
  let attempts = 0;
  let fallbackReason: string;

  const fallback = (reason: string): GenerationResult => {
    const spec = assembleSpec(templateCopy(brief, opts.variantHint ? "B" : "A"), brief);
    return {
      spec,
      evals: runEvals(spec),
      source: "template_fallback",
      fallbackReason: reason,
      latencyMs: Date.now() - started,
      attempts,
      model: attempts > 0 ? MODEL : undefined,
      usage: attempts > 0 ? usage : undefined,
    };
  };

  if (opts.skipModelReason) return fallback(opts.skipModelReason);
  if (!getClient()) return fallback("No ANTHROPIC_API_KEY configured, so the approved template was used");

  try {
    attempts++;
    const first = await callClaude(briefPrompt(brief, opts));
    usage.inputTokens += first.usage.inputTokens;
    usage.outputTokens += first.usage.outputTokens;
    let spec = assembleSpec(first.copy, brief);
    let evals = runEvals(spec);
    let failures = blockingFailures(evals);
    if (failures.length === 0) {
      return { spec, evals, source: "claude", latencyMs: Date.now() - started, attempts, model: MODEL, usage };
    }

    attempts++;
    const repaired = await callClaude(repairPrompt(brief, first.copy, failures, opts));
    usage.inputTokens += repaired.usage.inputTokens;
    usage.outputTokens += repaired.usage.outputTokens;
    spec = assembleSpec(repaired.copy, brief);
    evals = runEvals(spec);
    failures = blockingFailures(evals);
    if (failures.length === 0) {
      return { spec, evals, source: "claude_repaired", latencyMs: Date.now() - started, attempts, model: MODEL, usage };
    }
    fallbackReason = `Draft still failed after repair: ${failures.map((f) => f.name).join(", ")}`;
  } catch (err) {
    fallbackReason = describeError(err);
  }
  return fallback(fallbackReason);
}
