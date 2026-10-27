import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

let client: Anthropic | null = null;

// Returns null when no key is configured; callers fall back to their deterministic path.
export function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}

/**
 * Public-safe description of a model failure. Shown to visitors and stored in the run log, so it
 * never includes raw provider messages (which can echo request details); those go to server logs.
 */
export function describeError(err: unknown): string {
  console.error("claude call failed", err);
  if (err instanceof Anthropic.RateLimitError) return "The AI service is busy (rate limited)";
  if (err instanceof Anthropic.AuthenticationError) return "The AI service rejected this deployment's credentials";
  if (err instanceof Anthropic.APIConnectionError) return "Could not reach the AI service";
  if (err instanceof Anthropic.APIError) return `The AI service returned an error${err.status ? ` (${err.status})` : ""}`;
  // Errors we throw ourselves (refusal, truncation, schema mismatch) are already public-safe.
  return err instanceof Error && err.message.length < 140 ? err.message : "Unexpected error while calling the AI service";
}
