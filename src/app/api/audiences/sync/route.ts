import { z } from "zod";
import { validateRule } from "@/lib/audiences/contract";
import { evaluate } from "@/lib/audiences/evaluate";
import { buildSync, SYNC_DESTINATIONS, type SyncDestination } from "@/lib/audiences/sync";

const Body = z.object({
  name: z.string().min(3).max(60),
  destination: z.enum(Object.keys(SYNC_DESTINATIONS) as [SyncDestination, ...SyncDestination[]]),
  draft: z.unknown(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, errors: ["Name the audience (3-60 characters) and pick a destination"] });
  const checked = validateRule(parsed.data.draft);
  if (!checked.ok) return Response.json({ ok: false, errors: checked.errors });
  const plan = buildSync(parsed.data.destination, parsed.data.name, evaluate(checked.rule));
  console.log(JSON.stringify({ event: "audience.sync_planned", destination: plan.destination, eligible: plan.eligible, excluded: plan.excludedForConsent }));
  return Response.json({ ok: true, plan });
}
