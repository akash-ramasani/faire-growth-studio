import { z } from "zod";
import { generatePage } from "@/lib/landing/generate";
import { BriefSchema } from "@/lib/landing/schema";

const Body = z.object({
  brief: BriefSchema,
  variantHint: z.string().max(300).optional(),
  // Learnings come from the browser in this demo, so they are bounded like any other input.
  learnings: z.array(z.string().max(240)).max(8).optional(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid brief", issues: parsed.error.issues }, { status: 400 });
  }
  const { brief, variantHint, learnings } = parsed.data;
  const result = await generatePage(brief, { variantHint, learnings });
  console.log(
    JSON.stringify({
      event: "landing_page.generated",
      slug: result.spec.slug,
      locale: brief.locale,
      learningsApplied: learnings?.length ?? 0,
      source: result.source,
      attempts: result.attempts,
      latencyMs: result.latencyMs,
      blockingFailures: result.evals.filter((e) => e.severity === "blocking" && !e.passed).length,
      fallbackReason: result.fallbackReason,
    }),
  );
  return Response.json(result);
}
