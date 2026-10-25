import { TESTIMONIALS, type Icon, type Palette } from "@/lib/landing/catalog";
import { CATEGORY_LABELS, LOCALE_CONFIG, TESTIMONIAL_TRANSLATIONS } from "@/lib/landing/locale";
import type { PageSpec } from "@/lib/landing/schema";

// Hero palettes built from Faire's accent colours (burgundy, olive, butter, peach) on its warm neutrals.
const PALETTE: Record<Palette, { bg: string; a: string; b: string; c: string }> = {
  sand: { bg: "#f3ece3", a: "#ffd0b6", b: "#41252a", c: "#fbf8f6" },
  sage: { bg: "#e7e8d2", a: "#595604", b: "#41252a", c: "#f1f29f" },
  clay: { bg: "#ffd0b6", a: "#41252a", b: "#595604", c: "#fbf8f6" },
  sky: { bg: "#f1f29f", a: "#595604", b: "#41252a", c: "#ffffff" },
  ink: { bg: "#41252a", a: "#ffd0b6", b: "#f1f29f", c: "#5a3a40" },
};

const TILE = ["#f1f29f", "#ffd0b6", "#e7e8d2", "#f3ece3"];

function IconGlyph({ icon }: { icon: Icon }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<Icon, React.ReactNode> = {
    terms: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="2" {...common} />
        <path d="M3 10h18M8 3v4M16 3v4" {...common} />
      </>
    ),
    returns: <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" {...common} />,
    discover: (
      <>
        <circle cx="11" cy="11" r="7" {...common} />
        <path d="m20 20-3.5-3.5" {...common} />
      </>
    ),
    shipping: (
      <>
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" {...common} />
        <circle cx="7" cy="18" r="1.5" {...common} />
        <circle cx="17" cy="18" r="1.5" {...common} />
      </>
    ),
    insights: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...common} />,
    community: (
      <>
        <circle cx="9" cy="8" r="3" {...common} />
        <circle cx="17" cy="9" r="2.5" {...common} />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 5.5 2.2 5.5 5.5" {...common} />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      {paths[icon]}
    </svg>
  );
}

function HeroVisual({ palette, alt }: { palette: Palette; alt: string }) {
  const p = PALETTE[palette];
  return (
    <svg viewBox="0 0 480 400" role="img" aria-label={alt} className="h-full w-full">
      <rect width="480" height="400" fill={p.bg} />
      <rect x="40" y="250" width="400" height="14" rx="2" fill={p.b} opacity="0.35" />
      <path d="M90 250V150a50 50 0 0 1 100 0v100z" fill={p.a} />
      <rect x="210" y="170" width="70" height="80" rx="8" fill={p.c} stroke={p.b} strokeOpacity="0.3" />
      <rect x="228" y="150" width="34" height="22" rx="4" fill={p.b} />
      <circle cx="345" cy="205" r="45" fill={p.b} opacity="0.85" />
      <ellipse cx="345" cy="205" rx="18" ry="45" fill={p.a} opacity="0.6" />
      <rect x="70" y="285" width="120" height="70" rx="6" fill={p.c} />
      <rect x="205" y="300" width="90" height="55" rx="6" fill={p.a} opacity="0.7" />
      <rect x="310" y="290" width="110" height="65" rx="6" fill={p.c} />
      <circle cx="400" cy="70" r="26" fill={p.c} opacity="0.8" />
    </svg>
  );
}

function Cta({ label, dark, href }: { label: string; dark?: boolean; href?: string }) {
  return (
    <a
      href={href}
      target={href ? "_blank" : undefined}
      rel="noreferrer"
      className={`inline-flex h-12 items-center rounded-[4px] border px-5 text-sm transition ${
        dark ? "border-line bg-white text-ink hover:bg-cream" : "border-ink bg-ink text-white hover:bg-black"
      }`}
    >
      {label}
    </a>
  );
}

