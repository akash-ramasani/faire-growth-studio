// Bayesian A/B readout with Beta(1,1) priors. Normal approximation of the Beta posteriors,
// which is accurate at the sample sizes we require before calling a test.

export type Arm = { visitors: number; conversions: number };

function erf(x: number): number {
  // Abramowitz and Stegun 7.1.26
  const sign = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return sign * y;
}
const normalCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

export function posterior({ visitors, conversions }: Arm) {
  const a = 1 + conversions;
  const b = 1 + visitors - conversions;
  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
  const sd = Math.sqrt(variance);
  return { mean, variance, low: Math.max(0, mean - 1.96 * sd), high: mean + 1.96 * sd };
}

/** P(treatment's true rate > control's true rate). */
export function probBeatsControl(control: Arm, treatment: Arm): number {
  const c = posterior(control);
  const t = posterior(treatment);
  return normalCdf((t.mean - c.mean) / Math.sqrt(c.variance + t.variance));
}

export const relativeLift = (control: Arm, treatment: Arm) => {
  const c = posterior(control).mean;
  return c > 0 ? (posterior(treatment).mean - c) / c : 0;
};

export const DECISION = { minVisitorsPerArm: 1500, confidence: 0.95, maxDays: 21 } as const;

export type Decision =
  | { status: "collecting"; reason: string }
  | { status: "winner"; winner: "A" | "B"; confidence: number }
  | { status: "no_difference"; reason: string };

// Guard against peeking: no call until both arms reach the minimum sample, however good it looks early.
export function decide(a: Arm, b: Arm, days: number): Decision {
  const p = probBeatsControl(a, b);
  if (Math.min(a.visitors, b.visitors) < DECISION.minVisitorsPerArm) {
    return { status: "collecting", reason: `Waiting for ${DECISION.minVisitorsPerArm.toLocaleString()} visitors per arm before calling it` };
  }
  if (p >= DECISION.confidence) return { status: "winner", winner: "B", confidence: p };
  if (p <= 1 - DECISION.confidence) return { status: "winner", winner: "A", confidence: 1 - p };
  if (days >= DECISION.maxDays) return { status: "no_difference", reason: `No ${Math.round(DECISION.confidence * 100)}% winner after ${days} days. Keep control.` };
  return { status: "collecting", reason: `${Math.round(Math.max(p, 1 - p) * 100)}% confident so far, need ${Math.round(DECISION.confidence * 100)}%` };
}
