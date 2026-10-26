import { describe, expect, it } from "vitest";
import { assembleSpec } from "../src/lib/landing/build";
import { blockingFailures, runEvals } from "../src/lib/landing/evals";
import { LOCALES } from "../src/lib/landing/locale";
import { BriefSchema, type PageSpec } from "../src/lib/landing/schema";
import { templateCopy } from "../src/lib/landing/template";

const brief = (locale: (typeof LOCALES)[number] = "en-US") =>
  BriefSchema.parse({
    campaignName: "Juniper Candles on Faire",
    audience: "retailer",
    channel: "paid_social",
    goal: "Get independent retailers to stock Juniper Candles on Faire",
    focusCategories: ["Candles & Fragrance"],
    locale,
    featuredBrand: { name: "Juniper Candles", slug: "junipercandles" },
  });
const page = (locale: (typeof LOCALES)[number] = "en-US"): PageSpec => assembleSpec(templateCopy(brief(locale)), brief(locale));
const failed = (s: PageSpec) => blockingFailures(runEvals(s)).map((e) => e.id);

describe("featured brand pages", () => {
  for (const locale of LOCALES)
    it(`template passes every check (${locale})`, () => {
      expect(failed(page(locale))).toEqual([]);
    });

  it("links to the brand's real storefront", () => {
    expect(new URL(page().ctaUrl).pathname).toBe("/direct/junipercandles");
    expect(new URL(page("fr-FR").ctaUrl).pathname).toBe("/fr-fr/direct/junipercandles");
  });

  it.each([
    "Hand-poured in Vermont since 1998",
    "An award-winning candle maker",
    "Juniper Candles is family-owned",
    "Loved by 2,000+ retailers",
    "Their best-selling candle",
    "Made in Portland from organic soy",
  ])("blocks invented facts: %s", (claim) => {
    const s = page();
    s.hero.subhead = claim;
    expect(failed(s)).toContain("brandFacts");
  });

  it("requires the storefront link when a brand is featured", () => {
    const s = page();
    s.hero.destination = "retailer_signup";
    expect(failed(s)).toContain("storefront");
  });

  it("rejects a storefront link without a featured brand", () => {
    const plain = BriefSchema.parse({ ...brief(), featuredBrand: undefined });
    const s = assembleSpec({ ...templateCopy(plain), hero: { ...templateCopy(plain).hero, destination: "brand_storefront" } }, plain);
    expect(failed(s)).toContain("storefront");
  });

  it("rejects unsafe storefront slugs", () => {
    expect(BriefSchema.safeParse({ ...brief(), featuredBrand: { name: "X Co", slug: "../evil" } }).success).toBe(false);
  });
});
