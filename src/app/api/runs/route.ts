import { clearRuns, listRuns } from "@/lib/db/repo";

export async function GET() {
  return Response.json(await listRuns());
}

export async function DELETE() {
  await clearRuns();
  return Response.json({ ok: true });
}
