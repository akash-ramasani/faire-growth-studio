"use client";

import { clearRuns, useRuns, type RunRecord } from "@/lib/store";

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "–");

function quantile(xs: number[], q: number) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

const SOURCE_LABEL: Record<RunRecord["source"], string> = {
  claude: "Claude",
  claude_repaired: "Repaired",
  template_fallback: "Fallback",
  audience_ok: "Rule built",
  audience_failed: "Rule rejected",
};

export default function Monitoring() {
  const runs = useRuns();

  const pages = runs.filter((r) => r.kind === "page");
  const audiences = runs.filter((r) => r.kind === "audience");
  const firstPass = pages.filter((r) => r.source === "claude").length;
  const repaired = pages.filter((r) => r.source === "claude_repaired").length;
  const fallback = pages.filter((r) => r.source === "template_fallback").length;
  const latencies = pages.map((r) => r.latencyMs);
  const tokens = pages.reduce((s, r) => s + (r.inputTokens ?? 0) + (r.outputTokens ?? 0), 0);

  const checkStats = new Map<string, { name: string; pass: number; total: number }>();
  pages.forEach((r) =>
    r.evals.forEach((e) => {
      const s = checkStats.get(e.id) ?? { name: e.name, pass: 0, total: 0 };
      s.total++;
      if (e.passed) s.pass++;
      checkStats.set(e.id, s);
    }),
  );

  const tiles = [
    { label: "Pages generated", value: String(pages.length) },
    { label: "First-pass eval rate", value: pct(firstPass, pages.length), hint: "Claude output passed every blocking check" },
    { label: "Repair rate", value: pct(repaired, pages.length), hint: "Needed one repair round" },
    { label: "Fallback rate", value: pct(fallback, pages.length), hint: "Served the approved template" },
    { label: "p50 / p95 latency", value: pages.length ? `${(quantile(latencies, 0.5) / 1000).toFixed(1)}s / ${(quantile(latencies, 0.95) / 1000).toFixed(1)}s` : "–" },
    { label: "Tokens used", value: tokens.toLocaleString() },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-ink-soft">Monitoring</p>
          <h1 className="mt-1 font-serif text-[30px] leading-[38px] md:text-[38px] md:leading-[50px]">Is the agent trustworthy today?</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Every generation is logged with its path, eval results and cost. A rising fallback or repair rate is the alert signal. In production these events
            go to the warehouse and page on-call.
          </p>
        </div>
        {runs.length > 0 && (
          <button
            className="btn-outline btn-sm"
            onClick={() => {
              clearRuns();
            }}
          >
            Clear log
          </button>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4" title={t.hint}>
            <p className="text-xs text-muted">{t.label}</p>
            <p className="mt-1 font-serif text-2xl">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="card p-5">
          <p className="section-title">Eval pass rate by check</p>
          {checkStats.size === 0 && <p className="mt-2 text-sm text-muted">Generate a page to see results.</p>}
          <div className="mt-3 space-y-3">
            {[...checkStats.entries()].map(([id, s]) => (
              <div key={id}>
                <div className="flex justify-between text-xs">
                  <span>{s.name}</span>
                  <span className="tabular-nums text-ink-soft">{pct(s.pass, s.total)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-cream">
                  <div className={`h-1.5 rounded-full ${s.pass === s.total ? "bg-pass" : "bg-warn"}`} style={{ width: `${(s.pass / s.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-line pt-4 text-xs text-ink-soft">
            <p className="font-medium text-ink">Offline regression suite</p>
            <p className="mt-1">
              Run <code className="rounded bg-cream px-1">npm run eval</code> to push the fixed brief set through the full pipeline and fail CI if the
              first-pass rate drops below the threshold.
            </p>
          </div>
        </div>

        <div className="card overflow-hidden">
          <p className="section-title mb-0 border-b border-line px-5 py-3">Recent runs ({audiences.length} audience, {pages.length} page)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  {["When", "Kind", "Campaign / prompt", "Path", "Evals", "Latency", "Note"].map((h) => (
                    <th key={h} className="px-4 py-2 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {runs.slice(0, 40).map((r, i) => {
                  const failed = r.evals.filter((e) => !e.passed).length;
                  const bad = r.source === "template_fallback" || r.source === "audience_failed";
                  return (
                    <tr key={i}>
                      <td className="px-4 py-2 whitespace-nowrap text-ink-soft">{new Date(r.at).toLocaleTimeString()}</td>
                      <td className="px-4 py-2">{r.kind}</td>
                      <td className="max-w-[220px] truncate px-4 py-2">{r.campaign}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-[2px] px-1.5 text-xs leading-5 whitespace-nowrap ${bad ? "bg-warn-bg text-warn" : "bg-pass-bg text-pass"}`}>
                          {SOURCE_LABEL[r.source]}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">{r.evals.length ? `${r.evals.length - failed}/${r.evals.length}` : "–"}</td>
                      <td className="px-4 py-2 tabular-nums">{(r.latencyMs / 1000).toFixed(1)}s</td>
                      <td className="max-w-[260px] truncate px-4 py-2 text-xs text-ink-soft" title={r.fallbackReason}>
                        {r.fallbackReason ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {runs.length === 0 && <p className="px-5 py-8 text-sm text-muted">No runs yet in this browser.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
