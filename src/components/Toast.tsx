"use client";

import { useEffect, useState } from "react";

// Lightweight toasts in Faire's style: #333 surface, white 14px text, 4px radius, bottom-center.
// `toast()` can be called from anywhere (event handlers, async helpers) without a context.

type Tone = "default" | "success" | "error";
type Toast = { id: number; message: string; tone: Tone; action?: { label: string; href: string }; leaving?: boolean };

const EVENT = "gs:toast";
let nextId = 1;

export function toast(message: string, opts: { tone?: Tone; action?: { label: string; href: string } } = {}) {
  window.dispatchEvent(new CustomEvent<Toast>(EVENT, { detail: { id: nextId++, message, tone: opts.tone ?? "default", action: opts.action } }));
}

const ICON: Record<Tone, React.ReactNode> = {
  default: null,
  success: <path d="m4 8.5 2.5 2.5L12 5.5" />,
  error: <path d="M8 4.5v4.5M8 11.5v.01" />,
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const t = (e as CustomEvent<Toast>).detail;
      setToasts((list) => [...list.slice(-2), t]);
      const ttl = t.tone === "error" ? 6000 : 4000;
      setTimeout(() => setToasts((list) => list.map((x) => (x.id === t.id ? { ...x, leaving: true } : x))), ttl);
      setTimeout(() => setToasts((list) => list.filter((x) => x.id !== t.id)), ttl + 220);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          style={{ animation: `${t.leaving ? "toast-out 200ms" : "toast-in 320ms"} var(--ease-out) both` }}
          className={`pointer-events-auto flex max-w-[480px] items-center gap-3 rounded-[4px] px-4 py-3 text-sm text-white shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)] ${
            t.tone === "error" ? "bg-fail" : "bg-ink"
          }`}
        >
          {ICON[t.tone] && (
            <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {ICON[t.tone]}
            </svg>
          )}
          <span className="min-w-0">{t.message}</span>
          {t.action && (
            <a href={t.action.href} className="shrink-0 underline underline-offset-[3px]">
              {t.action.label}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
