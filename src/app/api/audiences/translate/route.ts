import { z } from "zod";
import { aiBudgetExhausted, guard, readJson } from "@/lib/security";
import { translateAudience } from "@/lib/audiences/translate";
import { logRun } from "@/lib/db/repo";

const Body = z.object({ prompt: z.string().min(5).max(600) });

export async function POST(request: Request) {
  const blocked = await guard(request, "translate");
  if (blocked) return blocked;
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ ok: false, error: "Describe the audience in at least a few words" }, { status: 400 });
  if (await aiBudgetExhausted()) {
    return Response.json({ ok: false, error: "Today's AI budget for this demo is used up. Pick an example or edit the rule directly; counts and syncs still work.", latencyMs: 0 });
  }
  const result = await translateAudience(parsed.data.prompt);
  await logRun({
    at: Date.now(),
    kind: "audience",
    campaign: parsed.data.prompt,
    source: result.ok ? "audience_ok" : "audience_failed",
    latencyMs: result.latencyMs,
    attempts: 1,
    evals: [],
    fallbackReason: result.ok ? undefined : result.error,
  }).catch((err) => console.error("run log failed", err));
  console.log(JSON.stringify({ event: "audience.translated", ok: result.ok, latencyMs: result.latencyMs }));
  return Response.json(result);
}
