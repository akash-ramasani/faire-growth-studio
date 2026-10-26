import { z } from "zod";
import { advance, conclude, decision } from "@/lib/experiments/model";
import { addLearnings, getExperiment, saveExperiment } from "@/lib/db/repo";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("simulate"), days: z.number().int().min(1).max(21) }),
  z.object({ action: z.literal("conclude") }),
]);

export async function POST(request: Request, { params }: RouteContext<"/api/experiments/[id]">) {
  const { id } = await params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
  const exp = await getExperiment(id);
  if (!exp) return Response.json({ ok: false, error: "Experiment not found" }, { status: 404 });
  if (exp.status !== "running") return Response.json({ ok: false, error: "Experiment already concluded" }, { status: 409 });

  if (parsed.data.action === "simulate") {
    await saveExperiment(advance(exp, parsed.data.days));
    return Response.json({ ok: true });
  }
  // Same stopping rule as the UI, enforced here: no calling a test before it has enough evidence.
  const d = decision(exp);
  if (d.status === "collecting") return Response.json({ ok: false, error: d.reason }, { status: 409 });
  const { experiment, learnings } = conclude(exp);
  await saveExperiment(experiment);
  await addLearnings(learnings);
  return Response.json({ ok: true, learnings: learnings.length });
}
