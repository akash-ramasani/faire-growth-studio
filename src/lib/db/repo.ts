import type { Client, Row } from "@libsql/client";
import type { AudienceRule } from "../audiences/contract";
import { toWhere } from "../audiences/contract";
import type { Retailer } from "../audiences/data";
import type { Experiment, Learning } from "../experiments/model";
import type { GenerationResult, PageSpec } from "../landing/schema";
import { db } from "./client";

// Data access for everything the app persists. Every function takes an optional client so tests
// can run the same queries against an in-memory database.

export type RunRecord = {
  at: number;
  kind: "page" | "audience";
  campaign: string;
  source: GenerationResult["source"] | "audience_ok" | "audience_failed";
  locale?: string;
  latencyMs: number;
  attempts: number;
  evals: { id: string; name: string; passed: boolean; severity: string }[];
  fallbackReason?: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type PublishedPage = { spec: PageSpec; publishedAt: number; source: GenerationResult["source"] };

const MAX_RUNS = 1000;
const json = <T>(v: unknown, fallback: T): T => {
  try {
    return JSON.parse(String(v)) as T;
  } catch {
    return fallback;
  }
};
const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));

// --- runs -------------------------------------------------------------------------------------

export async function logRun(r: RunRecord, client?: Client) {
  const c = client ?? (await db());
  await c.batch(
    [
      {
        sql: `INSERT INTO runs (at, kind, campaign, source, locale, latency_ms, attempts, evals, fallback_reason, input_tokens, output_tokens)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        args: [r.at, r.kind, r.campaign.slice(0, 120), r.source, r.locale ?? null, r.latencyMs, r.attempts, JSON.stringify(r.evals), r.fallbackReason ?? null, r.inputTokens ?? null, r.outputTokens ?? null],
      },
      // Keep the log bounded; this is a demo database, not the warehouse.
      { sql: `DELETE FROM runs WHERE id NOT IN (SELECT id FROM runs ORDER BY id DESC LIMIT ${MAX_RUNS})`, args: [] },
    ],
    "write",
  );
}

export async function listRuns(limit = 200, client?: Client): Promise<RunRecord[]> {
  const c = client ?? (await db());
  const { rows } = await c.execute({ sql: "SELECT * FROM runs ORDER BY id DESC LIMIT ?", args: [limit] });
  return rows.map((r) => ({
    at: Number(r.at),
    kind: r.kind as RunRecord["kind"],
    campaign: String(r.campaign),
    source: r.source as RunRecord["source"],
    locale: r.locale ? String(r.locale) : undefined,
    latencyMs: Number(r.latency_ms),
    attempts: Number(r.attempts),
    evals: json(r.evals, []),
    fallbackReason: r.fallback_reason ? String(r.fallback_reason) : undefined,
    inputTokens: num(r.input_tokens),
    outputTokens: num(r.output_tokens),
  }));
}

export async function clearRuns(client?: Client) {
  await (client ?? (await db())).execute("DELETE FROM runs");
}

// --- published pages ----------------------------------------------------------------------------

export async function savePublished(p: PublishedPage, client?: Client) {
  await (client ?? (await db())).execute({
    sql: `INSERT INTO published_pages (slug, spec, source, published_at) VALUES (?,?,?,?)
          ON CONFLICT(slug) DO UPDATE SET spec = excluded.spec, source = excluded.source, published_at = excluded.published_at`,
    args: [p.spec.slug, JSON.stringify(p.spec), p.source, p.publishedAt],
  });
}

const toPublished = (r: Row): PublishedPage => ({
  spec: json(r.spec, {} as PageSpec),
  source: r.source as PublishedPage["source"],
  publishedAt: Number(r.published_at),
});

export async function getPublished(slug: string, client?: Client): Promise<PublishedPage | null> {
  const { rows } = await (client ?? (await db())).execute({ sql: "SELECT * FROM published_pages WHERE slug = ?", args: [slug] });
  return rows[0] ? toPublished(rows[0]) : null;
}

export async function listPublished(limit = 20, client?: Client): Promise<PublishedPage[]> {
  const { rows } = await (client ?? (await db())).execute({ sql: "SELECT * FROM published_pages ORDER BY published_at DESC LIMIT ?", args: [limit] });
  return rows.map(toPublished);
}

// --- experiments --------------------------------------------------------------------------------

export async function saveExperiment(e: Experiment, client?: Client) {
  await (client ?? (await db())).execute({
    sql: `INSERT INTO experiments (id, name, status, created_at, updated_at, data) VALUES (?,?,?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at, data = excluded.data`,
    args: [e.id, e.name, e.status, e.createdAt, Date.now(), JSON.stringify(e)],
  });
}

export async function getExperiment(id: string, client?: Client): Promise<Experiment | null> {
  const { rows } = await (client ?? (await db())).execute({ sql: "SELECT data FROM experiments WHERE id = ?", args: [id] });
  return rows[0] ? json<Experiment>(rows[0].data, null as unknown as Experiment) : null;
}

export async function listExperiments(limit = 30, client?: Client): Promise<Experiment[]> {
  const { rows } = await (client ?? (await db())).execute({ sql: "SELECT data FROM experiments ORDER BY created_at DESC LIMIT ?", args: [limit] });
  return rows.map((r) => json<Experiment>(r.data, null as unknown as Experiment)).filter(Boolean);
}

// --- learnings ----------------------------------------------------------------------------------

export async function addLearnings(ls: Learning[], client?: Client) {
  if (!ls.length) return;
  await (client ?? (await db())).batch(
    ls.map((l) => ({
      sql: `INSERT OR REPLACE INTO learnings (id, experiment_id, created_at, audience, channel, locale, text, lift, confidence, active)
            VALUES (?,?,?,?,?,?,?,?,?,?)`,
      args: [l.id, l.experimentId, l.createdAt, l.audience, l.channel, l.locale, l.text, l.lift, l.confidence, l.active ? 1 : 0],
    })),
    "write",
  );
}

export async function listLearnings(client?: Client): Promise<Learning[]> {
  const { rows } = await (client ?? (await db())).execute("SELECT * FROM learnings ORDER BY created_at DESC LIMIT 100");
  return rows.map((r) => ({
    id: String(r.id),
    experimentId: String(r.experiment_id),
    createdAt: Number(r.created_at),
    audience: r.audience as Learning["audience"],
    channel: r.channel as Learning["channel"],
    locale: r.locale as Learning["locale"],
    text: String(r.text),
    lift: Number(r.lift),
    confidence: Number(r.confidence),
    active: Number(r.active) === 1,
  }));
}

export async function setLearningActive(id: string, active: boolean, client?: Client) {
  await (client ?? (await db())).execute({ sql: "UPDATE learnings SET active = ? WHERE id = ?", args: [active ? 1 : 0, id] });
}

export async function clearLearnings(client?: Client) {
  await (client ?? (await db())).execute("DELETE FROM learnings");
}

// --- audiences ----------------------------------------------------------------------------------

const toRetailer = (r: Row): Retailer => ({
  id: String(r.id),
  storeName: String(r.store_name),
  email: String(r.email),
  retailer_type: r.retailer_type as Retailer["retailer_type"],
  country: r.country as Retailer["country"],
  top_category: r.top_category as Retailer["top_category"],
  signup_days_ago: Number(r.signup_days_ago),
  orders_last_90d: Number(r.orders_last_90d),
  gmv_last_365d: Number(r.gmv_last_365d),
  days_since_last_order: r.days_since_last_order === null ? null : Number(r.days_since_last_order),
  email_engaged_30d: Number(r.email_engaged_30d) === 1,
  is_insider: Number(r.is_insider) === 1,
  email_opt_in: Number(r.email_opt_in) === 1,
  ads_consent: Number(r.ads_consent) === 1,
});

/** Runs a validated rule as parameterized SQL against the retailers table. */
export async function queryAudience(rule: AudienceRule, client?: Client): Promise<Retailer[]> {
  const { where, args } = toWhere(rule);
  const { rows } = await (client ?? (await db())).execute({ sql: `SELECT * FROM retailers WHERE ${where} ORDER BY id`, args });
  return rows.map(toRetailer);
}

export async function countRetailers(client?: Client): Promise<number> {
  const { rows } = await (client ?? (await db())).execute("SELECT COUNT(*) AS n FROM retailers");
  return Number(rows[0].n);
}

export async function logSync(
  s: { name: string; destination: string; rule: AudienceRule; matched: number; eligible: number; excluded: number },
  client?: Client,
) {
  await (client ?? (await db())).execute({
    sql: "INSERT INTO audience_syncs (at, name, destination, rule, matched, eligible, excluded) VALUES (?,?,?,?,?,?,?)",
    args: [Date.now(), s.name, s.destination, JSON.stringify(s.rule), s.matched, s.eligible, s.excluded],
  });
}
