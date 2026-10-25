"use client";

import { useEffect, useState } from "react";
import type { Experiment, Learning } from "./experiments/model";
import type { GenerationResult, PageSpec } from "./landing/schema";
import type { PublishedPage, RunRecord } from "./db/repo";

export type { PublishedPage, RunRecord };

// Client access to the SQLite-backed API. Data is shared by everyone using the demo.
// After a write, `invalidate()` tells every mounted hook to refetch.

const EVENT = "gs:invalidate";
const invalidate = () => window.dispatchEvent(new Event(EVENT));

function useApi<T>(url: string, fallback: T): { data: T; loaded: boolean } {
  const [state, setState] = useState<{ data: T; loaded: boolean }>({ data: fallback, loaded: false });
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(url, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((data: T) => alive && setState({ data, loaded: true }))
        .catch(() => alive && setState((s) => ({ ...s, loaded: true })));
    load();
    window.addEventListener(EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(EVENT, load);
    };
  }, [url]);
  return state;
}

async function send<T = { ok: boolean; error?: string }>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = (await res.json().catch(() => ({ ok: false, error: `Request failed (${res.status})` }))) as T;
  invalidate();
  return data;
}

export const useRuns = () => useApi<RunRecord[]>("/api/runs", []);
export const clearRuns = () => send("/api/runs", "DELETE");

export const usePages = () => useApi<PublishedPage[]>("/api/published", []);
export const publishPage = (spec: PageSpec, source: GenerationResult["source"]) =>
  send<{ ok: boolean; slug?: string; error?: string }>("/api/published", "POST", { spec, source });

export const useExperiments = () => useApi<Experiment[]>("/api/experiments", []);
export const createExperiment = (a: { spec: PageSpec; source: GenerationResult["source"] }, b: { spec: PageSpec; source: GenerationResult["source"] }) =>
  send<{ ok: boolean; id?: string; error?: string }>("/api/experiments", "POST", { a, b });
export const simulateExperiment = (id: string, days: number) => send(`/api/experiments/${id}`, "POST", { action: "simulate", days });
export const concludeExperiment = (id: string) => send(`/api/experiments/${id}`, "POST", { action: "conclude" });

export const useLearnings = () => useApi<Learning[]>("/api/learnings", []);
export const setLearningActive = (id: string, active: boolean) => send("/api/learnings", "PATCH", { id, active });
export const clearLearnings = () => send("/api/learnings", "DELETE");
