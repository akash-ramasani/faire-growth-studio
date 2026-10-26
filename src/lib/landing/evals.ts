import { DESTINATIONS, TESTIMONIALS } from "./catalog";
import { languageScore, LOCALE_CONFIG, US_SPELLINGS, type Locale } from "./locale";
import { PageCopySchema, type EvalResult, type PageSpec } from "./schema";

// Deterministic guardrails that run on every generated page before a marketer can publish.
// "blocking" failures trigger a repair attempt, then the template fallback; "warning"s are surfaced.

// Phrases that assert facts about a specific business. Allowed on generic Faire pages via other
// checks, but blocked whenever a real brand is featured, since none of it can be verified.
const BRAND_FACTS =
  /\b(founded|established|est\.|since (?:19|20)\d{2}|award[- ]?winning|awards?|certified|made in [A-Z][a-z]+|handmade in|hand[- ]poured in|family[- ]owned|woman[- ]owned|women[- ]owned|black[- ]owned|organic|vegan|cruelty[- ]free|fair[- ]trade|best[- ]?selling|as seen in|featured in|loved by|trusted by|\d[\d,]*\+? (?:stores|retailers|shops|customers|years))\b/i;

const LIMITS: Array<[string, (s: PageSpec) => string[], number]> = [
  ["hero.headline", (s) => [s.hero.headline], 70],
  ["hero.subhead", (s) => [s.hero.subhead], 160],
  ["metaTitle", (s) => [s.metaTitle], 60],
  ["metaDescription", (s) => [s.metaDescription], 155],
  ["valueProps.title", (s) => s.valueProps.map((v) => v.title), 40],
  ["valueProps.body", (s) => s.valueProps.map((v) => v.body), 140],
  ["categories.blurb", (s) => s.categories.map((c) => c.blurb), 90],
  ["closing.headline", (s) => [s.closing.headline], 60],
  ["ctaLabel", (s) => [s.hero.ctaLabel, s.closing.ctaLabel], 28],
];

// Claim checks on a single string, reused by the template so brief text can't smuggle claims in.
// Rules come from the market config: compliance review is per language.
export function claimViolations(text: string, locale: Locale = "en-US"): string[] {
  const { banned, qualified } = LOCALE_CONFIG[locale];
  return [
    ...banned.filter((b) => b.re.test(text)).map((b) => b.why),
    ...qualified.filter((q) => q.claim.test(text) && !q.qualifier.test(text)).map((q) => `unqualified ${q.name}`),
  ];
}

export function allCopy(s: PageSpec): string[] {
  return [
    s.metaTitle,
    s.metaDescription,
    s.hero.eyebrow,
    s.hero.headline,
    s.hero.subhead,
    s.hero.ctaLabel,
    ...s.valueProps.flatMap((v) => [v.title, v.body]),
    ...s.categories.map((c) => c.blurb),
    ...s.faq.flatMap((f) => [f.question, f.answer]),
    s.closing.headline,
    s.closing.ctaLabel,
  ];
}

function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

export function fleschKincaidGrade(text: string): number {
  const sentences = Math.max(1, text.split(/[.!?]+/).filter((x) => x.trim()).length);
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59;
}

