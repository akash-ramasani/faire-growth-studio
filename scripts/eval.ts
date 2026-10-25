// Offline regression suite: runs a fixed brief set through the full pipeline and reports
// first-pass, repair and fallback rates per brief. Exits non-zero if quality regresses.
//   npm run eval            (uses ANTHROPIC_API_KEY from the environment / .env.local)
//   EVAL_MIN_FIRST_PASS=0.6 npm run eval
import { readFileSync, writeFileSync } from "node:fs";
import { generatePage } from "../src/lib/landing/generate";
import { BriefSchema, type GenerationResult } from "../src/lib/landing/schema";

const cases = JSON.parse(readFileSync(new URL("../evals/briefs.json", import.meta.url), "utf8")) as Array<{ id: string; brief: unknown }>;
const minFirstPass = Number(process.env.EVAL_MIN_FIRST_PASS ?? 0.5);
const live = Boolean(process.env.ANTHROPIC_API_KEY);

async function main() {
  if (!live) console.log("ANTHROPIC_API_KEY not set: every case will exercise the template fallback.\n");
  const rows: Array<{ id: string; result: GenerationResult }> = [];
  // Sequential on purpose: keeps rate limits predictable and the log readable.
  for (const c of cases) {
    const brief = BriefSchema.parse(c.brief);
    const result = await generatePage(brief);
    rows.push({ id: c.id, result });
    const failedChecks = result.evals.filter((e) => !e.passed).map((e) => `${e.id}${e.severity === "blocking" ? "!" : ""}`);
    console.log(
      `${c.id.padEnd(32)} ${result.source.padEnd(18)} ${String(result.attempts).padStart(2)} calls ${(result.latencyMs / 1000).toFixed(1).padStart(6)}s  ${failedChecks.join(" ") || "all checks pass"}${result.fallbackReason ? `  (${result.fallbackReason})` : ""}`,
    );
  }

  const n = rows.length;
  const count = (s: GenerationResult["source"]) => rows.filter((r) => r.result.source === s).length;
  const shippedBlocking = rows.filter((r) => r.result.evals.some((e) => e.severity === "blocking" && !e.passed));
  const summary = {
    at: new Date().toISOString(),
    live,
    cases: n,
    firstPassRate: count("claude") / n,
    repairRate: count("claude_repaired") / n,
    fallbackRate: count("template_fallback") / n,
    shippedWithBlockingFailures: shippedBlocking.map((r) => r.id),
    tokens: rows.reduce((s, r) => s + (r.result.usage?.inputTokens ?? 0) + (r.result.usage?.outputTokens ?? 0), 0),
  };
  writeFileSync(new URL("../evals/last-report.json", import.meta.url), JSON.stringify({ summary, rows }, null, 2));

  console.log(
    `\nfirst-pass ${(summary.firstPassRate * 100).toFixed(0)}%  repaired ${(summary.repairRate * 100).toFixed(0)}%  fallback ${(summary.fallbackRate * 100).toFixed(0)}%  tokens ${summary.tokens.toLocaleString()}`,
  );

  // The invariant that must hold with or without a key: nothing ships with a blocking failure.
  if (shippedBlocking.length) {
    console.error(`FAIL: pages shipped with blocking failures: ${summary.shippedWithBlockingFailures.join(", ")}`);
    process.exit(1);
  }
  if (live && summary.firstPassRate < minFirstPass) {
    console.error(`FAIL: first-pass rate ${summary.firstPassRate.toFixed(2)} is below ${minFirstPass}`);
    process.exit(1);
  }
  console.log("PASS");
}

main();
