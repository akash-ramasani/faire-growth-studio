import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Flag, LOCALE_FLAG } from "@/components/Flag";
import { HelpTip } from "@/components/Help";
import { listPublished } from "@/lib/db/repo";
import { CATEGORY_LABELS } from "@/lib/landing/locale";

export const metadata: Metadata = { title: "Published pages · Growth Studio", robots: { index: false, follow: false } };

const SOURCE: Record<string, { label: string; cls: string }> = {
  claude: { label: "Claude", cls: "bg-pass-bg text-pass" },
  claude_repaired: { label: "Repaired", cls: "bg-warn-bg text-warn" },
  template_fallback: { label: "Template", cls: "bg-sky text-ink" },
};
const TILE: Record<string, string> = { sand: "#f3ece3", sage: "#e7e8d2", clay: "#ffd0b6", sky: "#f1f29f", ink: "#41252a" };

async function Gallery() {
  await connection();
  const pages = await listPublished(200);
  const featured = pages.filter((p) => p.spec.brief.featuredBrand).length;
  return (
    <>
      <p className="mt-2 text-sm text-ink-soft">
        {pages.length} pages, {featured} featuring a real Faire storefront. Each one passed every required check on the server before it was saved.
      </p>
      <ul className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pages.map((p, i) => {
          const s = p.spec;
          const src = SOURCE[p.source] ?? SOURCE.claude;
          const cat = s.brief.focusCategories[0] ?? s.categories[0]?.name;
          return (
            <li key={s.slug} style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
              <Link href={`/p/${s.slug}`} className="card card-hover flex h-full flex-col overflow-hidden">
                <div className="flex h-24 items-end justify-between p-4" style={{ background: TILE[s.hero.palette] ?? TILE.sand }}>
                  <span className={`text-xs ${s.hero.palette === "ink" ? "text-white" : "text-ink-soft"}`}>{cat ? CATEGORY_LABELS[s.brief.locale][cat] : ""}</span>
                  <Flag code={LOCALE_FLAG[s.brief.locale]} />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs text-ink-soft">{s.brief.featuredBrand ? s.brief.featuredBrand.name : s.brief.campaignName}</p>
                  <p className="mt-1 font-serif text-xl leading-[26px]">{s.hero.headline}</p>
                  <div className="mt-auto flex items-center justify-between pt-4 text-xs">
                    <span className={`rounded-[2px] px-1.5 leading-5 ${src.cls}`}>{src.label}</span>
                    <span className="text-ink-soft">{s.brief.audience === "retailer" ? "For retailers" : "For brands"}</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function PublishedPages() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-8">
      <p className="text-sm text-ink-soft">Published pages</p>
      <h1 className="mt-1 flex items-center font-serif text-[30px] leading-[38px] md:text-[38px] md:leading-[50px]">
        Everything published from the studio
        <HelpTip
          text="Every page here was generated, passed the server-side checks and was published. Pages featuring a real brand state nothing about it beyond its name and category, link to its real Faire storefront, and are hidden from search engines."
          align="start"
        />
      </h1>
      <Suspense
        fallback={
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton h-56" />
            ))}
          </div>
        }
      >
        <Gallery />
      </Suspense>
    </div>
  );
}
