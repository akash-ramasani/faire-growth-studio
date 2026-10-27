import { clearRuns, listRuns } from "@/lib/db/repo";
import { destructiveAllowed } from "@/lib/security";

export async function GET() {
  return Response.json(await listRuns());
}

// Wiping shared data isn't something anonymous visitors of the public demo should be able to do.
export async function DELETE() {
  if (!destructiveAllowed()) return Response.json({ ok: false, error: "Clearing the log is disabled on the public demo" }, { status: 403 });
  await clearRuns();
  return Response.json({ ok: true });
}
