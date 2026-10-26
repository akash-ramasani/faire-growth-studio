import type { EvalResult } from "@/lib/landing/schema";
import { HelpTip } from "./Help";

// Why each check exists, for people seeing the list for the first time.
const WHY: Record<string, string> = {
  schema: "The page must have every section the layout expects, using only approved options. Otherwise it can't render correctly.",
  length: "Each text slot has a maximum length so the design doesn't break, for example a 70-character headline.",
  structure: "The template expects 3 benefits, 3–4 categories and 3–4 FAQs. Too few or too many breaks the layout.",
  audience: "A retailer page must link to retailer sign-up and use a retailer quote (and the same for brands), so nobody lands in the wrong place.",
  tracking: "The button link must carry UTM tags so signups are credited to the right campaign and channel.",
  claims: "Blocks risky marketing claims like 'guaranteed', '#1' or 'risk-free' that legal would reject.",
  qualifiers: "Offers like free shipping or Net 60 must say who qualifies, for example 'on qualifying orders'.",
  placeholders: "Catches leftover template text like [BRAND] or TODO before it reaches customers.",
  alt: "The hero image needs a real description for screen-reader users.",
  language: "Checks the copy is actually written in the market's language.",
  currency: "Only the market's own currency may appear, for example no $ on a UK page.",
  spelling: "UK pages must use British spelling (colour, favourite).",
  readability: "Advisory: simpler copy (grade 9 or below) usually converts better.",
  offer: "Advisory: the offer from the brief should appear somewhere on the page.",
  focus: "Advisory: the categories you picked in the brief should be featured.",
};

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
              <p className="flex flex-wrap items-center text-sm font-medium">
                {e.name}
                <span className="tag ml-2 font-normal capitalize">{e.severity}</span>
                {WHY[e.id] && <HelpTip text={WHY[e.id]} align="start" />}
              </p>
              <p className="mt-0.5 break-words text-xs text-ink-soft">{e.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
