import { describe, expect, it } from "vitest";
import { assembleSpec } from "../src/lib/landing/build";
import { blockingFailures, claimViolations, runEvals } from "../src/lib/landing/evals";
import { LOCALES } from "../src/lib/landing/locale";
import { BriefSchema, type PageSpec } from "../src/lib/landing/schema";
import { templateCopy } from "../src/lib/landing/template";

const base = { campaignName: "Spring Launch", channel: "paid_social", goal: "Get shops to place a first spring order" } as const;
const brief = (locale: (typeof LOCALES)[number], audience: "retailer" | "brand" = "retailer") => BriefSchema.parse({ ...base, audience, locale });
const page = (locale: (typeof LOCALES)[number], audience: "retailer" | "brand" = "retailer", variant: "A" | "B" = "A"): PageSpec =>
  assembleSpec(templateCopy(brief(locale, audience), variant), brief(locale, audience));
const failedIds = (spec: PageSpec) => blockingFailures(runEvals(spec)).map((e) => e.id);

describe("market templates", () => {
  for (const locale of LOCALES)
    for (const audience of ["retailer", "brand"] as const)
      for (const variant of ["A", "B"] as const)
        it(`${locale} ${audience} ${variant} passes blocking evals`, () => {
          expect(failedIds(page(locale, audience, variant))).toEqual([]);
        });

  it("routes CTAs to the market's site", () => {
    expect(new URL(page("de-DE").ctaUrl).pathname).toBe("/de-de/signup");
    expect(new URL(page("en-US").ctaUrl).pathname).toBe("/signup");
  });

  it("B leads with a different benefit than A", () => {
    expect(page("en-US", "retailer", "B").valueProps[0].icon).not.toBe(page("en-US", "retailer", "A").valueProps[0].icon);
  });
});

describe("per-market evals", () => {
  it("catches translated guarantee claims", () => {
    expect(claimViolations("Ventes garanties, sans risque", "fr-FR")).toHaveLength(2);
    expect(claimViolations("Garantiert risikofrei verkaufen", "de-DE")).toHaveLength(2);
  });

  it("requires a qualifier on translated free-shipping claims", () => {
    expect(claimViolations("Livraison gratuite sur tout", "fr-FR")).toEqual(["unqualified livraison gratuite"]);
    expect(claimViolations("Livraison gratuite à partir de 300 €", "fr-FR")).toEqual([]);
    expect(claimViolations("Kostenloser Versand ab 300 €", "de-DE")).toEqual([]);
  });

  it("blocks English copy on a French page", () => {
    const spec = page("fr-FR");
    spec.valueProps = page("en-US").valueProps;
    spec.faq = page("en-US").faq;
    spec.hero.subhead = page("en-US").hero.subhead;
    expect(failedIds(spec)).toContain("language");
  });

  it("blocks the wrong currency", () => {
    const spec = page("en-GB");
    spec.hero.subhead = "Orders over $300 ship free on eligible orders.";
    expect(failedIds(spec)).toContain("currency");
  });

  it("blocks American spelling on UK pages", () => {
    const spec = page("en-GB");
    spec.hero.headline = "Find your favorite makers";
    expect(failedIds(spec)).toContain("spelling");
    expect(failedIds({ ...spec, brief: brief("en-US") })).not.toContain("spelling");
  });
});
