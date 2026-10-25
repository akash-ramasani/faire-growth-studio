import { z } from "zod";
import { generatePage } from "@/lib/landing/generate";
import { BriefSchema } from "@/lib/landing/schema";

const Body = z.object({ brief: BriefSchema, variantHint: z.string().max(200).optional() });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid brief", issues: parsed.error.issues }, { status: 400 });
  }
  const result = await generatePage(parsed.data.brief, parsed.data.variantHint);
  console.log(
    JSON.stringify({
      event: "landing_page.generated",
      slug: result.spec.slug,
      source: result.source,
      attempts: result.attempts,
      latencyMs: result.latencyMs,
      blockingFailures: result.evals.filter((e) => e.severity === "blocking" && !e.passed).length,
      fallbackReason: result.fallbackReason,
    }),
  );
  return Response.json(result);
}
