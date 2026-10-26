import type { Brief, GenerationResult, PageSpec } from "../landing/schema";
import { describeDifferences, extractFeatures } from "./features";
import { simulateDay } from "./simulate";
import { decide, probBeatsControl, relativeLift, type Arm, type Decision } from "./stats";

export type Experiment = {
  id: string;
  name: string;
  createdAt: number;
  seed: number;
  arms: Record<"A" | "B", { spec: PageSpec; source: GenerationResult["source"] }>;
  days: Array<{ a: Arm; b: Arm }>;
  status: "running" | "concluded";
  outcome?: { winner: "A" | "B" | null; confidence: number; lift: number; learnings: string[] };
};

export type Learning = {
  id: string;
  experimentId: string;
  createdAt: number;
  audience: Brief["audience"];
  channel: Brief["channel"];
  locale: Brief["locale"];
  text: string;
  lift: number;
  confidence: number;
  active: boolean;
};

type ArmInput = Pick<GenerationResult, "spec" | "source">;

export function createExperiment(a: ArmInput, b: ArmInput): Experiment {
  // Random suffix: experiments are shared in one database, so ids must not collide across visitors.
  const id = `exp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    name: a.spec.brief.campaignName,
    createdAt: Date.now(),
    seed: Math.floor(Math.random() * 1e9),
    arms: { A: { spec: a.spec, source: a.source }, B: { spec: b.spec, source: b.source } },
    days: [],
    status: "running",
  };
}

export function totals(exp: Experiment): { a: Arm; b: Arm } {
  const sum = (k: "a" | "b") =>
    exp.days.reduce((acc, d) => ({ visitors: acc.visitors + d[k].visitors, conversions: acc.conversions + d[k].conversions }), { visitors: 0, conversions: 0 });
  return { a: sum("a"), b: sum("b") };
}

/** Running P(B beats A) after each day, for the trend chart. */
export function confidenceSeries(exp: Experiment): number[] {
  const a = { visitors: 0, conversions: 0 };
  const b = { visitors: 0, conversions: 0 };
  return exp.days.map((d) => {
    a.visitors += d.a.visitors;
    a.conversions += d.a.conversions;
    b.visitors += d.b.visitors;
    b.conversions += d.b.conversions;
    return probBeatsControl(a, b);
  });
}

export const decision = (exp: Experiment): Decision => {
  const t = totals(exp);
  return decide(t.a, t.b, exp.days.length);
};

export function advance(exp: Experiment, days: number): Experiment {
  if (exp.status !== "running") return exp;
  const next = [...exp.days];
  for (let i = 0; i < days; i++) next.push(simulateDay(exp.arms.A.spec, exp.arms.B.spec, next.length, exp.seed));
  return { ...exp, days: next };
}

/** Close the test and turn the result into reusable learnings. */
export function conclude(exp: Experiment): { experiment: Experiment; learnings: Learning[] } {
  const d = decision(exp);
  const t = totals(exp);
  if (d.status !== "winner") {
    return {
      experiment: { ...exp, status: "concluded", outcome: { winner: null, confidence: Math.max(probBeatsControl(t.a, t.b), 1 - probBeatsControl(t.a, t.b)), lift: 0, learnings: [] } },
      learnings: [],
    };
  }
  const [win, lose] = d.winner === "B" ? [exp.arms.B.spec, exp.arms.A.spec] : [exp.arms.A.spec, exp.arms.B.spec];
  const lift = d.winner === "B" ? relativeLift(t.a, t.b) : relativeLift(t.b, t.a);
  const texts = describeDifferences(extractFeatures(win), extractFeatures(lose));
  const brief = exp.arms.A.spec.brief;
  const learnings = texts.map((text, i) => ({
    id: `${exp.id}_${i}`,
    experimentId: exp.id,
    createdAt: Date.now(),
    audience: brief.audience,
    channel: brief.channel,
    locale: brief.locale,
    text,
    lift,
    confidence: d.confidence,
    active: true,
  }));
  return {
    experiment: { ...exp, status: "concluded", outcome: { winner: d.winner, confidence: d.confidence, lift, learnings: texts } },
    learnings,
  };
}

// A learning about offers only applies when the brief actually has an offer; otherwise
// applying it means inventing one.
const OFFER_LEARNING = /\boffer\b|payment terms|net ?60|free (shipping|returns)/i;

/** Learnings to feed into the next generation: same audience, same channel first, newest first. */
export function relevantLearnings(all: Learning[], brief: Pick<Brief, "audience" | "channel"> & Partial<Pick<Brief, "offer">>, limit = 3): Learning[] {
  const hasOffer = Boolean(brief.offer?.trim());
  return all
    .filter((l) => l.active && l.audience === brief.audience)
    .filter((l) => hasOffer || !OFFER_LEARNING.test(l.text))
    .sort((x, y) => Number(y.channel === brief.channel) - Number(x.channel === brief.channel) || y.createdAt - x.createdAt)
    .slice(0, limit);
}

/**
 * Exploration holdout: a stable ~30% of campaigns skip learnings entirely, so pages don't all
 * converge on past winners and we keep measuring whether the learnings still help.
 */
export function inExplorationBucket(campaignName: string, rate = 0.3): boolean {
  let h = 2166136261;
  for (let i = 0; i < campaignName.length; i++) h = Math.imul(h ^ campaignName.charCodeAt(i), 16777619);
  return (h >>> 0) % 1000 < rate * 1000;
}

export const learningPrompt = (l: Learning) =>
  `${l.text} (${l.lift >= 0 ? "+" : ""}${Math.round(l.lift * 100)}% conversion on ${l.channel.replace("_", " ")}, ${Math.round(l.confidence * 100)}% confidence)`;
