import { z } from "zod";
import { guard, readJson } from "@/lib/security";
import { createExperiment } from "@/lib/experiments/model";
import { listExperiments, saveExperiment } from "@/lib/db/repo";
import { SourceSchema, verifySpec } from "@/lib/landing/verify";

export async function GET() {
  return Response.json(await listExperiments());
}

const Arm = z.object({ spec: z.unknown(), source: SourceSchema });
const Body = z.object({ a: Arm, b: Arm });

export async function POST(request: Request) {
  const blocked = await guard(request, "experiment");
  if (blocked) return blocked;
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ ok: false, error: "Send variants A and B" }, { status: 400 });
  const a = verifySpec(parsed.data.a.spec);
  const b = verifySpec(parsed.data.b.spec);
  if (!a.ok || !b.ok) return Response.json({ ok: false, error: (!a.ok && a.error) || (!b.ok && b.error) }, { status: 422 });
  const exp = createExperiment({ spec: a.spec, source: parsed.data.a.source }, { spec: b.spec, source: parsed.data.b.source });
  await saveExperiment(exp);
  return Response.json({ ok: true, id: exp.id });
}
