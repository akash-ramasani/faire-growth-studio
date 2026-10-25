import type { Client } from "@libsql/client";
import { beforeAll, describe, expect, it } from "vitest";
import { validateRule } from "../src/lib/audiences/contract";
import { RETAILERS } from "../src/lib/audiences/data";
import { evaluate } from "../src/lib/audiences/evaluate";
import { memoryDb } from "../src/lib/db/client";
import {
  addLearnings,
  countRetailers,
  getExperiment,
  getPublished,
  listLearnings,
  listRuns,
  logRun,
  queryAudience,
  saveExperiment,
  savePublished,
  setLearningActive,
} from "../src/lib/db/repo";
import { createExperiment } from "../src/lib/experiments/model";
import { assembleSpec } from "../src/lib/landing/build";
import { BriefSchema } from "../src/lib/landing/schema";
import { templateCopy } from "../src/lib/landing/template";
import { verifySpec } from "../src/lib/landing/verify";

let c: Client;
beforeAll(async () => {
  c = await memoryDb();
});

const brief = BriefSchema.parse({ campaignName: "Holiday", audience: "retailer", channel: "paid_social", goal: "Get shops to order for the holidays" });
const spec = () => assembleSpec(templateCopy(brief), brief);

describe("audiences in SQLite", () => {
  it("seeds every synthetic retailer", async () => {
    expect(await countRetailers(c)).toBe(RETAILERS.length);
  });

  const rules = {
    lapsed: { combinator: "and", conditions: [{ attribute: "country", operator: "eq", value: "US" }, { attribute: "retailer_type", operator: "in", value: "gift_shop,boutique" }, { attribute: "days_since_last_order", operator: "gt", value: "120" }, { attribute: "email_engaged_30d", operator: "is_true", value: "" }] },
    neverOrdered: { combinator: "and", conditions: [{ attribute: "signup_days_ago", operator: "lte", value: "60" }, { attribute: "days_since_last_order", operator: "is_empty", value: "" }] },
    either: { combinator: "or", conditions: [{ attribute: "is_insider", operator: "is_true", value: "" }, { attribute: "gmv_last_365d", operator: "gte", value: "8000" }] },
    exclusions: { combinator: "and", conditions: [{ attribute: "country", operator: "not_in", value: "US,CA" }, { attribute: "top_category", operator: "neq", value: "Jewelry" }, { attribute: "orders_last_90d", operator: "lt", value: "3" }] },
  };

  for (const [name, draft] of Object.entries(rules)) {
    it(`SQL matches the in-memory reference: ${name}`, async () => {
      const checked = validateRule(draft);
      if (!checked.ok) throw new Error(checked.errors.join("; "));
      const fromSql = (await queryAudience(checked.rule, c)).map((r) => r.id);
      const fromMemory = evaluate(checked.rule).map((r) => r.id);
      expect(fromSql).toEqual(fromMemory);
      expect(fromSql.length).toBeGreaterThan(0);
    });
  }

  it("binds values instead of interpolating them", async () => {
    const checked = validateRule({ combinator: "and", conditions: [{ attribute: "country", operator: "in", value: "US" }] });
    if (!checked.ok) throw new Error();
    // A hostile value never reaches SQL: the contract rejects it before compilation.
    expect(validateRule({ combinator: "and", conditions: [{ attribute: "country", operator: "eq", value: "US' OR 1=1 --" }] }).ok).toBe(false);
    expect((await queryAudience(checked.rule, c)).every((r) => r.country === "US")).toBe(true);
  });
});

describe("published pages", () => {
  it("round-trips through the database", async () => {
    const s = spec();
    await savePublished({ spec: s, source: "template_fallback", publishedAt: 1 }, c);
    expect((await getPublished(s.slug, c))?.spec.hero.headline).toBe(s.hero.headline);
    expect(await getPublished("missing", c)).toBeNull();
  });

  it("server gate rebuilds the CTA URL instead of trusting the client", () => {
    const tampered = { ...spec(), ctaUrl: "javascript:alert(1)", slug: "../../evil" };
    const v = verifySpec(tampered);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.spec.ctaUrl.startsWith("https://www.faire.com/")).toBe(true);
      expect(v.spec.slug).toBe("holiday");
    }
  });

  it("server gate refuses pages that fail blocking evals", () => {
    const bad = spec();
    bad.hero.headline = "Guaranteed sales, risk-free";
    expect(verifySpec(bad)).toMatchObject({ ok: false });
  });
});

describe("runs, experiments and learnings", () => {
  it("logs runs newest first", async () => {
    await logRun({ at: 1, kind: "page", campaign: "first", source: "claude", latencyMs: 10, attempts: 1, evals: [] }, c);
    await logRun({ at: 2, kind: "audience", campaign: "second", source: "audience_ok", latencyMs: 5, attempts: 1, evals: [] }, c);
    expect((await listRuns(10, c)).map((r) => r.campaign)).toEqual(["second", "first"]);
  });

  it("persists experiments and learnings", async () => {
    const exp = createExperiment({ spec: spec(), source: "claude" }, { spec: spec(), source: "claude" });
    await saveExperiment(exp, c);
    expect((await getExperiment(exp.id, c))?.name).toBe("Holiday");
    await addLearnings([{ id: "l1", experimentId: exp.id, createdAt: 1, audience: "retailer", channel: "paid_social", locale: "en-US", text: "Lead with terms", lift: 0.1, confidence: 0.97, active: true }], c);
    await setLearningActive("l1", false, c);
    expect((await listLearnings(c))[0]).toMatchObject({ id: "l1", active: false });
  });
});
