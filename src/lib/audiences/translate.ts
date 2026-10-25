import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { describeError, getClient, MODEL } from "../claude";
import { ATTRIBUTES, DraftRuleSchema, operatorsFor, validateRule, type AttributeKey, type DraftRule } from "./contract";

const TranslationSchema = DraftRuleSchema.extend({
  explanation: z.string().describe("One sentence restating the audience in plain English"),
  unsupported: z
    .array(z.string())
    .describe("Parts of the request that no attribute in the contract can express. Empty if everything mapped."),
});

const catalog = (Object.keys(ATTRIBUTES) as AttributeKey[])
  .map((k) => {
    const a = ATTRIBUTES[k];
    const values = "values" in a ? ` values: ${a.values.join(", ")}` : "";
    return `- ${k} (${a.type}${"unit" in a ? `, ${a.unit}` : ""}): ${a.description}. operators: ${operatorsFor(k).join(", ")}.${values}`;
  })
  .join("\n");

const SYSTEM = `You translate a marketer's audience description into a rule over Faire's retailer attributes.

Attributes (the only ones that exist):
${catalog}

Rules:
- Use only the attributes, operators and enum values above, spelled exactly.
- Numbers as plain digits. Enum lists comma-separated. Empty value for is_true / is_false / is_empty.
- "Lapsed" or "hasn't ordered in N days" means days_since_last_order gt N.
- Do not add consent conditions; consent is applied automatically at sync time.
- If part of the request can't be expressed, leave it out and list it in "unsupported". Never approximate with an unrelated attribute.`;

export type TranslationResult =
  | { ok: true; draft: DraftRule; explanation: string; unsupported: string[]; latencyMs: number }
  | { ok: false; error: string; contractErrors?: string[]; latencyMs: number };

export async function translateAudience(prompt: string): Promise<TranslationResult> {
  const started = Date.now();
  const client = getClient();
  if (!client) {
    return { ok: false, error: "No ANTHROPIC_API_KEY configured. Use the rule builder or a preset instead.", latencyMs: 0 };
  }
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(TranslationSchema) },
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") return { ok: false, error: "Claude declined this request", latencyMs: Date.now() - started };
    const out = response.parsed_output;
    if (!out) return { ok: false, error: "Claude's response did not match the rule schema", latencyMs: Date.now() - started };

    const { explanation, unsupported, ...draft } = out;
    // The model's output is a proposal; the contract decides whether it is a valid audience.
    const checked = validateRule(draft);
    if (!checked.ok) {
      return { ok: false, error: "Claude proposed a rule that breaks the data contract", contractErrors: checked.errors, latencyMs: Date.now() - started };
    }
    return { ok: true, draft, explanation, unsupported, latencyMs: Date.now() - started };
  } catch (err) {
    return { ok: false, error: describeError(err), latencyMs: Date.now() - started };
  }
}
