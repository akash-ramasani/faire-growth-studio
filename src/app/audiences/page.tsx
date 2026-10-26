"use client";

import { useEffect, useState } from "react";
import { Flag, isFlagCode } from "@/components/Flag";
import { PlatformLogo } from "@/components/PlatformLogo";
import { toast } from "@/components/Toast";
import { useCountUp } from "@/lib/useCountUp";
import { ATTRIBUTES, ATTRIBUTE_KEYS, OPERATOR_LABELS, operatorsFor, type AttributeKey, type DraftRule } from "@/lib/audiences/contract";
import type { AudienceSummary } from "@/lib/audiences/evaluate";
import type { SyncDestination, SyncPlan } from "@/lib/audiences/sync";

type Preview = { ok: true; description: string; sql: string; summary: AudienceSummary } | { ok: false; errors: string[] };

const PRESETS: Array<{ name: string; prompt: string; draft: DraftRule }> = [
  {
    name: "Lapsed US gift shops",
    prompt: "US gift shops and boutiques that haven't ordered in over 120 days but opened an email recently",
    draft: {
      combinator: "and",
      conditions: [
        { attribute: "country", operator: "eq", value: "US" },
        { attribute: "retailer_type", operator: "in", value: "gift_shop,boutique" },
        { attribute: "days_since_last_order", operator: "gt", value: "120" },
        { attribute: "email_engaged_30d", operator: "is_true", value: "" },
      ],
    },
  },
  {
    name: "High-value non-Insiders",
    prompt: "Retailers who spent more than $5,000 in the last year and are not Insiders yet",
    draft: {
      combinator: "and",
      conditions: [
        { attribute: "gmv_last_365d", operator: "gt", value: "5000" },
        { attribute: "is_insider", operator: "is_false", value: "" },
      ],
    },
  },
  {
    name: "Signed up, never ordered",
    prompt: "New retailers from the last 60 days who have never placed an order",
    draft: {
      combinator: "and",
      conditions: [
        { attribute: "signup_days_ago", operator: "lte", value: "60" },
        { attribute: "days_since_last_order", operator: "is_empty", value: "" },
      ],
    },
  },
];

const DESTS: Array<{ id: SyncDestination; label: string; consent: string }> = [
  { id: "braze", label: "Braze", consent: "email opt-in" },
  { id: "meta", label: "Meta", consent: "ads consent" },
  { id: "google", label: "Google Ads", consent: "ads consent" },
];

const fmt = (n: number) => n.toLocaleString("en-US");
// Display label for an enum value; the stored value keeps the contract spelling.
const human = (v: string) => (/^[A-Z]{2}$/.test(v) ? v : v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " "));
const COUNTRY_NAMES: Record<string, string> = { US: "United States", CA: "Canada", GB: "United Kingdom", DE: "Germany", FR: "France", AU: "Australia" };
const fmtCount = (n: number) => Math.round(n).toLocaleString("en-US");

// Value chips; countries get their flag. Single-select operators behave as a radio group.
function ChipGroup({ values, selected, multi, onChange }: { values: readonly string[]; selected: string[]; multi: boolean; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role={multi ? "group" : "radiogroup"}>
      {values.map((v) => {
        const on = selected.includes(v);
        return (
          <button
            key={v}
            type="button"
            role={multi ? undefined : "radio"}
            aria-checked={multi ? undefined : on}
            aria-pressed={multi ? on : undefined}
            title={COUNTRY_NAMES[v]}
            onClick={() => onChange(multi ? (on ? selected.filter((s) => s !== v) : [...selected, v]) : [v])}
            className={`pill pill-sm gap-1.5 ${on ? "pill-active" : ""}`}
          >
            {isFlagCode(v) && <Flag code={v} />}
            {human(v)}
          </button>
        );
      })}
    </div>
  );
}

