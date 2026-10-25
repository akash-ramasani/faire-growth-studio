import { DESTINATIONS, type Channel } from "./catalog";
import { LOCALE_CONFIG } from "./locale";
import type { Brief, PageCopy, PageSpec } from "./schema";

const UTM: Record<Channel, { source: string; medium: string }> = {
  paid_social: { source: "meta", medium: "paid_social" },
  paid_search: { source: "google", medium: "cpc" },
  lifecycle_email: { source: "braze", medium: "email" },
  blog: { source: "faire_blog", medium: "content" },
  newsroom: { source: "newsroom", medium: "pr" },
};

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// Tracking and URLs are assembled in code so attribution never depends on model output.
export function buildCtaUrl(brief: Brief, destination: PageCopy["hero"]["destination"]): string {
  const url = new URL(LOCALE_CONFIG[brief.locale].pathPrefix + DESTINATIONS[destination].path, "https://www.faire.com");
  const utm = UTM[brief.channel];
  url.searchParams.set("utm_source", utm.source);
  url.searchParams.set("utm_medium", utm.medium);
  url.searchParams.set("utm_campaign", slugify(brief.campaignName));
  url.searchParams.set("utm_content", "lp_hero");
  return url.toString();
}

export function assembleSpec(copy: PageCopy, brief: Brief): PageSpec {
  const suffix = brief.locale === "en-US" ? "" : `-${brief.locale.toLowerCase()}`;
  return { ...copy, brief, slug: slugify(brief.campaignName) + suffix, ctaUrl: buildCtaUrl(brief, copy.hero.destination) };
}