export function runEvals(spec: PageSpec): EvalResult[] {
  const results: EvalResult[] = [];
  const add = (id: string, name: string, severity: EvalResult["severity"], passed: boolean, detail: string) =>
    results.push({ id, name, severity, passed, detail });

  const parsed = PageCopySchema.safeParse(spec);
  add(
    "schema",
    "Matches page schema",
    "blocking",
    parsed.success,
    parsed.success ? "All fields present with allowed values" : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
  );
  if (!parsed.success) return results;

  const over = LIMITS.flatMap(([field, get, max]) =>
    get(spec)
      .filter((t) => t.length > max)
      .map((t) => `${field} is ${t.length}/${max} chars`),
  );
  add("length", "Fits layout length limits", "blocking", over.length === 0, over.length ? over.join("; ") : "Every field fits its slot");

  const structural: string[] = [];
  if (spec.valueProps.length !== 3) structural.push(`${spec.valueProps.length} value props (need 3)`);
  if (spec.categories.length < 3 || spec.categories.length > 4) structural.push(`${spec.categories.length} categories (need 3-4)`);
  if (new Set(spec.categories.map((c) => c.name)).size !== spec.categories.length) structural.push("duplicate categories");
  if (spec.faq.length < 3 || spec.faq.length > 4) structural.push(`${spec.faq.length} FAQs (need 3-4)`);
  add("structure", "Section counts match the template", "blocking", structural.length === 0, structural.join("; ") || "3 value props, 3-4 categories, 3-4 FAQs");

  const aud = spec.brief.audience;
  const mismatch: string[] = [];
  if (DESTINATIONS[spec.hero.destination].audience !== aud) mismatch.push(`CTA goes to ${spec.hero.destination} (a ${DESTINATIONS[spec.hero.destination].audience} destination)`);
  if (TESTIMONIALS[spec.testimonialId].audience !== aud) mismatch.push(`testimonial ${spec.testimonialId} is a ${TESTIMONIALS[spec.testimonialId].audience} quote`);
  add("audience", `Destination and proof fit a ${aud} audience`, "blocking", mismatch.length === 0, mismatch.join("; ") || "CTA and testimonial match the audience");

  let utmOk = false;
  try {
    const u = new URL(spec.ctaUrl);
    utmOk = ["utm_source", "utm_medium", "utm_campaign"].every((k) => u.searchParams.get(k));
  } catch {}
  add("tracking", "CTA carries UTM attribution", "blocking", utmOk, utmOk ? spec.ctaUrl : "Missing utm_source / utm_medium / utm_campaign");

  const copy = allCopy(spec);
  const joined = copy.join(" \n ");
  const locale = spec.brief.locale;
  const market = LOCALE_CONFIG[locale];
  const banned = market.banned.filter((b) => b.re.test(joined)).map((b) => `${b.why} ("${joined.match(b.re)?.[0]}")`);
  add("claims", "No prohibited marketing claims", "blocking", banned.length === 0, banned.join("; ") || "No guarantee, superlative or fee claims");

  const unqualified = market.qualified.filter((q) => copy.some((t) => q.claim.test(t) && !q.qualifier.test(t))).map((q) => q.name);
  add(
    "qualifiers",
    "Offer claims carry required qualifiers",
    "blocking",
    unqualified.length === 0,
    unqualified.length ? `Unqualified: ${unqualified.join(", ")}` : "Offer terms are qualified where mentioned",
  );

  const leftovers = copy.filter((t) => /lorem|ipsum|\bTODO\b|\[[^\]]*\]|\{\{|\}\}/i.test(t));
  add("placeholders", "No placeholder text", "blocking", leftovers.length === 0, leftovers.length ? `Found: "${leftovers[0]}"` : "Clean");

  add(
    "alt",
    "Hero image has descriptive alt text",
    "blocking",
    spec.hero.imageAlt.trim().length >= 12,
    spec.hero.imageAlt.trim().length >= 12 ? spec.hero.imageAlt : "Alt text too short",
  );

  const prose = [spec.hero.subhead, ...spec.valueProps.map((v) => v.body), ...spec.faq.map((f) => f.answer)].join(" ");
  const score = languageScore(prose, locale);
  add("language", `Copy is in ${market.language}`, "blocking", score >= 0.6, `${Math.round(score * 100)}% of function words match ${market.language}`);

  const wrongCurrency = copy.filter((t) => market.foreignCurrency.test(t));
  add(
    "currency",
    `Prices use ${market.currency.code}`,
    "blocking",
    wrongCurrency.length === 0,
    wrongCurrency.length ? `Foreign currency in: "${wrongCurrency[0]}"` : `No currency other than ${market.currency.symbol}`,
  );

  if (locale === "en-GB") {
    const us = joined.match(US_SPELLINGS);
    add("spelling", "British spelling", "blocking", !us, us ? `American spelling: "${us[0]}"` : "No American spellings found");
  }

  // Featured real brands: we know only the name and category, so any factual-sounding claim
  // (history, origin, awards, certifications, materials, scale) must have been invented.
  const featured = spec.brief.featuredBrand;
  if (featured) {
    const invented = copy.flatMap((t) => (BRAND_FACTS.test(t) ? [t.match(BRAND_FACTS)?.[0] ?? t] : []));
    add(
      "brandFacts",
      `No invented facts about ${featured.name}`,
      "blocking",
      invented.length === 0,
      invented.length ? `Unverifiable claim: "${invented[0]}"` : "Only the brand's name and category are used",
    );
    const linked = spec.hero.destination === "brand_storefront";
    add("storefront", `Links to ${featured.name}'s Faire storefront`, "blocking", linked, linked ? `faire.com/direct/${featured.slug}` : `CTA goes to ${spec.hero.destination}`);
  } else if (spec.hero.destination === "brand_storefront") {
    add("storefront", "Storefront link has a featured brand", "blocking", false, "brand_storefront needs a featured brand in the brief");
  }

  // Readability and offer-keyword matching are English-only heuristics; other markets skip them.
  const english = locale.startsWith("en");
  if (english) {
    const grade = fleschKincaidGrade([spec.hero.headline, spec.hero.subhead, ...spec.valueProps.map((v) => v.body)].join(". "));
    add("readability", "Reads at grade 9 or below", "warning", grade <= 9, `Flesch-Kincaid grade ${grade.toFixed(1)}`);
  }

  if (english && spec.brief.offer.trim()) {
    const keywords = spec.brief.offer.toLowerCase().match(/[a-z0-9$%]{4,}/g) ?? [];
    const hit = keywords.length === 0 || keywords.some((k) => joined.toLowerCase().includes(k));
    add("offer", "Brief's offer appears in the copy", "warning", hit, hit ? "Offer is referenced" : `None of: ${keywords.join(", ")}`);
  }

  if (spec.brief.focusCategories.length) {
    const names = new Set(spec.categories.map((c) => c.name));
    const missing = spec.brief.focusCategories.filter((c) => !names.has(c));
    add("focus", "Features the brief's focus categories", "warning", missing.length === 0, missing.length ? `Missing ${missing.join(", ")}` : "All featured");
  }

  return results;
}

export const blockingFailures = (evals: EvalResult[]) => evals.filter((e) => e.severity === "blocking" && !e.passed);