function ValueInput({ attribute, operator, value, onChange }: { attribute: AttributeKey; operator: string; value: string; onChange: (v: string) => void }) {
  const def = ATTRIBUTES[attribute];
  if (operator === "is_true" || operator === "is_false" || operator === "is_empty") return <div className="field flex items-center bg-grey text-ink-soft">No value needed</div>;
  if (def.type === "enum") {
    const multi = operator === "in" || operator === "not_in";
    // Short lists (countries, retailer types) read better as chips than as a dropdown.
    if (multi || def.values.length <= 7) {
      return <ChipGroup values={def.values} selected={value.split(",").filter(Boolean)} multi={multi} onChange={(v) => onChange(v.join(","))} />;
    }
    return (
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {def.values.map((v) => (
          <option key={v} value={v}>
            {human(v)}
          </option>
        ))}
      </select>
    );
  }
  return <input className="field" inputMode="numeric" placeholder={"unit" in def ? def.unit : "number"} value={value} onChange={(e) => onChange(e.target.value)} />;
}

export default function Audiences() {
  const [prompt, setPrompt] = useState(PRESETS[0].prompt);
  const [draft, setDraft] = useState<DraftRule>(PRESETS[0].draft);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [translating, setTranslating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [translation, setTranslation] = useState<{ ok: boolean; text: string; unsupported?: string[]; errors?: string[] } | null>(null);
  const [name, setName] = useState(PRESETS[0].name);
  const [dest, setDest] = useState<SyncDestination>("braze");
  const [plan, setPlan] = useState<SyncPlan | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch("/api/audiences/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draft }) });
      setPreview(await res.json());
      setPlan(null);
    }, 250);
    return () => clearTimeout(t);
  }, [draft]);

  async function translate() {
    setTranslating(true);
    setTranslation(null);
    try {
      const res = await fetch("/api/audiences/translate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt }) });
      const data = await res.json();
      if (data.ok) {
        setDraft(data.draft);
        setTranslation({ ok: true, text: data.explanation, unsupported: data.unsupported });
        toast(data.unsupported?.length ? `Rule built. ${data.unsupported.length} part left out (not in the data contract).` : "Rule built and validated", { tone: "success" });
      } else {
        setTranslation({ ok: false, text: data.error, errors: data.contractErrors });
        toast(data.error ?? "Could not build a rule", { tone: "error" });
      }
    } catch {
      toast("Network error. Try again.", { tone: "error" });
    } finally {
      setTranslating(false);
    }
  }

  const updateCond = (i: number, patch: Partial<DraftRule["conditions"][number]>) =>
    setDraft((d) => ({ ...d, conditions: d.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  async function sync() {
    setSyncErrors([]);
    setSyncing(true);
    try {
      const res = await fetch("/api/audiences/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, destination: dest, draft }) });
      const data = await res.json();
      if (data.ok) {
        setPlan(data.plan);
        toast(`${data.plan.label} payload ready: ${fmtCount(data.plan.eligible)} records, ${fmtCount(data.plan.excludedForConsent)} excluded for consent`, { tone: "success" });
      } else {
        setPlan(null);
        setSyncErrors(data.errors);
      }
    } finally {
      setSyncing(false);
    }
  }

  const summary = preview?.ok ? preview.summary : null;
  const animatedSize = useCountUp(summary?.size ?? 0);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-8">
      <p className="text-sm text-ink-soft">Self-serve audiences</p>
      <h1 className="mt-1 font-serif text-[30px] leading-[38px] md:text-[38px] md:leading-[50px]">Describe who you want to reach</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Claude turns plain English into a rule, but the data contract decides if it is valid. Consent is applied in code at sync time, for every destination.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-6">
          <div className="card p-5">
            <label className="label" htmlFor="nl">Ask in plain English</label>
            <div className="search-pill">
              <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-ink" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.3">
                <circle cx="7" cy="7" r="5" />
                <path d="m14 14-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                id="nl"
                placeholder="e.g. US boutiques that haven't ordered in 90 days"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && translate()}
              />
              <button className="btn h-10 shrink-0 rounded-[20px]" onClick={translate} disabled={translating || prompt.length < 5}>
                {translating && <span className="spinner" aria-hidden />}
                {translating ? "Building…" : "Build rule"}
              </button>
            </div>
            <p className="help-text mt-2">Claude proposes a rule; the data contract decides whether it is valid.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setPrompt(p.prompt);
                    setDraft(p.draft);
                    setName(p.name);
                    setTranslation(null);
                  }}
                  className="pill pill-sm"
                >
                  {p.name}
                </button>
              ))}
            </div>
            {translation && (
              <div className={`animate-fade-up mt-4 rounded-[4px] p-3 text-sm ${translation.ok ? "bg-pass-bg text-pass" : "bg-warn-bg text-warn"}`}>
                <p>{translation.text}</p>
                {translation.unsupported && translation.unsupported.length > 0 && (
                  <p className="mt-1 text-xs">Not in the data contract, so left out: {translation.unsupported.join("; ")}</p>
                )}
                {translation.errors?.map((e) => (
                  <p key={e} className="mt-1 text-xs">
                    {e}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="section-title mb-0">Rule</p>
              <div className="segmented" role="radiogroup" aria-label="Combine conditions">
                {(["and", "or"] as const).map((c) => (
                  <button
                    key={c}
                    role="radio"
                    aria-checked={draft.combinator === c}
                    onClick={() => setDraft((d) => ({ ...d, combinator: c }))}
                    className={`segment ${draft.combinator === c ? "segment-active" : ""}`}
                  >
                    Match {c === "and" ? "all" : "any"}
                  </button>
                ))}
              </div>
            </div>
            <div className="stagger space-y-3">
              {draft.conditions.map((c, i) => (
                <div key={i} style={{ "--i": i } as React.CSSProperties} className="grid gap-2 rounded-[4px] bg-cream p-3 md:grid-cols-[minmax(220px,1.1fr)_minmax(140px,0.7fr)_minmax(0,2fr)_auto] md:items-start">
                  <select
                    className="field"
                    aria-label="Attribute"
                    value={c.attribute}
                    onChange={(e) => {
                      const attribute = e.target.value as AttributeKey;
                      updateCond(i, { attribute, operator: operatorsFor(attribute)[0], value: "" });
                    }}
                  >
                    {ATTRIBUTE_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {ATTRIBUTES[k].label}
                      </option>
                    ))}
                  </select>
                  <select className="field" aria-label="Operator" value={c.operator} onChange={(e) => updateCond(i, { operator: e.target.value as typeof c.operator, value: "" })}>
                    {operatorsFor(c.attribute).map((o) => (
                      <option key={o} value={o}>
                        {OPERATOR_LABELS[o]}
                      </option>
                    ))}
                  </select>
                  <ValueInput attribute={c.attribute} operator={c.operator} value={c.value} onChange={(value) => updateCond(i, { value })} />
                  <button
                    aria-label="Remove condition"
                    onClick={() => setDraft((d) => ({ ...d, conditions: d.conditions.filter((_, j) => j !== i) }))}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] text-ink hover:bg-white"
                  >
                    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                      <path d="m3 3 10 10M13 3 3 13" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              className="btn-outline btn-sm mt-3"
              onClick={() => setDraft((d) => ({ ...d, conditions: [...d.conditions, { attribute: "orders_last_90d", operator: "gte", value: "1" }] }))}
            >
              + Add condition
            </button>
            {preview && !preview.ok && (
              <div className="mt-4 rounded-[4px] bg-fail-bg p-3 text-sm text-fail">
                <p className="font-medium">Blocked by the data contract</p>
                {preview.errors.map((e) => (
                  <p key={e} className="mt-1 text-xs">
                    {e}
                  </p>
                ))}
              </div>
            )}
            {preview?.ok && (
              <details className="mt-4 text-sm text-ink-soft">
                <summary className="link cursor-pointer">{preview.description}</summary>
                <pre className="mt-2 overflow-x-auto rounded-[4px] bg-cream p-3 text-[11px]">{preview.sql}</pre>
              </details>
            )}
          </div>

          {summary && (
            <div className="card overflow-hidden">
              <p className="section-title mb-0 border-b border-line px-5 py-3">Sample members</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted">
                    <tr>
                      {["Store", "Country", "Type", "Orders 90d", "GMV 365d", "Last order"].map((h) => (
                        <th key={h} className="px-5 py-2 font-medium whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {summary.sample.map((r) => (
                      <tr key={r.id}>
                        <td className="px-5 py-2 whitespace-nowrap">{r.storeName}</td>
                        <td className="px-5 py-2">
                          <span className="inline-flex items-center gap-1.5">
                            <Flag code={r.country} />
                            {r.country}
                          </span>
                        </td>
                        <td className="px-5 py-2 whitespace-nowrap">{human(r.retailer_type)}</td>
                        <td className="px-5 py-2">{r.orders_last_90d}</td>
                        <td className="px-5 py-2">${fmt(r.gmv_last_365d)}</td>
                        <td className="px-5 py-2 whitespace-nowrap">{r.days_since_last_order === null ? "never" : `${r.days_since_last_order}d ago`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {summary.sample.length === 0 && <p className="px-5 py-6 text-sm text-muted">No retailers match this rule.</p>}
              </div>
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-6">
          <div className="card p-5">
            <p className="section-title">Audience size</p>
            <p className="font-serif text-5xl tabular-nums" aria-live="polite">{summary ? fmtCount(animatedSize) : "–"}</p>
            <p className="mt-1 text-xs text-muted">{summary ? `${((summary.size / summary.total) * 100).toFixed(1)}% of ${fmt(summary.total)} retailers` : "Fix the rule to see a count"}</p>
            {summary && (
              <>
                <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Email-reachable</dt>
                    <dd className="font-medium">{fmt(summary.reachableEmail)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Ads-reachable</dt>
                    <dd className="font-medium">{fmt(summary.reachableAds)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Avg GMV</dt>
                    <dd className="font-medium">${fmt(summary.avgGmv)}</dd>
                  </div>
                </dl>
                <div className="mt-5 space-y-2">
                  {summary.byCountry.slice(0, 6).map((c) => (
                    <div key={c.label} className="flex items-center gap-2 text-xs" title={COUNTRY_NAMES[c.label]}>
                      <span className="flex w-12 items-center gap-1.5 text-ink-soft">
                        <Flag code={c.label} />
                        {c.label}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream">
                        <div
                          className="h-2 rounded-full bg-ink transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                          style={{ width: `${(c.count / Math.max(1, summary.size)) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 text-right tabular-nums">{fmt(c.count)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="card p-5">
            <p className="section-title">Sync (dry run)</p>
            <label className="label" htmlFor="aud-name">Audience name</label>
            <input id="aud-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
            <span className="label mt-4" id="dest-label">Destination</span>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="dest-label">
              {DESTS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setDest(d.id);
                    setPlan(null);
                  }}
                  role="radio"
                  aria-checked={dest === d.id}
                  className={`option flex flex-col items-start gap-2 ${dest === d.id ? "option-active" : ""}`}
                >
                  <PlatformLogo platform={d.id} size={22} />
                  <span>
                    <span className="block font-medium">{d.label}</span>
                    <span className="block text-xs text-ink-soft">needs {d.consent}</span>
                  </span>
                </button>
              ))}
            </div>
            <button className="btn mt-4 w-full" disabled={!summary || syncing} onClick={sync}>
              {syncing && <span className="spinner" aria-hidden />}
              {syncing ? "Building payload…" : "Build sync payload"}
            </button>
            {syncErrors.map((e) => (
              <p key={e} className="mt-2 text-xs text-fail">
                {e}
              </p>
            ))}
            {plan && (
              <div key={`${plan.destination}-${plan.eligible}`} className="animate-fade-up mt-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-[4px] bg-cream p-2">
                    <p className="text-lg font-medium">{fmt(plan.matched)}</p>matched
                  </div>
                  <div className="rounded-[4px] bg-pass-bg p-2 text-pass">
                    <p className="text-lg font-medium">{fmt(plan.eligible)}</p>will sync
                  </div>
                  <div className="rounded-[4px] bg-warn-bg p-2 text-warn">
                    <p className="text-lg font-medium">{fmt(plan.excludedForConsent)}</p>no consent
                  </div>
                </div>
                <p className="text-xs text-ink-soft">
                  {plan.batches} batch{plan.batches === 1 ? "" : "es"} to {plan.label}. Records without <code>{plan.consentField}</code> are dropped before the payload is built.
                </p>
                <pre className="max-h-64 overflow-auto rounded-[4px] bg-[#1d1d1b] p-3 text-[11px] leading-relaxed text-[#e9e4da]">{JSON.stringify(plan.preview, null, 2)}</pre>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
