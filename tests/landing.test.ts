import { describe, expect, it } from "vitest";
import { assembleSpec } from "../src/lib/landing/build";
import { blockingFailures, runEvals } from "../src/lib/landing/evals";
import { generatePage } from "../src/lib/landing/generate";
import { BriefSchema, type PageSpec } from "../src/lib/landing/schema";
import { templateCopy } from "../src/lib/landing/template";

const retailer = BriefSchema.parse({
  campaignName: "Holiday Restock",
  audience: "retailer",
  channel: "paid_social",
  goal: "Get gift shops to place a holiday order",
  offer: "Free shipping on qualifying opening orders",
  focusCategories: ["Gifts & Novelty"],
});
const brand = BriefSchema.parse({ campaignName: "Makers", audience: "brand", channel: "paid_search", goal: "Get makers to apply to sell" });

const page = (brief = retailer): PageSpec => assembleSpec(templateCopy(brief), brief);
const failedIds = (spec: PageSpec) => blockingFailures(runEvals(spec)).map((e) => e.id);

describe("template fallback", () => {
  it.each([retailer, brand])("always passes blocking evals (%s.audience)", (brief) => {
    expect(failedIds(page(brief))).toEqual([]);
  });

  it("is what generatePage returns without an API key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await generatePage(retailer);
    expect(result.source).toBe("template_fallback");
    expect(result.fallbackReason).toMatch(/ANTHROPIC_API_KEY/);
    expect(blockingFailures(result.evals)).toEqual([]);
  });
});

describe("evals", () => {
  it("adds UTM tracking in code", () => {
    const url = new URL(page().ctaUrl);
    expect(url.searchParams.get("utm_source")).toBe("meta");
    expect(url.searchParams.get("utm_campaign")).toBe("holiday-restock");
  });

  it("blocks prohibited claims", () => {
    const spec = page();
    spec.hero.headline = "Guaranteed sales, risk-free";
    expect(failedIds(spec)).toContain("claims");
  });

  it("requires a qualifier on free shipping", () => {
    const spec = page();
    spec.hero.subhead = "Enjoy free shipping on everything.";
    expect(failedIds(spec)).toContain("qualifiers");
    spec.hero.subhead = "Free shipping on qualifying orders.";
    expect(failedIds(spec)).not.toContain("qualifiers");
  });

  it("blocks a brand destination or quote on a retailer page", () => {
    const spec = page();
    spec.hero.destination = "brand_signup";
    spec.testimonialId = "t_brand_candles";
    expect(failedIds(spec)).toContain("audience");
  });

  it("enforces layout lengths and section counts", () => {
    const spec = page();
    spec.hero.headline = "x".repeat(71);
    spec.valueProps = spec.valueProps.slice(0, 2);
    expect(failedIds(spec)).toEqual(expect.arrayContaining(["length", "structure"]));
  });

  it("catches placeholder text", () => {
    const spec = page();
    spec.closing.headline = "Join [BRAND] today";
    expect(failedIds(spec)).toContain("placeholders");
  });
});

describe("untrusted brief input", () => {
  it("keeps a non-compliant offer out of the fallback template", () => {
    const brief = BriefSchema.parse({ ...retailer, offer: "Unlimited free shipping, guaranteed" });
    const spec = page(brief);
    expect(spec.hero.subhead).not.toMatch(/unlimited|guaranteed/i);
    expect(failedIds(spec)).toEqual([]);
  });
});

it("returns a fresh copy of the template every time", () => {
  const first = page();
  first.closing.headline = "mutated";
  first.valueProps[0].title = "mutated";
  expect(page().closing.headline).not.toBe("mutated");
  expect(page().valueProps[0].title).not.toBe("mutated");
});

it("warns when the hero names an offer the brief didn't ask for", () => {
  const noOffer = BriefSchema.parse({ ...retailer, offer: "" });
  const spec = assembleSpec(templateCopy(noOffer), noOffer);
  expect(runEvals(spec).find((e) => e.id === "unrequestedOffer")?.passed).toBe(true);
  spec.hero.headline = "Stock up with Net 60 terms for approved retailers";
  expect(runEvals(spec).find((e) => e.id === "unrequestedOffer")?.passed).toBe(false);
});