export function LandingPage({ spec, interactive = false }: { spec: PageSpec; interactive?: boolean }) {
  const locale = spec.brief.locale ?? "en-US";
  const ui = LOCALE_CONFIG[locale].ui;
  const t = TESTIMONIALS[spec.testimonialId];
  const quote = locale === "fr-FR" || locale === "de-DE" ? TESTIMONIAL_TRANSLATIONS[locale][spec.testimonialId] : t.quote;
  const href = interactive ? spec.ctaUrl : undefined;
  return (
    <div lang={locale} className="@container bg-white text-ink">
      <section className="grid items-center gap-8 bg-cream px-6 py-12 @3xl:grid-cols-2 @3xl:px-12 @3xl:py-16">
        <div>
          <p className="mb-4 text-sm text-ink-soft">{spec.hero.eyebrow}</p>
          <h1 className="font-serif text-[38px] leading-[46px] @3xl:text-[52px] @3xl:leading-[64px]">{spec.hero.headline}</h1>
          <p className="mt-4 max-w-md text-base leading-6">{spec.hero.subhead}</p>
          <div className="mt-8">
            <Cta label={spec.hero.ctaLabel} href={href} />
          </div>
        </div>
        <div className="aspect-[6/5] overflow-hidden">
          <HeroVisual palette={spec.hero.palette} alt={spec.hero.imageAlt} />
        </div>
      </section>

      <section className="border-t border-line px-6 py-12 @3xl:px-12">
        <div className="grid gap-8 @3xl:grid-cols-3">
          {spec.valueProps.map((v, i) => (
            <div key={i}>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-cream">
                <IconGlyph icon={v.icon} />
              </div>
              <h3 className="text-lg leading-[26px] font-medium">{v.title}</h3>
              <p className="mt-2 text-sm leading-5 text-ink-soft">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line px-6 py-12 @3xl:px-12">
        <h2 className="mb-6 font-serif text-[30px] leading-[38px]">{ui.categories}</h2>
        <div className={`grid grid-cols-2 gap-4 ${spec.categories.length === 3 ? "@3xl:grid-cols-3" : "@3xl:grid-cols-4"}`}>
          {spec.categories.map((c, i) => (
            // Faire's product-card pattern: square image, medium-weight name, muted secondary line.
            <div key={c.name}>
              <div className="flex aspect-square items-center justify-center" style={{ background: TILE[i % TILE.length] }}>
                <span className="px-4 text-center font-serif text-[30px] leading-[38px]">{CATEGORY_LABELS[locale][c.name]}</span>
              </div>
              <p className="mt-3 text-sm leading-5 font-medium">{CATEGORY_LABELS[locale][c.name]}</p>
              <p className="text-sm leading-5 text-ink-soft">{c.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-cream px-6 py-16 text-center @3xl:px-12">
        <blockquote className="mx-auto max-w-3xl font-serif text-[30px] leading-[38px] @3xl:text-[38px] @3xl:leading-[50px]">“{quote}”</blockquote>
        <p className="mt-5 text-sm text-ink-soft">
          {t.name}, {t.store} · {t.city}
        </p>
      </section>

      <section className="border-t border-line px-6 py-12 @3xl:px-12">
        <h2 className="mb-6 font-serif text-[30px] leading-[38px]">{ui.faq}</h2>
        <div className="divide-y divide-line border-y border-line">
          {spec.faq.map((f, i) => (
            <details key={i} className="group py-4" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between text-base font-medium">
                {f.question}
                <span className="ml-4 text-xl text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-burgundy px-6 py-16 text-center text-white @3xl:px-12">
        <h2 className="mx-auto max-w-xl font-serif text-[38px] leading-[50px]">{spec.closing.headline}</h2>
        <div className="mt-7">
          <Cta label={spec.closing.ctaLabel} href={href} dark />
        </div>
      </section>
    </div>
  );
}
