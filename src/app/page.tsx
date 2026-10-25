import Link from "next/link";

const PIPELINE = [
  { step: "Brief", body: "Marketer fills a short form. The only free-form input." },
  { step: "Claude", body: "Writes copy into a typed schema. Picks from approved destinations, categories and quotes." },
  { step: "Code", body: "Builds URLs and UTMs. Attribution never depends on the model." },
  { step: "Evals", body: "Up to 15 deterministic checks per market: claims, qualifiers, lengths, audience fit, tracking, alt text." },
  { step: "Repair", body: "Blocking failures go back to Claude once, with the exact reasons." },
  { step: "Fallback", body: "Still failing, or API down? Serve the approved template. Never a blank page." },
  { step: "Learn", body: "A/B test variants, call winners with a stopping rule, and feed what won into the next prompt." },
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
          <div>
            <p className="text-sm text-white/80">Marketing engineering · Growth Platform</p>
            <h1 className="mt-4 font-serif text-[38px] leading-[46px] md:text-[52px] md:leading-[64px]">Capabilities marketers can run without us</h1>
            <p className="mt-4 max-w-xl text-sm font-medium leading-5">
              A working prototype of the two problems in the role: marketing-led landing pages and self-serve audiences. Agents do the patterned work, with evals,
              monitoring and a defined failure mode before anything reaches a customer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pages" className="btn-outline">
                Build a landing page
              </Link>
              <Link href="/audiences" className="inline-flex h-12 items-center rounded-[4px] border border-white/70 px-5 text-sm text-white transition hover:bg-white/10">
                Build an audience
              </Link>
            </div>
            <p className="mt-6 text-sm">
              Reviewing this for the role?{" "}
              <a
                href="https://github.com/akash-ramasani/faire-growth-studio/blob/main/docs/build-vs-buy.md"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                Read the build-vs-buy memo
              </a>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: "1 brief", v: "to a published page", bg: "bg-butter" },
              { k: "15 checks", v: "before publish", bg: "bg-peach" },
              { k: "4 markets", v: "with their own claim rules", bg: "bg-cream" },
              { k: "100%", v: "consent enforced in code", bg: "bg-sage" },
            ].map((s) => (
              <div key={s.k} className={`${s.bg} p-6 text-ink`}>
                <p className="font-serif text-[38px] leading-[50px]">{s.k}</p>
                <p className="mt-1 text-sm">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-14 sm:px-8">
        <h2 className="font-serif text-[30px] leading-[38px]">How a landing page gets made</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {PIPELINE.map((p, i) => (
            <li key={p.step} className="card relative p-4">
              <span className="text-xs text-muted">0{i + 1}</span>
              <p className="mt-1 text-lg leading-[26px] font-medium">{p.step}</p>
              <p className="mt-2 text-sm leading-snug text-ink-soft">{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-14 sm:px-8 md:grid-cols-3">
          <Link href="/pages" className="card group p-6 transition hover:border-ink">
            <p className="text-sm text-ink-soft">Landing page service</p>
            <p className="mt-2 text-lg leading-[26px] font-medium">Brief → eval-gated page, with A/B variants</p>
            <p className="mt-2 text-sm text-ink-soft">For blog, newsroom, lifecycle and paid teams, in US, UK, French and German markets. Edit inline and the evals re-run as you type. Publishing is blocked until they pass.</p>
            <span className="mt-4 inline-block text-sm font-medium underline-offset-4 group-hover:underline">Open the studio →</span>
          </Link>
          <Link href="/experiments" className="card group p-6 transition hover:border-ink">
            <p className="text-sm text-ink-soft">Experiment learning loop</p>
            <p className="mt-2 text-lg leading-[26px] font-medium">A/B results → learnings → better next page</p>
            <p className="mt-2 text-sm text-ink-soft">Bayesian readout with a peeking guard. Winning patterns (not exact wording) become memory that Claude uses for the same audience.</p>
            <span className="mt-4 inline-block text-sm font-medium underline-offset-4 group-hover:underline">Open experiments →</span>
          </Link>
          <Link href="/audiences" className="card group p-6 transition hover:border-ink">
            <p className="text-sm text-ink-soft">Self-serve audiences</p>
            <p className="mt-2 text-lg leading-[26px] font-medium">Plain English → validated rule → Braze, Meta, Google</p>
            <p className="mt-2 text-sm text-ink-soft">Claude proposes, the data contract decides. See size, reach and SQL, then build the destination payload with consent applied.</p>
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
