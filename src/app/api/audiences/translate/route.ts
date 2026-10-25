import { z } from "zod";
import { translateAudience } from "@/lib/audiences/translate";

const Body = z.object({ prompt: z.string().min(5).max(600) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Describe the audience in at least a few words" }, { status: 400 });
  const result = await translateAudience(parsed.data.prompt);
  console.log(JSON.stringify({ event: "audience.translated", ok: result.ok, latencyMs: result.latencyMs }));
  return Response.json(result);
}
