import Link from "next/link";
import { PlatformLogo } from "@/components/PlatformLogo";

const PIPELINE = [
  { step: "Brief", body: "Marketer fills a short form. The only free-form input." },
  { step: "Claude", body: "Writes copy into a typed schema. Picks from approved destinations, categories and quotes." },
  { step: "Code", body: "Builds URLs and UTMs. Attribution never depends on the model." },
  { step: "Evals", body: "Up to 15 deterministic checks per market: claims, qualifiers, lengths, audience fit, tracking, alt text." },
  { step: "Repair", body: "Blocking failures go back to Claude once, with the exact reasons." },
  { step: "Fallback", body: "Still failing, or API down? Serve the approved template. Never a blank page." },
  { step: "Learn", body: "A/B test variants, call winners with a stopping rule, and feed what won into the next prompt." },
];

const TOUR = [
  {
    title: "Generate a landing page",
    href: "/pages",
    cta: "Open Landing pages",
    doIt: "Pick the \"Holiday restock\" preset and press Generate page.",
    happens: "Claude writes the page in about 20 seconds, up to 15 checks run, and you see whether it passed first time, needed a repair, or used the safe template.",
  },
  {
    title: "Try to break the checks",
    href: "/pages",
    cta: "Edit a headline",
    doIt: "In Edit hero, type \"Guaranteed sales, risk-free\" into the headline.",
    happens: "The claims check fails as you type and Publish locks. The server refuses it too, so a non-compliant page can't go live.",
  },
  {
    title: "Run an A/B test",
    href: "/experiments",
    cta: "Open Experiments",
    doIt: "Press Quick demo test, then Simulate 1 day until Conclude unlocks.",
    happens: "A winner is called only with enough evidence. What it did differently is saved as a learning.",
  },
  {
    title: "See the learning used",
    href: "/pages",
    cta: "Generate again",
    doIt: "Back in Landing pages, keep \"Apply learnings\" ticked and generate a retailer page.",
    happens: "The learnings are added to Claude's instructions, and the new page leads with what won.",
  },
  {
    title: "Build an audience",
    href: "/audiences",
    cta: "Open Audiences",
    doIt: "Type \"UK boutiques that spent over $2,000 and love our Instagram\" and press Build rule.",
    happens: "Claude builds a rule from fields that exist and flags the Instagram part as unsupported instead of guessing. Then build a Braze or Meta payload with consent applied.",
  },
];

const PRINCIPLES = [
  { title: "Constrain, then generate", body: "Enums for anything legal or brand would review: destinations, testimonials, categories. The model composes, it doesn't invent." },
  { title: "A defined failure mode", body: "Every path ends in a page that passes blocking evals. The source label tells the marketer which path they got and why." },
  { title: "Contracts in code", body: "Audiences are validated against a typed attribute catalog, compiled to SQL, and consent is enforced at sync for every destination." },
  { title: "Observable by default", body: "Every run logs path, eval results, latency and tokens. Fallback and repair rates are the on-call signals." },
];

