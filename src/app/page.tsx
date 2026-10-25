import Link from "next/link";

const PIPELINE = [
  { step: "Brief", body: "Marketer fills a short form. The only free-form input." },
  { step: "Claude", body: "Writes copy into a typed schema. Picks from approved destinations, categories and quotes." },
  { step: "Code", body: "Builds URLs and UTMs. Attribution never depends on the model." },
  { step: "Evals", body: "Up to 12 deterministic checks: claims, qualifiers, lengths, audience fit, tracking, alt text." },
  { step: "Repair", body: "Blocking failures go back to Claude once, with the exact reasons." },
  { step: "Fallback", body: "Still failing, or API down? Serve the approved template. Never a blank page." },
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
      <section className="bg-cream">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.2fr_1fr] md:py-20">
          <div>
            <p className="text-xs font-medium tracking-[0.14em] text-ink-soft uppercase">Marketing engineering · Growth Platform</p>
            <h1 className="mt-3 font-serif text-4xl leading-[1.06] tracking-tight md:text-6xl">Capabilities marketers can run without us.</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
              A working prototype of the two problems in the role: marketing-led landing pages and self-serve audiences. Agents do the patterned work, with evals,
              monitoring and a defined failure mode before anything reaches a customer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pages" className="btn px-6 py-3">
                Build a landing page
              </Link>
              <Link href="/audiences" className="btn-outline px-6 py-3">
                Build an audience
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: "1 brief", v: "to a published page", bg: "bg-sand" },
              { k: "12 checks", v: "before publish", bg: "bg-sage" },
              { k: "0 tickets", v: "for an audience sync", bg: "bg-clay" },
              { k: "100%", v: "consent enforced in code", bg: "bg-sky" },
            ].map((s) => (
              <div key={s.k} className={`${s.bg} rounded-[6px] p-5`}>
                <p className="font-serif text-3xl">{s.k}</p>
                <p className="mt-1 text-sm text-ink-soft">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="font-serif text-3xl">How a landing page gets made</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {PIPELINE.map((p, i) => (
            <li key={p.step} className="card relative p-4">
              <span className="text-xs text-muted">0{i + 1}</span>
              <p className="mt-1 font-serif text-xl">{p.step}</p>
              <p className="mt-2 text-sm leading-snug text-ink-soft">{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-2">
          <Link href="/pages" className="card group p-6 transition hover:border-ink">
            <p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">Landing page service</p>
            <p className="mt-2 font-serif text-2xl">Brief → eval-gated page, with A/B variants</p>
            <p className="mt-2 text-sm text-ink-soft">For blog, newsroom, lifecycle and paid teams. Edit inline and the evals re-run as you type. Publishing is blocked until they pass.</p>
            <span className="mt-4 inline-block text-sm font-medium underline-offset-4 group-hover:underline">Open the studio →</span>
          </Link>
          <Link href="/audiences" className="card group p-6 transition hover:border-ink">
            <p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">Self-serve audiences</p>
            <p className="mt-2 font-serif text-2xl">Plain English → validated rule → Braze, Meta, Google</p>
            <p className="mt-2 text-sm text-ink-soft">Claude proposes, the data contract decides. See size, reach and SQL, then build the destination payload with consent applied.</p>
            <span className="mt-4 inline-block text-sm font-medium underline-offset-4 group-hover:underline">Open audiences →</span>
          </Link>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="font-serif text-3xl">Design principles</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((p) => (
              <div key={p.title}>
                <p className="font-serif text-xl">{p.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
