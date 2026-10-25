import { z } from "zod";
import { clearLearnings, listLearnings, setLearningActive } from "@/lib/db/repo";

export async function GET() {
  return Response.json(await listLearnings());
}

const Patch = z.object({ id: z.string().max(80), active: z.boolean() });

export async function PATCH(request: Request) {
  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  await setLearningActive(parsed.data.id, parsed.data.active);
  return Response.json({ ok: true });
}

export async function DELETE() {
  await clearLearnings();
  return Response.json({ ok: true });
}
