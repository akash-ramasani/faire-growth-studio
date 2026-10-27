import { z } from "zod";
import { aiBudgetExhausted, guard, readJson } from "@/lib/security";
import { inExplorationBucket, learningPrompt, relevantLearnings } from "@/lib/experiments/model";
import { listLearnings, logRun } from "@/lib/db/repo";
import { generatePage } from "@/lib/landing/generate";
import { BriefSchema } from "@/lib/landing/schema";

const Body = z.object({
  brief: BriefSchema,
  variantHint: z.string().max(300).optional(),
  // Learnings are read from the database here, never accepted as free text from the browser.
  applyLearnings: z.boolean().optional(),
});

export async function POST(request: Request) {
  const blocked = await guard(request, "generate");
  if (blocked) return blocked;
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) {
    return Response.json({ error: "Invalid brief", issues: parsed.error.issues }, { status: 400 });
  }
  const { brief, variantHint, applyLearnings } = parsed.data;
  const exploring = Boolean(applyLearnings) && inExplorationBucket(brief.campaignName);
  const learnings = applyLearnings && !exploring ? relevantLearnings(await listLearnings(), brief).map(learningPrompt) : [];
  // Cost guard: past today's token budget, serve the approved template instead of calling Claude.
  const skipModelReason = (await aiBudgetExhausted()) ? "Today's AI budget for this demo is used up, so the approved template was used" : undefined;
  const result = await generatePage(brief, { variantHint, learnings, skipModelReason });
  await logRun({
    at: Date.now(),
    kind: "page",
    campaign: brief.campaignName,
    source: result.source,
    locale: brief.locale,
    latencyMs: result.latencyMs,
    attempts: result.attempts,
    evals: result.evals.map(({ id, name, passed, severity }) => ({ id, name, passed, severity })),
    fallbackReason: result.fallbackReason,
    inputTokens: result.usage?.inputTokens,
    outputTokens: result.usage?.outputTokens,
  }).catch((err) => console.error("run log failed", err));
  console.log(
    JSON.stringify({
      event: "landing_page.generated",
      slug: result.spec.slug,
      locale: brief.locale,
      learningsApplied: learnings.length,
      source: result.source,
      attempts: result.attempts,
      latencyMs: result.latencyMs,
      blockingFailures: result.evals.filter((e) => e.severity === "blocking" && !e.passed).length,
      fallbackReason: result.fallbackReason,
    }),
  );
  return Response.json({ ...result, learningsApplied: learnings.length, exploring });
}
