import type { Client } from "@libsql/client";
import { createHash } from "node:crypto";
import { db } from "./db/client";

// Request guards for the public API. Every mutating route runs `guard()` first:
//   1. JSON only: rejects text/plain and form posts, which browsers send cross-site without a preflight.
//   2. Same origin: if the browser sends an Origin header, it must match this site (CSRF).
//   3. Size: bodies over the limit are refused before parsing.
//   4. Rate limit per client, stored in SQLite so it holds across serverless instances.

export const LIMITS = {
  generate: { limit: 12, windowMs: 60 * 60 * 1000 }, // Claude page generations per client per hour
  translate: { limit: 30, windowMs: 60 * 60 * 1000 }, // Claude audience translations per client per hour
  publish: { limit: 20, windowMs: 60 * 60 * 1000 },
  experiment: { limit: 120, windowMs: 60 * 60 * 1000 }, // creates + simulate/conclude clicks
  preview: { limit: 600, windowMs: 60 * 60 * 1000 }, // audience counts re-run on every rule edit
  write: { limit: 120, windowMs: 60 * 60 * 1000 }, // syncs, learning toggles
} as const;
export type LimitKind = keyof typeof LIMITS;

const MAX_BODY_BYTES = 64 * 1024;

/** Stable, non-reversible client id: we never store raw IP addresses. */
export function clientId(request: Request): string {
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256")
    .update(`${process.env.RATE_LIMIT_SALT ?? "growth-studio"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl, server-to-server) don't send Origin
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const deny = (status: number, error: string, extra: Record<string, string> = {}) =>
  Response.json({ ok: false, error }, { status, headers: extra });

/** Counts this request against the client's window and reports whether it's allowed. */
export async function rateLimit(kind: LimitKind, client: string, database?: Client): Promise<{ ok: boolean; retryAfterSec: number }> {
  const { limit, windowMs } = LIMITS[kind];
  const now = Date.now();
  const c = database ?? (await db());
  const key = `${kind}:${client}`;
  const { rows } = await c.execute({ sql: "SELECT COUNT(*) AS n, MIN(at) AS first FROM rate_events WHERE key = ? AND at > ?", args: [key, now - windowMs] });
  const used = Number(rows[0].n);
  if (used >= limit) {
    const first = Number(rows[0].first ?? now);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((first + windowMs - now) / 1000)) };
  }
  await c.batch(
    [
      { sql: "INSERT INTO rate_events (key, at) VALUES (?, ?)", args: [key, now] },
      // Opportunistic cleanup keeps the table small.
      { sql: "DELETE FROM rate_events WHERE at < ?", args: [now - 24 * 60 * 60 * 1000] },
    ],
    "write",
  );
  return { ok: true, retryAfterSec: 0 };
}

/** Returns a ready error Response if the request should be refused, otherwise null. */
export async function guard(request: Request, kind: LimitKind): Promise<Response | null> {
  if (!sameOrigin(request)) return deny(403, "Cross-site requests are not allowed");
  const type = request.headers.get("content-type") ?? "";
  if (request.method !== "DELETE" && !type.toLowerCase().startsWith("application/json")) return deny(415, "Send JSON (Content-Type: application/json)");
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return deny(413, "Request is too large");
  const rl = await rateLimit(kind, clientId(request));
  if (!rl.ok) return deny(429, `Too many requests. Try again in ${Math.ceil(rl.retryAfterSec / 60)} minute(s).`, { "Retry-After": String(rl.retryAfterSec) });
  return null;
}

/** Reads a JSON body with a hard size cap (content-length can be absent or wrong). */
export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Daily spend guard. Once today's logged model tokens pass the budget, AI calls stop and the
 * app uses its non-AI paths (approved template, rule builder) until midnight UTC.
 */
export async function aiBudgetExhausted(database?: Client): Promise<boolean> {
  const budget = Number(process.env.DAILY_TOKEN_BUDGET ?? 1_500_000);
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { rows } = await (database ?? (await db())).execute({
    sql: "SELECT COALESCE(SUM(COALESCE(input_tokens,0) + COALESCE(output_tokens,0)), 0) AS used FROM runs WHERE at >= ?",
    args: [startOfDay.getTime()],
  });
  return Number(rows[0].used) >= budget;
}

/** Destructive admin actions are disabled on the public deployment. */
export const destructiveAllowed = () => process.env.NODE_ENV !== "production" || process.env.ALLOW_DESTRUCTIVE === "1";
