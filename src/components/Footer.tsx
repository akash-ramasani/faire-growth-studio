import Link from "next/link";
import { Wordmark } from "./Wordmark";

const REPO = "https://github.com/akash-ramasani/faire-growth-studio";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Landing pages", href: "/pages" },
      { label: "Experiments", href: "/experiments" },
      { label: "Audiences", href: "/audiences" },
      { label: "Monitoring", href: "/monitoring" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "Source on GitHub", href: REPO },
      { label: "Build vs. buy memo", href: `${REPO}/blob/main/docs/build-vs-buy.md` },
      { label: "How the evals work", href: `${REPO}#landing-page-service` },
      { label: "Eval suite", href: `${REPO}/tree/main/evals` },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark className="text-[18px]" />
          <p className="mt-5 max-w-md font-serif text-[30px] leading-[38px]">Growth tooling for the marketers powering independent retail</p>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-medium">{c.title}</p>
            <ul className="mt-4 space-y-3">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("/") ? (
                    <Link href={l.href} className="text-base text-black hover:underline">
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} target="_blank" rel="noreferrer" className="text-base text-black hover:underline">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-[1440px] px-4 pb-10 text-sm text-ink-soft sm:px-8">
        © 2026 Akash Ramasani · Independent demo, not affiliated with or endorsed by Faire · All retailer data is synthetic
      </div>
    </footer>
  );
}
