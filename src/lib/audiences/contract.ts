import { z } from "zod";
import { CATEGORIES } from "../landing/catalog";

// The data contract for self-serve audiences. Marketers (and the model) can only reference
// attributes declared here, with operators and values that fit each attribute's type.

export const RETAILER_TYPES = ["boutique", "gift_shop", "home_store", "apparel", "bookstore", "cafe", "salon_spa"] as const;
export const COUNTRIES = ["US", "CA", "GB", "DE", "FR", "AU"] as const;

type AttrDef =
  | { type: "enum"; label: string; values: readonly string[]; description: string }
  | { type: "number"; label: string; unit?: string; description: string; nullable?: boolean }
  | { type: "boolean"; label: string; description: string };

export const ATTRIBUTES = {
  retailer_type: { type: "enum", label: "Retailer type", values: RETAILER_TYPES, description: "Self-reported store type" },
  country: { type: "enum", label: "Country", values: COUNTRIES, description: "ISO country of the store" },
  top_category: { type: "enum", label: "Top category", values: CATEGORIES, description: "Category with the most spend in the last 365 days" },
  signup_days_ago: { type: "number", label: "Days since signup", unit: "days", description: "Days since the retailer created an account" },
  orders_last_90d: { type: "number", label: "Orders (90d)", description: "Checked-out orders in the last 90 days" },
  gmv_last_365d: { type: "number", label: "GMV (365d)", unit: "USD", description: "Gross merchandise value in the last 365 days" },
  days_since_last_order: {
    type: "number",
    label: "Days since last order",
    unit: "days",
    nullable: true,
    description: "Days since the most recent order; empty if the retailer has never ordered",
  },
  email_engaged_30d: { type: "boolean", label: "Opened email (30d)", description: "Opened or clicked any marketing email in 30 days" },
  is_insider: { type: "boolean", label: "Faire Insider", description: "Member of the Insider loyalty program" },
  email_opt_in: { type: "boolean", label: "Email opt-in", description: "Consented to marketing email" },
  ads_consent: { type: "boolean", label: "Ads consent", description: "Consented to ad-platform matching" },
} as const satisfies Record<string, AttrDef>;

export type AttributeKey = keyof typeof ATTRIBUTES;
export const ATTRIBUTE_KEYS = Object.keys(ATTRIBUTES) as [AttributeKey, ...AttributeKey[]];

export const OPERATORS = ["eq", "neq", "gt", "gte", "lt", "lte", "in", "not_in", "is_true", "is_false", "is_empty"] as const;
export type Operator = (typeof OPERATORS)[number];

export const OPERATOR_LABELS: Record<Operator, string> = {
  eq: "is",
  neq: "is not",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  in: "is any of",
  not_in: "is none of",
  is_true: "is true",
  is_false: "is false",
  is_empty: "is empty",
};

export function operatorsFor(attr: AttributeKey): Operator[] {
  const def: AttrDef = ATTRIBUTES[attr];
  if (def.type === "boolean") return ["is_true", "is_false"];
  if (def.type === "enum") return ["eq", "neq", "in", "not_in"];
  return def.nullable ? ["eq", "gt", "gte", "lt", "lte", "is_empty"] : ["eq", "neq", "gt", "gte", "lt", "lte"];
}

// Loose shape: what a UI form or the model submits. Values are strings until the contract types them.
export const DraftRuleSchema = z.object({
  combinator: z.enum(["and", "or"]),
  conditions: z.array(
    z.object({
      attribute: z.enum(ATTRIBUTE_KEYS),
      operator: z.enum(OPERATORS),
      value: z.string().describe("Number as digits, enum values comma-separated, empty for boolean/is_empty operators"),
    }),
  ),
});
export type DraftRule = z.infer<typeof DraftRuleSchema>;

export type TypedValue = string | number | string[] | null;
export type Condition = { attribute: AttributeKey; operator: Operator; value: TypedValue };
export type AudienceRule = { combinator: "and" | "or"; conditions: Condition[] };

export type ContractResult = { ok: true; rule: AudienceRule } | { ok: false; errors: string[] };

export function validateRule(input: unknown): ContractResult {
  const parsed = DraftRuleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".") || "rule"}: ${i.message}`) };

  const errors: string[] = [];
  const conditions: Condition[] = [];
  if (parsed.data.conditions.length === 0) errors.push("Add at least one condition");
  if (parsed.data.conditions.length > 8) errors.push("Audiences are limited to 8 conditions");

  parsed.data.conditions.forEach((c, i) => {
    const def: AttrDef = ATTRIBUTES[c.attribute];
    const where = `Condition ${i + 1} (${def.label})`;
    if (!operatorsFor(c.attribute).includes(c.operator)) {
      errors.push(`${where}: "${OPERATOR_LABELS[c.operator]}" is not allowed for a ${def.type} attribute`);
      return;
    }
    if (c.operator === "is_true" || c.operator === "is_false" || c.operator === "is_empty") {
      conditions.push({ attribute: c.attribute, operator: c.operator, value: null });
      return;
    }
    if (def.type === "number") {
      const n = Number(c.value.replace(/[$,\s]/g, ""));
      if (c.value.trim() === "" || !Number.isFinite(n) || n < 0) errors.push(`${where}: "${c.value}" is not a non-negative number`);
      else conditions.push({ attribute: c.attribute, operator: c.operator, value: n });
      return;
    }
    if (def.type === "enum") {
      const values = c.value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const bad = values.filter((v) => !def.values.includes(v));
      if (values.length === 0) errors.push(`${where}: choose a value`);
      else if (bad.length) errors.push(`${where}: unknown value(s) ${bad.map((b) => `"${b}"`).join(", ")}`);
      else if ((c.operator === "eq" || c.operator === "neq") && values.length > 1) errors.push(`${where}: use "is any of" for multiple values`);
      else conditions.push({ attribute: c.attribute, operator: c.operator, value: c.operator === "eq" || c.operator === "neq" ? values[0] : values });
    }
  });

  return errors.length ? { ok: false, errors } : { ok: true, rule: { combinator: parsed.data.combinator, conditions } };
}

export function describeRule(rule: AudienceRule): string {
  return rule.conditions
    .map((c) => {
      const def = ATTRIBUTES[c.attribute];
      const v = Array.isArray(c.value) ? c.value.join(", ") : c.value === null ? "" : String(c.value);
      return `${def.label} ${OPERATOR_LABELS[c.operator]}${v ? ` ${v}` : ""}`;
    })
    .join(rule.combinator === "and" ? " AND " : " OR ");
}

// The same rule compiled for the warehouse, so analysts can audit exactly what a marketer built.
export function toSql(rule: AudienceRule, table = "analytics.retailer_marketing_attributes"): string {
  const lit = (v: string | number) => (typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);
  const clause = (c: Condition) => {
    const col = c.attribute;
    switch (c.operator) {
      case "is_true":
        return `${col} = TRUE`;
      case "is_false":
        return `${col} = FALSE`;
      case "is_empty":
        return `${col} IS NULL`;
      case "in":
        return `${col} IN (${(c.value as string[]).map(lit).join(", ")})`;
      case "not_in":
        return `${col} NOT IN (${(c.value as string[]).map(lit).join(", ")})`;
      default: {
        const op = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=" }[c.operator];
        return `${col} ${op} ${lit(c.value as string | number)}`;
      }
    }
  };
  return `SELECT retailer_id\nFROM ${table}\nWHERE ${rule.conditions.map(clause).join(`\n  ${rule.combinator.toUpperCase()} `)}`;
}
