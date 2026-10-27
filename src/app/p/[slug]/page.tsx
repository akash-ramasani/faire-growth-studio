import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LandingPage } from "@/components/LandingPage";
import { Wordmark } from "@/components/Wordmark";
import { getPublished } from "@/lib/db/repo";

// Blocking on purpose: the page must be looked up before streaming so a missing slug returns a real 404.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const page = await getPublished((await params).slug);
  // Demo pages: never indexed, so nothing here is mistaken for a real Faire or brand page in search.
  const robots = { index: false, follow: false };
  return page ? { title: page.spec.metaTitle, description: page.spec.metaDescription, robots } : { robots };
}

export default async function PublishedLandingPage({ params }: PageProps<"/p/[slug]">) {
  const page = await getPublished((await params).slug);
  if (!page) notFound();
  return (
    <div>
      {/* One line at every width: the long CTA URL truncates (full value on hover) instead of wrapping. */}
      <div className="flex items-center gap-4 whitespace-nowrap bg-ink px-4 py-2 text-xs text-white sm:px-6">
        <span className="min-w-0 flex-1 truncate" title={page.spec.ctaUrl}>
          Demo page <strong>/{page.spec.slug}</strong>, published {new Date(page.publishedAt).toLocaleDateString("en-US")}. Not a live Faire page. CTA links to{" "}
          <span className="opacity-70">{page.spec.ctaUrl}</span>
        </span>
        <Link href="/pages" className="link shrink-0">
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
