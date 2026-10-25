"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Experiment, Learning } from "./experiments/model";
import type { GenerationResult, PageSpec } from "./landing/schema";

// Per-browser persistence for the demo. In production, runs would land in the warehouse
// and published pages in the CMS.

export type RunRecord = {
  at: number;
  kind: "page" | "audience";
  campaign: string;
  source: GenerationResult["source"] | "audience_ok" | "audience_failed";
  latencyMs: number;
  attempts: number;
  evals: { id: string; name: string; passed: boolean; severity: string }[];
  fallbackReason?: string;
  inputTokens?: number;
  outputTokens?: number;
};

const RUNS = "fgs.runs.v1";
const PAGES = "fgs.pages.v1";

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
};

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const read = <T,>(key: string, fallback: T): T => parse(readRaw(key), fallback);

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  listeners.forEach((fn) => fn());
}

// Subscribes on the raw string so the snapshot is stable between writes.
function useStored<T>(key: string, fallback: T): T {
  const raw = useSyncExternalStore(subscribe, () => readRaw(key), () => null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => parse(raw, fallback), [raw]);
}

export const useHydrated = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

export const getRuns = () => read<RunRecord[]>(RUNS, []);
export const addRun = (r: RunRecord) => write(RUNS, [r, ...getRuns()].slice(0, 200));
export const clearRuns = () => write(RUNS, []);
export const useRuns = () => useStored<RunRecord[]>(RUNS, []);

export type PublishedPage = { spec: PageSpec; publishedAt: number; source: GenerationResult["source"] };
export const getPages = () => read<PublishedPage[]>(PAGES, []);
export const publishPage = (p: PublishedPage) => write(PAGES, [p, ...getPages().filter((x) => x.spec.slug !== p.spec.slug)].slice(0, 50));
export const usePages = () => useStored<PublishedPage[]>(PAGES, []);

const EXPERIMENTS = "fgs.experiments.v1";
const LEARNINGS = "fgs.learnings.v1";

export const getExperiments = () => read<Experiment[]>(EXPERIMENTS, []);
export const useExperiments = () => useStored<Experiment[]>(EXPERIMENTS, []);
export const saveExperiment = (e: Experiment) => write(EXPERIMENTS, [e, ...getExperiments().filter((x) => x.id !== e.id)].slice(0, 30));

export const getLearnings = () => read<Learning[]>(LEARNINGS, []);
export const useLearnings = () => useStored<Learning[]>(LEARNINGS, []);
export const addLearnings = (ls: Learning[]) => write(LEARNINGS, [...ls, ...getLearnings()].slice(0, 100));
export const setLearningActive = (id: string, active: boolean) => write(LEARNINGS, getLearnings().map((l) => (l.id === id ? { ...l, active } : l)));
export const clearLearnings = () => write(LEARNINGS, []);
