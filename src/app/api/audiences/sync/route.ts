import { z } from "zod";
import { guard, readJson } from "@/lib/security";
import { validateRule } from "@/lib/audiences/contract";
import { buildSync, SYNC_DESTINATIONS, type SyncDestination } from "@/lib/audiences/sync";
import { logSync, queryAudience } from "@/lib/db/repo";

const Body = z.object({
  name: z.string().min(3).max(60),
  destination: z.enum(Object.keys(SYNC_DESTINATIONS) as [SyncDestination, ...SyncDestination[]]),
  draft: z.unknown(),
});

export async function POST(request: Request) {
  const blocked = await guard(request, "write");
  if (blocked) return blocked;
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ ok: false, errors: ["Name the audience (3-60 characters) and pick a destination"] });
  const checked = validateRule(parsed.data.draft);
  if (!checked.ok) return Response.json({ ok: false, errors: checked.errors });
  const plan = buildSync(parsed.data.destination, parsed.data.name, await queryAudience(checked.rule));
  await logSync({
    name: parsed.data.name,
    destination: plan.destination,
    rule: checked.rule,
    matched: plan.matched,
    eligible: plan.eligible,
    excluded: plan.excludedForConsent,
  }).catch((err) => console.error("sync log failed", err));
  console.log(JSON.stringify({ event: "audience.sync_planned", destination: plan.destination, eligible: plan.eligible, excluded: plan.excludedForConsent }));
  return Response.json({ ok: true, plan });
}
