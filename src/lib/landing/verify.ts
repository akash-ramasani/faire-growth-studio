import { z } from "zod";
import { assembleSpec } from "./build";
import { blockingFailures, runEvals } from "./evals";
import { BriefSchema, PageCopySchema, type PageSpec } from "./schema";

const SOURCES = ["claude", "claude_repaired", "template_fallback"] as const;
export const SourceSchema = z.enum(SOURCES);

/**
 * Server-side gate for anything a browser sends back as a page. The copy must match the schema,
 * URL and slug are rebuilt from the brief (never trusted from the client), and blocking evals must pass.
 */
export function verifySpec(input: unknown): { ok: true; spec: PageSpec } | { ok: false; error: string } {
  if (JSON.stringify(input ?? null).length > 60_000) return { ok: false, error: "Page is too large" };
  const brief = BriefSchema.safeParse((input as { brief?: unknown })?.brief);
  const copy = PageCopySchema.safeParse(input);
  if (!brief.success || !copy.success) return { ok: false, error: "Page does not match the schema" };
  const spec = assembleSpec(copy.data, brief.data);
  const failures = blockingFailures(runEvals(spec));
  if (failures.length) return { ok: false, error: `Blocked by evals: ${failures.map((f) => f.name).join(", ")}` };
  return { ok: true, spec };
}
