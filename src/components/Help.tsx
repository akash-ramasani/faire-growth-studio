"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// "?" help tips. Open on hover, keyboard focus or tap; close on Escape, blur or tapping elsewhere.
// The bubble uses Faire's dark #333 surface so it reads like the toasts. It renders in a portal on
// <body> with fixed positioning, so cards, animations and overflow can never cover or clip it.

const GAP = 8;
const MARGIN = 8;

export function HelpTip({ text, align = "center", label = "More info" }: { text: React.ReactNode; align?: "start" | "center" | "end"; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; placement: "top" | "bottom" } | null>(null);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);

  // Place above the button (or below if there's no room), aligned as requested, kept inside the viewport.
  const place = useCallback(() => {
    const btn = triggerRef.current?.getBoundingClientRect();
    const tip = tipRef.current?.getBoundingClientRect();
    if (!btn || !tip) return;
    const vw = document.documentElement.clientWidth;
    const preferred = align === "start" ? btn.left - 4 : align === "end" ? btn.right - tip.width + 4 : btn.left + btn.width / 2 - tip.width / 2;
    const left = Math.min(Math.max(preferred, MARGIN), vw - tip.width - MARGIN);
    const above = btn.top - GAP - tip.height;
    const placement = above >= MARGIN ? "top" : "bottom";
    setPos({ left, top: placement === "top" ? above : btn.bottom + GAP, placement });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !tipRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  const close = () => {
    setOpen(false);
    setPos(null);
  };

  return (
    <span className="inline-flex align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={close}>
      <button
        ref={triggerRef}
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
        onBlur={close}
        className="ml-1.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-line bg-white text-[11px] leading-none font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink focus-visible:border-ink focus-visible:text-ink focus-visible:outline-none"
      >
        ?
      </button>
      {open &&
        createPortal(
          <span
            ref={tipRef}
            id={id}
            role="tooltip"
            style={{
              position: "fixed",
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              // Measured first while hidden, then shown in place: no flash at the corner.
              visibility: pos ? "visible" : "hidden",
              transformOrigin: pos?.placement === "bottom" ? "top center" : "bottom center",
            }}
            className={`pointer-events-none z-[60] w-[260px] max-w-[calc(100vw-16px)] rounded-[4px] bg-ink px-3 py-2.5 text-left text-xs leading-[18px] font-normal tracking-normal text-white normal-case shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)] ${
              pos ? "animate-scale-in" : ""
            }`}
          >
            {text}
          </span>,
          document.body,
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
