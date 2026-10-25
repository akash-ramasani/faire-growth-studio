import { describeRule, toSql, validateRule } from "@/lib/audiences/contract";
import { summarize } from "@/lib/audiences/evaluate";
import { queryAudience } from "@/lib/db/repo";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const checked = validateRule(body?.draft);
  if (!checked.ok) return Response.json({ ok: false, errors: checked.errors });
  const rows = await queryAudience(checked.rule);
  return Response.json({ ok: true, description: describeRule(checked.rule), sql: toSql(checked.rule), summary: summarize(rows) });
}
