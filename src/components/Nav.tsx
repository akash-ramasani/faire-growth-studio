"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/pages", label: "Landing pages" },
  { href: "/experiments", label: "Experiments" },
  { href: "/audiences", label: "Audiences" },
  { href: "/monitoring", label: "Monitoring" },
];

export function Nav() {
  const path = usePathname();
  const [health, setHealth] = useState<{ claudeConfigured: boolean; model: string } | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  if (path.startsWith("/p/")) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2.5">
          <span className="font-serif text-[22px] font-medium tracking-[0.18em]">FAIRE</span>
          <span className="hidden text-xs font-medium tracking-wide text-muted uppercase sm:inline">Growth Studio</span>
        </Link>
        <nav className="flex flex-1 gap-1 overflow-x-auto text-sm">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-[4px] px-3 py-2 transition ${active ? "bg-cream font-medium text-ink" : "text-ink-soft hover:text-ink"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        {health && (
          <span
            title={health.claudeConfigured ? `Model: ${health.model}` : "Set ANTHROPIC_API_KEY to enable Claude"}
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium md:inline-flex ${
              health.claudeConfigured ? "bg-pass-bg text-pass" : "bg-warn-bg text-warn"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${health.claudeConfigured ? "bg-pass" : "bg-warn"}`} />
            {health.claudeConfigured ? "Claude connected" : "Template mode"}
          </span>
        )}
      </div>
    </header>
  );
}
