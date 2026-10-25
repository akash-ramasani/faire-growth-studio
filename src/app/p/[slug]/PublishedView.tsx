"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LandingPage } from "@/components/LandingPage";
import { Wordmark } from "@/components/Wordmark";
import { useHydrated, usePages } from "@/lib/store";

export function PublishedView({ slug }: { slug: string }) {
  const hydrated = useHydrated();
  const page = usePages().find((p) => p.spec.slug === slug);

  useEffect(() => {
    if (page) document.title = page.spec.metaTitle;
  }, [page]);

  if (!hydrated) return null;
  if (!page) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="font-serif text-3xl">Page not found</p>
        <p className="mt-2 text-sm text-ink-soft">Published pages are stored in the browser that published them.</p>
        <Link href="/pages" className="btn mt-6">
          Back to the studio
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-ink px-4 py-2 text-xs text-white sm:px-6">
        <span className="min-w-0 break-all">
          Demo preview of <strong>/{page.spec.slug}</strong>. CTA links to <span className="opacity-70">{page.spec.ctaUrl}</span>
        </span>
        <Link href="/pages" className="underline">
          Back to studio
        </Link>
      </div>
      <header className="flex h-[60px] items-center border-b border-line bg-white px-6 md:px-12">
        <Wordmark />
      </header>
      <LandingPage spec={page.spec} interactive />
    </div>
  );
}
