import { describe, expect, it } from "vitest";
import { advance, conclude, createExperiment, decision, inExplorationBucket, relevantLearnings, totals, type Learning } from "../src/lib/experiments/model";
import { DECISION, decide, probBeatsControl } from "../src/lib/experiments/stats";
import { assembleSpec } from "../src/lib/landing/build";
import { runEvals } from "../src/lib/landing/evals";
import { BriefSchema, type GenerationResult } from "../src/lib/landing/schema";
import { templateCopy } from "../src/lib/landing/template";

const brief = BriefSchema.parse({ campaignName: "Holiday", audience: "retailer", channel: "paid_social", goal: "Get shops to order for the holidays" });
const result = (variant: "A" | "B"): GenerationResult => {
  const spec = assembleSpec(templateCopy(brief, variant), brief);
  return { spec, evals: runEvals(spec), source: "template_fallback", latencyMs: 0, attempts: 0 };
};

describe("stats", () => {
  it("is ~50% for identical arms and confident for a clear difference", () => {
    expect(probBeatsControl({ visitors: 2000, conversions: 40 }, { visitors: 2000, conversions: 40 })).toBeCloseTo(0.5, 2);
    expect(probBeatsControl({ visitors: 4000, conversions: 80 }, { visitors: 4000, conversions: 130 })).toBeGreaterThan(0.99);
  });

  it("refuses to call a winner before the minimum sample, however lopsided", () => {
    const d = decide({ visitors: 300, conversions: 2 }, { visitors: 300, conversions: 30 }, 1);
    expect(d.status).toBe("collecting");
  });

  it("stops with no winner at the time limit", () => {
    const d = decide({ visitors: 5000, conversions: 100 }, { visitors: 5000, conversions: 101 }, DECISION.maxDays);
    expect(d.status).toBe("no_difference");
  });
});

describe("learning loop", () => {
  it("is reproducible for a given seed", () => {
    const exp = { ...createExperiment(result("A"), result("B")), seed: 42 };
    expect(totals(advance(exp, 5))).toEqual(totals(advance(exp, 5)));
  });

  it("turns a decided test into learnings scoped to the audience", () => {
    let exp = { ...createExperiment(result("A"), result("B")), seed: 7 };
    while (decision(exp).status === "collecting" && exp.days.length < DECISION.maxDays) exp = advance(exp, 1);
    const { experiment, learnings } = conclude(exp);
    expect(experiment.status).toBe("concluded");
    if (experiment.outcome?.winner) {
      expect(learnings.length).toBeGreaterThan(0);
      expect(relevantLearnings(learnings, { audience: "retailer", channel: "paid_social", offer: "Free shipping on qualifying orders" }).length).toBe(Math.min(3, learnings.length));
      expect(relevantLearnings(learnings, { audience: "brand", channel: "paid_social" })).toEqual([]);
    } else {
      expect(learnings).toEqual([]);
    }
  });
});

describe("learning selection guards against convergence", () => {
  const l = (id: string, text: string): Learning => ({ id, experimentId: "e", createdAt: Number(id), audience: "retailer", channel: "paid_social", locale: "en-US", text, lift: 0.2, confidence: 0.98, active: true });
  const all = [l("1", "Leading with payment terms beat leading with product discovery"), l("2", "Naming the offer in the hero lifted conversion"), l("3", "A medium headline beat a short one")];

  it("drops offer learnings when the brief has no offer", () => {
    expect(relevantLearnings(all, { audience: "retailer", channel: "paid_social", offer: "" }).map((x) => x.id)).toEqual(["3"]);
  });

  it("keeps them when the brief has an offer", () => {
    expect(relevantLearnings(all, { audience: "retailer", channel: "paid_social", offer: "Free shipping on qualifying orders" })).toHaveLength(3);
  });

  it("holds out roughly 30% of campaigns, stably", () => {
    const names = Array.from({ length: 2000 }, (_, i) => `Campaign ${i}`);
    const share = names.filter((n) => inExplorationBucket(n)).length / names.length;
    expect(share).toBeGreaterThan(0.25);
    expect(share).toBeLessThan(0.35);
    expect(inExplorationBucket("Holiday Restock 2026")).toBe(inExplorationBucket("Holiday Restock 2026"));
  });
});
