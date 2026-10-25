import type { AudienceRule, Condition } from "./contract";
import { RETAILERS, type Retailer } from "./data";

function matches(r: Retailer, c: Condition): boolean {
  const actual = r[c.attribute];
  switch (c.operator) {
    case "is_true":
      return actual === true;
    case "is_false":
      return actual === false;
    case "is_empty":
      return actual === null;
    case "in":
      return (c.value as string[]).includes(actual as string);
    case "not_in":
      return !(c.value as string[]).includes(actual as string);
    case "eq":
      return actual === c.value;
    case "neq":
      return actual !== c.value;
  }
  if (actual === null || typeof actual !== "number") return false;
  const v = c.value as number;
  switch (c.operator) {
    case "gt":
      return actual > v;
    case "gte":
      return actual >= v;
    case "lt":
      return actual < v;
    case "lte":
      return actual <= v;
  }
}

export function evaluate(rule: AudienceRule, rows: Retailer[] = RETAILERS): Retailer[] {
  const test = (r: Retailer) =>
    rule.combinator === "and" ? rule.conditions.every((c) => matches(r, c)) : rule.conditions.some((c) => matches(r, c));
  return rows.filter(test);
}

function countBy<K extends string>(rows: Retailer[], key: (r: Retailer) => K) {
  const m = new Map<K, number>();
  rows.forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
}

export function summarize(rows: Retailer[]) {
  const gmv = rows.reduce((s, r) => s + r.gmv_last_365d, 0);
  return {
    size: rows.length,
    total: RETAILERS.length,
    reachableEmail: rows.filter((r) => r.email_opt_in).length,
    reachableAds: rows.filter((r) => r.ads_consent).length,
    avgGmv: rows.length ? Math.round(gmv / rows.length) : 0,
    byCountry: countBy(rows, (r) => r.country),
    byType: countBy(rows, (r) => r.retailer_type),
    sample: rows.slice(0, 8).map((r) => ({
      id: r.id,
      storeName: r.storeName,
      country: r.country,
      retailer_type: r.retailer_type,
      orders_last_90d: r.orders_last_90d,
      gmv_last_365d: r.gmv_last_365d,
      days_since_last_order: r.days_since_last_order,
    })),
  };
}
export type AudienceSummary = ReturnType<typeof summarize>;
