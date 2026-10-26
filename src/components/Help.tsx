"use client";

import { useEffect, useId, useRef, useState } from "react";

// "?" help tips. Open on hover, keyboard focus or tap; close on Escape, blur or tapping elsewhere.
// The bubble uses Faire's dark #333 surface so it reads like the toasts.

export function HelpTip({ text, align = "center", label = "More info" }: { text: React.ReactNode; align?: "start" | "center" | "end"; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const pos = align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <span ref={ref} className="relative inline-flex align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Always open on click: hover has usually opened it already, and a toggle would close it.
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="ml-1.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-line bg-white text-[11px] leading-none font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink focus-visible:border-ink focus-visible:text-ink focus-visible:outline-none"
      >
        ?
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`animate-scale-in absolute bottom-full z-40 mb-2 w-[260px] rounded-[4px] bg-ink px-3 py-2.5 text-left text-xs leading-[18px] font-normal tracking-normal text-white normal-case shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)] ${pos}`}
        >
          {text}
        </span>
      )}
    </span>
  );
}

/** Form label with an optional help tip. */
export function FieldLabel({ htmlFor, id, help, children, align }: { htmlFor?: string; id?: string; help?: React.ReactNode; children: React.ReactNode; align?: "start" | "center" | "end" }) {
  const Tag = htmlFor ? "label" : "span";
  return (
    <div className="mb-1 flex items-center">
      <Tag htmlFor={htmlFor} id={id} className="text-sm leading-5 text-ink">
        {children}
      </Tag>
      {help && <HelpTip text={help} align={align ?? "start"} label={`About ${typeof children === "string" ? children : "this field"}`} />}
    </div>
  );
}

/** Section heading (non-form) with an optional help tip. */
export function SectionTitle({ help, children, className = "", align }: { help?: React.ReactNode; children: React.ReactNode; className?: string; align?: "start" | "center" | "end" }) {
  return (
    <div className={`mb-3 flex items-center ${className}`}>
      <p className="text-sm leading-5 font-medium text-ink">{children}</p>
      {help && <HelpTip text={help} align={align ?? "start"} label={`About ${typeof children === "string" ? children : "this section"}`} />}
    </div>
  );
}

/**
 * Dismissible "how this page works" strip. Remembers dismissal per page in localStorage
 * (a per-viewer convenience; the page works the same without it).
 */
export function GettingStarted({ id, title, steps }: { id: string; title: string; steps: Array<{ title: string; body: React.ReactNode }> }) {
  const key = `gs.guide.${id}`;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(key) === "1";
    } catch {}
    const raf = requestAnimationFrame(() => setHidden(dismissed));
    return () => cancelAnimationFrame(raf);
  }, [key]);

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.removeItem(key);
          } catch {}
          setHidden(false);
        }}
        className="link mb-6 text-sm text-ink-soft"
      >
        How does this page work?
      </button>
    );
  }

  return (
    <section aria-label={title} className="animate-fade-up mb-8 border border-line bg-cream p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium">{title}</p>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(key, "1");
            } catch {}
            setHidden(true);
          }}
          className="link shrink-0 text-xs text-ink-soft"
        >
          Hide guide
        </button>
      </div>
      <ol className="stagger mt-4 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3" style={{ "--i": i } as React.CSSProperties}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs text-white">{i + 1}</span>
            <div>
              <p className="text-sm font-medium">{s.title}</p>
              <p className="mt-0.5 text-sm leading-5 text-ink-soft">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
