import { connection } from "next/server";
import { MODEL } from "@/lib/claude";

export async function GET() {
  // Read env at request time so adding a key later doesn't require a rebuild.
  await connection();
  return Response.json({ claudeConfigured: Boolean(process.env.ANTHROPIC_API_KEY), model: MODEL });
}
