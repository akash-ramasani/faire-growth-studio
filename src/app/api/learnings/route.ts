import { z } from "zod";
import { destructiveAllowed, guard, readJson } from "@/lib/security";
import { clearLearnings, listLearnings, setLearningActive } from "@/lib/db/repo";

export async function GET() {
  return Response.json(await listLearnings());
}

const Patch = z.object({ id: z.string().max(80), active: z.boolean() });

export async function PATCH(request: Request) {
  const blocked = await guard(request, "write");
  if (blocked) return blocked;
  const parsed = Patch.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  await setLearningActive(parsed.data.id, parsed.data.active);
  return Response.json({ ok: true });
}

export async function DELETE() {
  if (!destructiveAllowed()) return Response.json({ ok: false, error: "Clearing learnings is disabled on the public demo" }, { status: 403 });
  await clearLearnings();
  return Response.json({ ok: true });
}
