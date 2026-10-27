import { beforeAll, describe, expect, it } from "vitest";
import type { Client } from "@libsql/client";
import { memoryDb } from "../src/lib/db/client";
import { logRun } from "../src/lib/db/repo";
import { assembleSpec } from "../src/lib/landing/build";
import { blockingFailures, runEvals } from "../src/lib/landing/evals";
import { BriefSchema } from "../src/lib/landing/schema";
import { templateCopy } from "../src/lib/landing/template";
import { aiBudgetExhausted, clientId, LIMITS, rateLimit, sameOrigin } from "../src/lib/security";

let c: Client;
beforeAll(async () => {
  c = await memoryDb();
});

const req = (headers: Record<string, string>) => new Request("https://faire.akashramasani.com/api/x", { method: "POST", headers });

describe("origin and client identity", () => {
  it("allows same-origin and non-browser requests, rejects cross-site", () => {
    expect(sameOrigin(req({ host: "faire.akashramasani.com", origin: "https://faire.akashramasani.com" }))).toBe(true);
    expect(sameOrigin(req({ host: "faire.akashramasani.com" }))).toBe(true);
    expect(sameOrigin(req({ host: "faire.akashramasani.com", origin: "https://evil.example" }))).toBe(false);
    expect(sameOrigin(req({ host: "faire.akashramasani.com", origin: "null" }))).toBe(false);
  });

  it("hashes client IPs instead of storing them", () => {
    const id = clientId(req({ "x-real-ip": "203.0.113.7" }));
    expect(id).toMatch(/^[a-f0-9]{32}$/);
    expect(id).not.toContain("203");
    expect(clientId(req({ "x-real-ip": "203.0.113.8" }))).not.toBe(id);
  });
});

describe("rate limiting", () => {
  it("allows up to the limit, then refuses with a retry time", async () => {
    const { limit } = LIMITS.publish;
    for (let i = 0; i < limit; i++) expect((await rateLimit("publish", "client-a", c)).ok).toBe(true);
    const blocked = await rateLimit("publish", "client-a", c);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    // Other clients and other kinds are unaffected.
    expect((await rateLimit("publish", "client-b", c)).ok).toBe(true);
    expect((await rateLimit("write", "client-a", c)).ok).toBe(true);
  });
});

describe("daily AI budget", () => {
  it("trips once today's logged tokens pass the budget", async () => {
    process.env.DAILY_TOKEN_BUDGET = "10000";
    expect(await aiBudgetExhausted(c)).toBe(false);
    await logRun({ at: Date.now(), kind: "page", campaign: "x", source: "claude", latencyMs: 1, attempts: 1, evals: [], inputTokens: 6000, outputTokens: 5000 }, c);
    expect(await aiBudgetExhausted(c)).toBe(true);
    delete process.env.DAILY_TOKEN_BUDGET;
  });
});

describe("no links or contact details in page copy", () => {
  const brief = BriefSchema.parse({ campaignName: "Holiday", audience: "retailer", channel: "blog", goal: "Get shops to order for the holidays" });
  const failed = (mutate: (s: ReturnType<typeof assembleSpec>) => void) => {
    const s = assembleSpec(templateCopy(brief), brief);
    mutate(s);
    return blockingFailures(runEvals(s)).map((e) => e.id);
  };
  it("passes clean copy", () => expect(failed(() => {})).toEqual([]));
  it.each(["Claim your gift at https://evil.example", "Visit www.example-shop.com today", "Email deals@example.co for access", "Call +1 (415) 555-0199 now", "Order at cheapgifts.shop"])(
    "blocks: %s",
    (text) => expect(failed((s) => (s.hero.subhead = text))).toContain("contact"),
  );
});
