import type { Channel } from "../landing/catalog";
import type { PageSpec } from "../landing/schema";
import { extractFeatures } from "./features";
import type { Arm } from "./stats";

// Stand-in for real traffic. In production, visitors and conversions per arm come from the
// warehouse (page views joined to signups by utm_content). Here a hidden "true" conversion rate
// is derived from page features plus noise the features can't explain, so the loop has
// something real to discover and sometimes finds no difference at all.

const BASE_RATE: Record<Channel, number> = {
  paid_social: 0.022,
  paid_search: 0.041,
  lifecycle_email: 0.052,
  blog: 0.014,
  newsroom: 0.011,
};
// Visitors per arm per day.
const DAILY_VISITORS: Record<Channel, number> = {
  paid_social: 1400,
  paid_search: 900,
  lifecycle_email: 1100,
  blog: 500,
  newsroom: 300,
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function trueRate(spec: PageSpec): number {
  const f = extractFeatures(spec);
  const retailer = spec.brief.audience === "retailer";
  let m = 1;
  if (retailer && (f.leadBenefit === "terms" || f.leadBenefit === "returns")) m *= 1.16;
  if (!retailer && (f.leadBenefit === "community" || f.leadBenefit === "insights")) m *= 1.12;
  if (f.headlineLength === "medium") m *= 1.08;
  if (f.headlineLength === "long") m *= 0.88;
  if (f.headlineHasNumber) m *= 1.06;
  if (f.headlineIsQuestion) m *= 0.95;
  if (f.mentionsOffer) m *= 1.1;
  if (f.plainLanguage) m *= 1.05;
  if (f.palette === "ink") m *= 0.96;
  // Unexplained variation: copy quality the features don't capture.
  const noise = 0.92 + (hash(spec.hero.headline + spec.hero.subhead) % 1000) / 1000 * 0.16;
  return BASE_RATE[spec.brief.channel] * m * noise;
}

export function simulateDay(specA: PageSpec, specB: PageSpec, day: number, seed: number): { a: Arm; b: Arm } {
  const rand = mulberry32(seed + day * 7919);
  const total = Math.round(DAILY_VISITORS[specA.brief.channel] * 2 * (0.8 + rand() * 0.4));
  const run = (spec: PageSpec, visitors: number): Arm => {
    const p = trueRate(spec);
    let conversions = 0;
    for (let i = 0; i < visitors; i++) if (rand() < p) conversions++;
    return { visitors, conversions };
  };
  const toA = Math.round(total / 2);
  return { a: run(specA, toA), b: run(specB, total - toA) };
}