export default function Home() {
  return (
    <div>
      {/* Faire's hero pattern: full-bleed colour field, white serif headline, white 48px button, underlined secondary link. */}
      <section className="bg-burgundy text-white">
        <div className="mx-auto grid min-h-[520px] max-w-[1440px] items-center gap-10 px-4 py-16 sm:px-8 md:grid-cols-[1.15fr_1fr]">
          <div className="animate-fade-up">
            <p className="text-sm text-white/80">Marketing engineering · Growth Platform</p>
            <h1 className="mt-4 font-serif text-[38px] leading-[46px] md:text-[52px] md:leading-[64px]">Capabilities marketers can run without us</h1>
            <p className="mt-4 max-w-xl text-sm font-medium leading-5">
              A working prototype of the two problems in the role: marketing-led landing pages and self-serve audiences. Agents do the patterned work, with evals,
              monitoring and a defined failure mode before anything reaches a customer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#start-here" className="btn-outline">
                New here? Take the 5-step tour
              </a>
              <Link href="/pages" className="inline-flex h-12 items-center rounded-[4px] border border-white/70 px-5 text-sm text-white transition hover:bg-white/10">
                Build a landing page
              </Link>

            </div>
            <p className="mt-6 text-sm">
              Reviewing this for the role?{" "}
              <a
                href="https://github.com/akash-ramasani/faire-growth-studio/blob/main/docs/build-vs-buy.md"
                target="_blank"
                rel="noreferrer"
                className="link"
              >
                Read the build-vs-buy memo
              </a>
            </p>
          </div>
          <div className="stagger grid grid-cols-2 gap-3">
            {[
              { k: "1 brief", v: "to a published page", bg: "bg-butter" },
              { k: "15 checks", v: "before publish", bg: "bg-peach" },
              { k: "4 markets", v: "with their own claim rules", bg: "bg-cream" },
              { k: "100%", v: "consent enforced in code", bg: "bg-sage" },
            ].map((s, i) => (
              <div key={s.k} className={`${s.bg} p-6 text-ink`} style={{ "--i": i + 2 } as React.CSSProperties}>
                <p className="font-serif text-[38px] leading-[50px]">{s.k}</p>
                <p className="mt-1 text-sm">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="start-here" className="scroll-mt-40 border-b border-line">
        <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-8">
          <p className="text-sm text-ink-soft">Start here</p>
          <h2 className="mt-1 font-serif text-[30px] leading-[38px]">A 5-minute tour</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Never used it before? Do these in order. Each step says what to click and what will happen. Every field in the app also has a{" "}
            <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-line text-[11px] align-middle">?</span> with a
            plain explanation.
          </p>
          <ol className="stagger mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {TOUR.map((t, i) => (
              <li key={t.title} className="card card-hover flex flex-col p-5" style={{ "--i": i } as React.CSSProperties}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-sm text-white">{i + 1}</span>
                <p className="mt-3 text-lg leading-[26px] font-medium">{t.title}</p>
                <p className="mt-3 text-xs font-medium text-ink">Do this</p>
                <p className="mt-0.5 text-sm leading-5 text-ink-soft">{t.doIt}</p>
                <p className="mt-3 text-xs font-medium text-ink">What happens</p>
                <p className="mt-0.5 text-sm leading-5 text-ink-soft">{t.happens}</p>
                <Link href={t.href} className="link mt-auto pt-4 text-sm font-medium">
                  {t.cta} →
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-14 sm:px-8">
        <h2 className="font-serif text-[30px] leading-[38px]">How a landing page gets made</h2>
        <ol className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {PIPELINE.map((p, i) => (
            <li key={p.step} className="card card-hover relative p-4" style={{ "--i": i } as React.CSSProperties}>
              <span className="text-xs text-muted">0{i + 1}</span>
              <p className="mt-1 text-lg leading-[26px] font-medium">{p.step}</p>
              <p className="mt-2 text-sm leading-snug text-ink-soft">{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-14 sm:px-8 md:grid-cols-3">
          <Link href="/pages" className="card card-hover group p-6">
            <p className="text-sm text-ink-soft">Landing page service</p>
            <p className="mt-2 text-lg leading-[26px] font-medium">Brief → eval-gated page, with A/B variants</p>
            <p className="mt-2 text-sm text-ink-soft">For blog, newsroom, lifecycle and paid teams, in US, UK, French and German markets. Edit inline and the evals re-run as you type. Publishing is blocked until they pass.</p>
            <span className="mt-4 inline-block text-sm font-medium underline-offset-4 group-hover:underline">Open the studio →</span>
          </Link>
          <Link href="/experiments" className="card card-hover group p-6">
            <p className="text-sm text-ink-soft">Experiment learning loop</p>
            <p className="mt-2 text-lg leading-[26px] font-medium">A/B results → learnings → better next page</p>
            <p className="mt-2 text-sm text-ink-soft">Bayesian readout with a peeking guard. Winning patterns (not exact wording) become memory that Claude uses for the same audience.</p>
            <span className="mt-4 inline-block text-sm font-medium underline-offset-4 group-hover:underline">Open experiments →</span>
          </Link>
          <Link href="/audiences" className="card card-hover group p-6">
            <p className="text-sm text-ink-soft">Self-serve audiences</p>
            <p className="mt-2 text-lg leading-[26px] font-medium">Plain English → validated rule → Braze, Meta, Google</p>
            <p className="mt-2 text-sm text-ink-soft">Claude proposes, the data contract decides. See size, reach and SQL, then build the destination payload with consent applied.</p>
            <div className="mt-4 flex items-center gap-3" aria-label="Sync destinations">
              <PlatformLogo platform="braze" size={22} />
              <PlatformLogo platform="meta" size={22} />
              <PlatformLogo platform="google" size={22} />
            </div>
            <span className="mt-4 inline-block text-sm font-medium underline-offset-4 group-hover:underline">Open audiences →</span>
          </Link>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-8">
          <h2 className="font-serif text-[30px] leading-[38px]">Design principles</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((p) => (
              <div key={p.title}>
                <p className="text-lg leading-[26px] font-medium">{p.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
