import { describe, expect, it } from "vitest";
import { toSql, validateRule } from "../src/lib/audiences/contract";
import { RETAILERS } from "../src/lib/audiences/data";
import { evaluate } from "../src/lib/audiences/evaluate";
import { buildSync } from "../src/lib/audiences/sync";

const lapsed = {
  combinator: "and",
  conditions: [
    { attribute: "country", operator: "eq", value: "US" },
    { attribute: "retailer_type", operator: "in", value: "gift_shop,boutique" },
    { attribute: "days_since_last_order", operator: "gt", value: "120" },
  ],
};

describe("data contract", () => {
  it("accepts a valid rule and types its values", () => {
    const r = validateRule(lapsed);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rule.conditions.map((c) => c.value)).toEqual(["US", ["gift_shop", "boutique"], 120]);
  });

  it("rejects attributes that don't exist", () => {
    expect(validateRule({ combinator: "and", conditions: [{ attribute: "lifetime_value", operator: "gt", value: "1" }] }).ok).toBe(false);
  });

  it("rejects operators that don't fit the type", () => {
    const r = validateRule({ combinator: "and", conditions: [{ attribute: "is_insider", operator: "gt", value: "1" }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/not allowed for a boolean/);
  });

  it("rejects unknown enum values and bad numbers", () => {
    const r = validateRule({
      combinator: "or",
      conditions: [
        { attribute: "country", operator: "eq", value: "Narnia" },
        { attribute: "orders_last_90d", operator: "gte", value: "-3" },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveLength(2);
  });

  it("compiles to SQL", () => {
    const r = validateRule(lapsed);
    if (!r.ok) throw new Error("expected valid");
    expect(toSql(r.rule)).toContain("retailer_type IN ('gift_shop', 'boutique')\n  AND days_since_last_order > 120");
  });
});

describe("evaluation and sync", () => {
  it("never matches never-ordered retailers on a numeric recency rule", () => {
    const r = validateRule(lapsed);
    if (!r.ok) throw new Error("expected valid");
    const rows = evaluate(r.rule);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((x) => x.days_since_last_order !== null && x.days_since_last_order > 120 && x.country === "US")).toBe(true);
  });

  it("drops non-consented records from every destination", () => {
    for (const dest of ["braze", "meta", "google"] as const) {
      const plan = buildSync(dest, "All", RETAILERS);
      const field = dest === "braze" ? "email_opt_in" : "ads_consent";
      expect(plan.eligible).toBe(RETAILERS.filter((r) => r[field]).length);
      expect(plan.eligible + plan.excludedForConsent).toBe(RETAILERS.length);
    }
  });

  it("hashes identifiers for ad platforms", () => {
    const plan = buildSync("meta", "All", RETAILERS);
    const data = (plan.preview as { payload: { data: string[][] } }).payload.data;
    expect(data[0][0]).toMatch(/^[a-f0-9]{64}$/);
  });
});
