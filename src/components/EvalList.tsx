import type { EvalResult } from "@/lib/landing/schema";

export function EvalSummary({ evals }: { evals: EvalResult[] }) {
  const blocking = evals.filter((e) => e.severity === "blocking" && !e.passed).length;
  const warnings = evals.filter((e) => e.severity === "warning" && !e.passed).length;
  const passed = evals.filter((e) => e.passed).length;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
      <span className="rounded-[2px] bg-pass-bg px-1.5 leading-5 text-pass">{passed} passed</span>
      {blocking > 0 && <span className="rounded-[2px] bg-fail-bg px-1.5 leading-5 text-fail">{blocking} blocking</span>}
      {warnings > 0 && <span className="rounded-[2px] bg-warn-bg px-1.5 leading-5 text-warn">{warnings} warning{warnings > 1 ? "s" : ""}</span>}
    </div>
  );
}

export function EvalList({ evals }: { evals: EvalResult[] }) {
  return (
    <ul className="divide-y divide-line">
      {evals.map((e) => {
        const tone = e.passed ? "pass" : e.severity === "blocking" ? "fail" : "warn";
        return (
          <li key={e.id} className="flex gap-3 py-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                tone === "pass" ? "bg-pass-bg text-pass" : tone === "fail" ? "bg-fail-bg text-fail" : "bg-warn-bg text-warn"
              }`}
              aria-label={tone}
            >
              {e.passed ? "✓" : "!"}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {e.name}
                <span className="tag ml-2 font-normal capitalize">{e.severity}</span>
              </p>
              <p className="mt-0.5 break-words text-xs text-ink-soft">{e.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
