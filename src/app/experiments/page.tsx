"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "@/components/Toast";
import { useCountUp } from "@/lib/useCountUp";
import { extractFeatures } from "@/lib/experiments/features";
import { confidenceSeries, decision, totals, type Experiment } from "@/lib/experiments/model";
import { DECISION, posterior, probBeatsControl, relativeLift } from "@/lib/experiments/stats";
import { LOCALE_CONFIG } from "@/lib/landing/locale";
import type { Brief, GenerationResult } from "@/lib/landing/schema";
import { clearLearnings, concludeExperiment, createExperiment, setLearningActive, simulateExperiment, useExperiments, useLearnings } from "@/lib/store";

const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;

const DEMO_BRIEF: Brief = {
  campaignName: "Holiday Restock Test",
  audience: "retailer",
  channel: "paid_social",
  goal: "Get gift shops and boutiques to place their first holiday order before the November rush.",
  keyMessage: "Unique, small-batch gifts your customers can't find at big-box stores.",
  offer: "",
  tone: "warm",
  focusCategories: ["Gifts & Novelty"],
  locale: "en-US",
};

function Trend({ series }: { series: number[] }) {
  const w = 320;
  const h = 90;
  if (series.length < 2) return <div className="flex h-[90px] items-center justify-center text-xs text-muted">Trend appears after 2 days</div>;
  const x = (i: number) => (i / (series.length - 1)) * w;
  const y = (p: number) => h - p * h;
  const d = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[90px] w-full" role="img" aria-label="Probability B beats A over time">
      <rect x="0" y={y(1)} width={w} height={y(DECISION.confidence)} fill="var(--pass-bg)" />
      <rect x="0" y={y(1 - DECISION.confidence)} width={w} height={h - y(1 - DECISION.confidence)} fill="var(--fail-bg)" />
      <line x1="0" x2={w} y1={y(0.5)} y2={y(0.5)} stroke="var(--line)" strokeDasharray="4 4" />
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ExperimentDetail({ exp }: { exp: Experiment }) {
  const t = totals(exp);
  const d = decision(exp);
  const p = probBeatsControl(t.a, t.b);
  const lift = relativeLift(t.a, t.b);
  const brief = exp.arms.A.spec.brief;
  const [busy, setBusy] = useState(false);
  const running = exp.status === "running" && !busy;

  // Simulation and conclusion run on the server so every viewer sees the same experiment state.
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }
  const run = (days: number) =>
    act(async () => {
      const r = await simulateExperiment(exp.id, days);
      if (r.ok) toast(`Simulated ${days} day${days === 1 ? "" : "s"} of traffic`);
      else toast(r.error ?? "Simulation failed", { tone: "error" });
    });
  const finish = () =>
    act(async () => {
      const r = (await concludeExperiment(exp.id)) as { ok: boolean; learnings?: number; error?: string };
      if (!r.ok) toast(r.error ?? "Could not conclude", { tone: "error" });
      else if (r.learnings) toast(`Test concluded. ${r.learnings} learning${r.learnings === 1 ? "" : "s"} saved for the next ${brief.audience} page`, { tone: "success" });
      else toast("Test concluded with no clear winner. Control stays.");
    });
  const animatedP = useCountUp(exp.days.length ? p * 100 : 0);

  return (
    <div key={exp.id} className="animate-fade-in space-y-6">
      <div className="card p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs text-muted">
              {brief.audience} · {brief.channel.replace("_", " ")} · {LOCALE_CONFIG[brief.locale].label} · day {exp.days.length}
            </p>
            <h2 className="mt-1 font-serif text-2xl">{exp.name}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline btn-sm" disabled={!running} onClick={() => run(1)}>
              Simulate 1 day
            </button>
            <button className="btn-outline btn-sm" disabled={!running} onClick={() => run(7)}>
              Simulate 7 days
            </button>
            <button className="btn btn-sm" disabled={!running || d.status === "collecting"} onClick={finish} title={d.status === "collecting" ? d.reason : "Close the test and save learnings"}>
              Conclude
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {(["A", "B"] as const).map((k) => {
            const arm = k === "A" ? t.a : t.b;
            const post = posterior(arm);
            const f = extractFeatures(exp.arms[k].spec);
            const won = exp.outcome?.winner === k;
            return (
              <div key={k} className={`border p-4 ${won ? "border-pass bg-pass-bg/40" : "border-line"}`}>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="font-medium tracking-wide text-ink uppercase">
                    {k === "A" ? "A · control" : "B · challenger"} {won && "· winner"}
                  </span>
                  <span>leads with {f.leadBenefit}</span>
                </div>
                <p className="mt-2 font-serif text-lg leading-snug">{exp.arms[k].spec.hero.headline}</p>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Visitors</dt>
                    <dd className="tabular-nums">{arm.visitors.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Signups</dt>
                    <dd className="tabular-nums">{arm.conversions.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Rate (95% CI)</dt>
                    <dd className="tabular-nums">
                      {arm.visitors ? (
                        <>
                          {pct(post.mean, 2)} <span className="text-xs text-muted">± {pct((post.high - post.low) / 2, 2)}</span>
                        </>
                      ) : (
                        "–"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-5 border-t border-line pt-5 md:grid-cols-[220px_1fr]">
          <div>
            <p className="text-xs text-muted">P(B beats A)</p>
            <p className="font-serif text-4xl tabular-nums">{exp.days.length ? `${Math.round(animatedP)}%` : "–"}</p>
            <p className="mt-1 text-xs text-ink-soft">{exp.days.length ? `Lift ${lift >= 0 ? "+" : ""}${pct(lift)}` : "No traffic yet"}</p>
          </div>
          <div>
            <Trend series={confidenceSeries(exp)} />
            <p className="mt-2 text-xs text-ink-soft">
              {running
                ? d.status === "collecting"
                  ? d.reason
                  : d.status === "winner"
                    ? `Variant ${d.winner} wins with ${pct(d.confidence, 0)} confidence. Conclude to save what it learned.`
                    : d.reason
                : exp.outcome?.winner
                  ? `Concluded: variant ${exp.outcome.winner} won (${pct(exp.outcome.confidence, 0)} confidence).`
                  : "Concluded with no clear winner. Control stays, nothing is learned."}
            </p>
          </div>
        </div>

        {exp.outcome && exp.outcome.learnings.length > 0 && (
          <div className="animate-scale-in mt-5 bg-sage/60 p-4 text-sm">
            <p className="font-medium">Learned from this test</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
              {exp.outcome.learnings.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-soft">
              The next {brief.audience} page generated in the{" "}
              <Link href="/pages" className="link">
                studio
              </Link>{" "}
              includes these in Claude&apos;s prompt.
            </p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted">
        Traffic is simulated: each arm has a hidden true conversion rate from its page features plus unexplained noise. In production, visitors and signups
        per arm come from the warehouse, joined on <code>utm_content</code>. The stopping rule stays the same: at least {DECISION.minVisitorsPerArm.toLocaleString()}{" "}
        visitors per arm and {pct(DECISION.confidence, 0)} posterior confidence, or stop at {DECISION.maxDays} days.
      </p>
    </div>
  );
}

function ExperimentsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: experiments, loaded } = useExperiments();
  const { data: learnings } = useLearnings();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = experiments.find((e) => e.id === params.get("id")) ?? experiments[0];

  async function demo() {
    setCreating(true);
    setError(null);
    try {
      const call = async (variantHint?: string) =>
        (await (
          await fetch("/api/pages/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ brief: DEMO_BRIEF, variantHint }) })
        ).json()) as GenerationResult;
      const a = await call();
      const b = await call("Lead with a different benefit than variant A.");
      const created = await createExperiment({ spec: a.spec, source: a.source }, { spec: b.spec, source: b.source });
      if (!created.ok || !created.id) throw new Error(created.error ?? "Could not create the test");
      router.push(`/experiments?id=${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-8">
      <p className="text-sm text-ink-soft">Experiments</p>
      <h1 className="mt-1 font-serif text-[30px] leading-[38px] md:text-[38px] md:leading-[50px]">A learning loop for generated pages</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Run A and B, call a winner only with enough evidence, then turn the difference into a learning. Claude gets those learnings the next time it writes for
        the same audience, so each test makes the next page better.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="min-w-0 space-y-6">
          <div className="card p-4">
            <p className="section-title">Tests</p>
            {experiments.length === 0 && <p className="text-sm text-ink-soft">{loaded ? "No tests yet." : "Loading…"}</p>}
            {error && <p className="error-text">{error}</p>}
            <ul className="space-y-1">
              {experiments.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => router.push(`/experiments?id=${e.id}`)}
                    className={`w-full rounded-[4px] px-3 py-2 text-left text-sm ${selected?.id === e.id ? "bg-cream" : "hover:bg-cream/60"}`}
                  >
                    <span className="block truncate font-medium">{e.name}</span>
                    <span className="text-xs text-muted">
                      {e.status === "running" ? `Running · day ${e.days.length}` : e.outcome?.winner ? `Winner: ${e.outcome.winner}` : "No winner"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button className="btn-outline btn-sm mt-3 w-full" onClick={demo} disabled={creating}>
              {creating ? "Creating…" : "+ Quick demo test"}
            </button>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <p className="section-title mb-0">Learning memory</p>
              {learnings.length > 0 && (
                <button className="link text-xs text-ink-soft" onClick={() => clearLearnings().then(() => toast("Learning memory cleared"))}>
                  Clear
                </button>
              )}
            </div>
            {learnings.length === 0 && <p className="mt-2 text-sm text-muted">Conclude a test with a winner to record what worked.</p>}
            <ul className="mt-2 space-y-3">
              {learnings.map((l) => (
                <li key={l.id} className="text-sm">
                  <label className="flex cursor-pointer gap-3">
                    <input type="checkbox" className="check mt-px" checked={l.active} onChange={(e) => {
                        const active = e.target.checked;
                        setLearningActive(l.id, active).then(() => toast(active ? "Learning switched on" : "Learning switched off. It won't be used in prompts."));
                      }} />
                    <span className={l.active ? "" : "text-muted line-through"}>
                      {l.text}
                      <span className="block text-xs text-muted">
                        {l.audience} · {l.channel.replace("_", " ")} · {l.lift >= 0 ? "+" : ""}
                        {pct(l.lift, 0)} · {pct(l.confidence, 0)} conf.
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="min-w-0">
          {selected ? (
            <ExperimentDetail exp={selected} />
          ) : (
            <div className="card flex min-h-[420px] flex-col items-center justify-center bg-cream p-10 text-center">
              <p className="font-serif text-2xl">No experiments yet</p>
              <p className="mt-2 max-w-sm text-sm text-ink-soft">
                Generate variants A and B in the{" "}
                <Link href="/pages" className="link">
                  studio
                </Link>{" "}
                and start a test, or spin up a quick demo test.
              </p>
              <button className="btn mt-5" onClick={demo} disabled={creating}>
                {creating ? "Creating…" : "Run a demo test"}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ExperimentsPage() {
  return (
    <Suspense>
      <ExperimentsInner />
    </Suspense>
  );
}
