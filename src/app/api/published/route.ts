import { z } from "zod";
import { listPublished, savePublished } from "@/lib/db/repo";
import { SourceSchema, verifySpec } from "@/lib/landing/verify";

export async function GET() {
  return Response.json(await listPublished());
}

const Body = z.object({ spec: z.unknown(), source: SourceSchema });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  // The Publish button is disabled on failing evals, but the gate that matters is this one.
  const verified = verifySpec(parsed.data.spec);
  if (!verified.ok) return Response.json({ ok: false, error: verified.error }, { status: 422 });
  await savePublished({ spec: verified.spec, source: parsed.data.source, publishedAt: Date.now() });
  return Response.json({ ok: true, slug: verified.spec.slug });
}
