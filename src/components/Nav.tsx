"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "./Wordmark";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/pages", label: "Landing pages" },
  { href: "/experiments", label: "Experiments" },
  { href: "/audiences", label: "Audiences" },
  { href: "/monitoring", label: "Monitoring" },
];

const MEMO = "https://github.com/akash-ramasani/faire-growth-studio/blob/main/docs/build-vs-buy.md";
const REPO = "https://github.com/akash-ramasani/faire-growth-studio";

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
    <>
      <div className="bg-cream px-4 py-2 text-center text-sm text-ink">
        An independent interview project by Akash Ramasani. Not affiliated with Faire.{" "}
        <a href={MEMO} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Read the memo
        </a>
      </div>
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex h-[60px] max-w-[1440px] items-center gap-4 px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Growth Studio home">
            <Wordmark />
            <span className="hidden border-l border-line pl-3 text-sm text-ink-soft sm:inline">Growth Studio</span>
          </Link>
          <div className="ml-auto flex items-center gap-1 text-sm">
            {health && (
              <span
                title={health.claudeConfigured ? `Model: ${health.model}` : "Set ANTHROPIC_API_KEY to enable Claude"}
                className="mr-2 hidden items-center gap-1.5 px-3 text-ink-soft md:inline-flex"
              >
                <span className={`h-2 w-2 rounded-full ${health.claudeConfigured ? "bg-pass" : "bg-warn"}`} />
                {health.claudeConfigured ? "Claude connected" : "Template mode"}
              </span>
            )}
            <a href={REPO} target="_blank" rel="noreferrer" className="hidden h-[60px] items-center px-3 text-ink hover:underline sm:flex">
              GitHub
            </a>
            <Link href="/pages" className="btn btn-sm ml-2">
              Build a page
            </Link>
          </div>
        </div>
        <nav className="border-t border-line">
          <ul className="mx-auto flex max-w-[1440px] justify-start gap-1 overflow-x-auto px-4 sm:justify-center sm:px-8">
            {LINKS.map((l) => {
              const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition ${
                      active ? "border-ink text-ink" : "border-transparent text-ink hover:border-line"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
    </>
  );
}
