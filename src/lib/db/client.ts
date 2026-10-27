import { createClient, type Client } from "@libsql/client";
import { RETAILERS } from "../audiences/data";

// SQLite via libSQL: a local file in development, Turso (hosted SQLite) in production.
// Turso's Vercel integration may name the variables either way, so accept both.
function config() {
  const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN;
  if (url) return { url, authToken };
  // Serverless functions only have /tmp; it works but resets per instance, so production should set a URL.
  return { url: process.env.VERCEL ? "file:/tmp/growth-studio.db" : "file:local.db" };
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('page', 'audience')),
  campaign TEXT NOT NULL,
  source TEXT NOT NULL,
  locale TEXT,
  latency_ms INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  evals TEXT NOT NULL DEFAULT '[]',
  fallback_reason TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER
);
CREATE INDEX IF NOT EXISTS runs_at ON runs (at DESC);

CREATE TABLE IF NOT EXISTS published_pages (
  slug TEXT PRIMARY KEY,
  spec TEXT NOT NULL,
  source TEXT NOT NULL,
  published_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learnings (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  audience TEXT NOT NULL,
  channel TEXT NOT NULL,
  locale TEXT NOT NULL,
  text TEXT NOT NULL,
  lift REAL NOT NULL,
  confidence REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS learnings_audience ON learnings (audience, active, created_at DESC);

CREATE TABLE IF NOT EXISTS retailers (
  id TEXT PRIMARY KEY,
  store_name TEXT NOT NULL,
  email TEXT NOT NULL,
  retailer_type TEXT NOT NULL,
  country TEXT NOT NULL,
  top_category TEXT NOT NULL,
  signup_days_ago INTEGER NOT NULL,
  orders_last_90d INTEGER NOT NULL,
  gmv_last_365d INTEGER NOT NULL,
  days_since_last_order INTEGER,
  email_engaged_30d INTEGER NOT NULL,
  is_insider INTEGER NOT NULL,
  email_opt_in INTEGER NOT NULL,
  ads_consent INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS retailers_country_type ON retailers (country, retailer_type);

CREATE TABLE IF NOT EXISTS rate_events (
  key TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_events_key_at ON rate_events (key, at);

CREATE TABLE IF NOT EXISTS audience_syncs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  rule TEXT NOT NULL,
  matched INTEGER NOT NULL,
  eligible INTEGER NOT NULL,
  excluded INTEGER NOT NULL
);
`;

const b = (v: boolean) => (v ? 1 : 0);

async function seedRetailers(db: Client) {
  const { rows } = await db.execute("SELECT COUNT(*) AS n FROM retailers");
  if (Number(rows[0].n) > 0) return;
  const insert = `INSERT OR IGNORE INTO retailers VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  for (let i = 0; i < RETAILERS.length; i += 400) {
    await db.batch(
      RETAILERS.slice(i, i + 400).map((r) => ({
        sql: insert,
        args: [
          r.id, r.storeName, r.email, r.retailer_type, r.country, r.top_category, r.signup_days_ago, r.orders_last_90d,
          r.gmv_last_365d, r.days_since_last_order, b(r.email_engaged_30d), b(r.is_insider), b(r.email_opt_in), b(r.ads_consent),
        ],
      })),
      "write",
    );
  }
}

let ready: Promise<Client> | null = null;

/** Connected, migrated and seeded client. Memoized per server instance. */
export function db(): Promise<Client> {
  ready ??= (async () => {
    const client = createClient(config());
    await client.executeMultiple(SCHEMA);
    await seedRetailers(client);
    return client;
  })().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

/** For tests: a fresh in-memory database with the same schema and seed. */
export async function memoryDb(): Promise<Client> {
  const client = createClient({ url: ":memory:" });
  await client.executeMultiple(SCHEMA);
  await seedRetailers(client);
  return client;
}
