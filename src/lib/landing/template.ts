import { CATEGORIES, type Category } from "./catalog";
import { claimViolations } from "./evals";
import type { Locale } from "./locale";
import type { Brief, PageCopy } from "./schema";

// The defined failure mode: a deterministic, pre-approved page built only from the brief.
// It is always on-brand and always passes blocking evals, so a marketer is never left with nothing.
// Each market has its own reviewed copy; nothing here is machine-translated at request time.

const DEFAULT_CATEGORIES: Record<Brief["audience"], Category[]> = {
  retailer: ["Home Decor", "Candles & Fragrance", "Paper & Stationery"],
  brand: ["Jewelry", "Beauty & Wellness", "Food & Drink"],
};

type AudienceText = Omit<PageCopy, "categories" | "testimonialId" | "hero"> & {
  hero: Omit<PageCopy["hero"], "destination" | "palette">;
};
type MarketText = { blurbs: Record<Category, string>; retailer: AudienceText; brand: AudienceText };

const EN: MarketText = {
  blurbs: {
    "Home Decor": "Ceramics, textiles and objects from independent makers.",
    Jewelry: "Everyday pieces and statement styles from small studios.",
    "Food & Drink": "Pantry goods, snacks and sips customers come back for.",
    "Beauty & Wellness": "Clean skincare, bath and self-care essentials.",
    "Kids & Baby": "Thoughtful toys, clothing and nursery finds.",
    "Women's Apparel": "Seasonal styles from emerging labels.",
    "Paper & Stationery": "Cards, notebooks and desk goods that sell year-round.",
    "Pet Supplies": "Treats, toys and accessories for furry regulars.",
    "Candles & Fragrance": "Hand-poured candles and home scents.",
    "Gifts & Novelty": "Easy-to-merchandise gifts for every occasion.",
  },
  retailer: {
    metaTitle: "Wholesale for independent retailers | Faire",
    metaDescription: "Discover unique products from independent brands and stock your shop with flexible terms on Faire.",
    hero: {
      eyebrow: "Wholesale, made simple",
      headline: "Find products your customers will love",
      subhead: "Shop thousands of independent brands in one place.",
      ctaLabel: "Start shopping",
      imageAlt: "A bright independent shop with shelves of ceramics, candles and cards",
    },
    valueProps: [
      { icon: "discover", title: "Discover new makers", body: "Browse brands you won't find at big-box stores, curated for independent shops." },
      { icon: "terms", title: "Pay on your schedule", body: "Eligible retailers can use flexible payment terms so cash stays in the business." },
      { icon: "returns", title: "Try new lines with less risk", body: "Eligible opening orders come with free returns, so you can test what sells." },
    ],
    faq: [
      { question: "Who can shop on Faire?", answer: "Independent retailers with a physical or online shop can apply for a wholesale account." },
      { question: "Are there order minimums?", answer: "Each brand sets its own minimum, and many start low so you can try small batches." },
      { question: "How do payment terms work?", answer: "Eligible retailers can pay later on approved orders. Terms are shown at checkout." },
    ],
    closing: { headline: "Your next bestseller is waiting", ctaLabel: "Create an account" },
  },
  brand: {
    metaTitle: "Sell wholesale to independent retailers | Faire",
    metaDescription: "Reach independent retailers worldwide and grow your wholesale business with Faire.",
    hero: {
      eyebrow: "For brands",
      headline: "Grow your wholesale business",
      subhead: "Get your products in front of independent retailers around the world.",
      ctaLabel: "Apply to sell",
      imageAlt: "A maker packing handmade goods into boxes at a sunny studio workbench",
    },
    valueProps: [
      { icon: "community", title: "Reach new retailers", body: "Independent shops discover your brand through search, recommendations and markets." },
      { icon: "insights", title: "Know what's working", body: "See which products and shops drive reorders so you can plan production." },
      { icon: "shipping", title: "Spend less time on ops", body: "Orders, invoicing and payments live in one place, so you can focus on making." },
    ],
    faq: [
      { question: "Who can sell on Faire?", answer: "Independent brands that make or design their own products can apply." },
      { question: "How do I get paid?", answer: "Payouts are sent on a regular schedule once orders ship, so you aren't chasing invoices." },
      { question: "Can I bring my existing retailers?", answer: "Yes. You can invite the shops you already work with to order from you on Faire." },
    ],
    closing: { headline: "Bring your brand to more shops", ctaLabel: "Get started" },
  },
};

const FR: MarketText = {
  blurbs: {
    "Home Decor": "Céramiques, textiles et objets de créateurs indépendants.",
    Jewelry: "Pièces du quotidien et bijoux forts de petits ateliers.",
    "Food & Drink": "Épicerie, douceurs et boissons que vos clients rachètent.",
    "Beauty & Wellness": "Soins naturels, bain et essentiels bien-être.",
    "Kids & Baby": "Jouets, vêtements et déco de chambre bien pensés.",
    "Women's Apparel": "Les collections de saison de jeunes labels.",
    "Paper & Stationery": "Cartes, carnets et papeterie qui se vendent toute l'année.",
    "Pet Supplies": "Friandises, jouets et accessoires pour les animaux.",
    "Candles & Fragrance": "Bougies coulées à la main et parfums d'intérieur.",
    "Gifts & Novelty": "Des cadeaux faciles à mettre en avant, pour toutes les occasions.",
  },
  retailer: {
    metaTitle: "La vente en gros pour les boutiques | Faire",
    metaDescription: "Découvrez des produits uniques de marques indépendantes et approvisionnez votre boutique avec Faire.",
    hero: {
      eyebrow: "Le gros, en toute simplicité",
      headline: "Des produits que vos clients vont adorer",
      subhead: "Des milliers de marques indépendantes, réunies pour votre boutique.",
      ctaLabel: "Commencer",
      imageAlt: "Une boutique lumineuse avec des étagères de céramiques, de bougies et de cartes",
    },
    valueProps: [
      { icon: "discover", title: "De nouveaux créateurs", body: "Des marques introuvables dans les grandes enseignes, choisies pour les boutiques indépendantes." },
      { icon: "terms", title: "Payez à votre rythme", body: "Les boutiques éligibles profitent de conditions de paiement souples pour préserver leur trésorerie." },
      { icon: "returns", title: "Testez en toute sérénité", body: "Sur une première commande éligible, les retours sont gratuits : testez ce qui se vend." },
    ],
    faq: [
      { question: "Qui peut acheter sur Faire ?", answer: "Les boutiques indépendantes, physiques ou en ligne, peuvent demander un compte professionnel." },
      { question: "Y a-t-il un minimum de commande ?", answer: "Chaque marque fixe son propre minimum, souvent bas pour commander de petites quantités." },
      { question: "Comment fonctionnent les conditions de paiement ?", answer: "Les boutiques éligibles peuvent payer plus tard les commandes approuvées. Les conditions sont indiquées au paiement." },
    ],
    closing: { headline: "Votre prochain best-seller vous attend", ctaLabel: "Créer un compte" },
  },
  brand: {
    metaTitle: "Vendez en gros aux boutiques | Faire",
    metaDescription: "Touchez des boutiques indépendantes partout dans le monde et développez votre activité de gros avec Faire.",
    hero: {
      eyebrow: "Pour les marques",
      headline: "Développez vos ventes en gros",
      subhead: "Présentez vos produits aux boutiques indépendantes du monde entier.",
      ctaLabel: "Devenir vendeur",
      imageAlt: "Une créatrice emballe des objets faits main dans un atelier ensoleillé",
    },
    valueProps: [
      { icon: "community", title: "De nouvelles boutiques", body: "Les boutiques découvrent votre marque grâce à la recherche, aux recommandations et aux salons." },
      { icon: "insights", title: "Ce qui marche, en clair", body: "Voyez quels produits et quelles boutiques recommandent pour planifier votre production." },
      { icon: "shipping", title: "Moins de logistique", body: "Commandes, factures et paiements au même endroit, pour vous consacrer à la création." },
    ],
    faq: [
      { question: "Qui peut vendre sur Faire ?", answer: "Les marques indépendantes qui fabriquent ou conçoivent leurs propres produits peuvent postuler." },
      { question: "Comment suis-je payé ?", answer: "Les versements sont effectués régulièrement après l'expédition, sans relance de factures." },
      { question: "Puis-je inviter mes boutiques actuelles ?", answer: "Oui. Vous pouvez inviter les boutiques avec lesquelles vous travaillez à commander sur Faire." },
    ],
    closing: { headline: "Votre marque dans plus de boutiques", ctaLabel: "Commencer" },
  },
};

const DE: MarketText = {
  blurbs: {
    "Home Decor": "Keramik, Textilien und Objekte von unabhängigen Marken.",
    Jewelry: "Alltagsstücke und Statement-Schmuck aus kleinen Ateliers.",
    "Food & Drink": "Feinkost, Snacks und Getränke für die Stammkundschaft.",
    "Beauty & Wellness": "Natürliche Pflege, Bad und Wohlfühl-Essentials.",
    "Kids & Baby": "Durchdachtes Spielzeug, Kleidung und Deko für das Kinderzimmer.",
    "Women's Apparel": "Saisonale Mode von jungen Labels.",
    "Paper & Stationery": "Karten, Notizbücher und Schreibwaren für das ganze Jahr.",
    "Pet Supplies": "Leckerlis, Spielzeug und Zubehör für Vierbeiner.",
    "Candles & Fragrance": "Handgegossene Kerzen und Raumdüfte.",
    "Gifts & Novelty": "Geschenkideen, die sich leicht präsentieren lassen.",
  },
  retailer: {
    metaTitle: "Großhandel für unabhängige Läden | Faire",
    metaDescription: "Entdecken Sie einzigartige Produkte unabhängiger Marken und bestücken Sie Ihren Laden mit Faire.",
    hero: {
      eyebrow: "Großhandel, ganz einfach",
      headline: "Produkte, die Ihre Kunden lieben",
      subhead: "Tausende unabhängige Marken für Ihren Laden, an einem Ort.",
      ctaLabel: "Jetzt starten",
      imageAlt: "Ein heller Laden mit Regalen voller Keramik, Kerzen und Karten",
    },
    valueProps: [
      { icon: "discover", title: "Neue Marken entdecken", body: "Marken, die es nicht bei großen Ketten gibt, ausgewählt für unabhängige Läden." },
      { icon: "terms", title: "Zahlen Sie flexibel", body: "Berechtigte Händler nutzen flexible Zahlungsbedingungen und schonen ihre Liquidität." },
      { icon: "returns", title: "Neues mit weniger Risiko", body: "Für berechtigte Erstbestellungen sind Rücksendungen kostenlos. Testen Sie, was sich verkauft." },
    ],
    faq: [
      { question: "Wer kann auf Faire einkaufen?", answer: "Unabhängige Läden mit Ladengeschäft oder Onlineshop können ein Händlerkonto beantragen." },
      { question: "Gibt es Mindestbestellwerte?", answer: "Jede Marke legt ihren eigenen Mindestbestellwert fest, oft niedrig für kleine Mengen." },
      { question: "Wie funktionieren die Zahlungsbedingungen?", answer: "Berechtigte Händler zahlen genehmigte Bestellungen später. Die Bedingungen sehen Sie an der Kasse." },
    ],
    closing: { headline: "Ihr nächster Bestseller wartet", ctaLabel: "Konto erstellen" },
  },
  brand: {
    metaTitle: "Großhandel an unabhängige Läden | Faire",
    metaDescription: "Erreichen Sie unabhängige Händler weltweit und bauen Sie Ihr Großhandelsgeschäft mit Faire aus.",
    hero: {
      eyebrow: "Für Marken",
      headline: "Wachsen Sie im Großhandel",
      subhead: "Bringen Sie Ihre Produkte zu unabhängigen Läden auf der ganzen Welt.",
      ctaLabel: "Jetzt bewerben",
      imageAlt: "Eine Designerin verpackt Handgemachtes in einer sonnigen Werkstatt",
    },
    valueProps: [
      { icon: "community", title: "Neue Händler erreichen", body: "Läden finden Ihre Marke über die Suche, Empfehlungen und Messen." },
      { icon: "insights", title: "Sehen, was funktioniert", body: "Erkennen Sie, welche Produkte und Läden nachbestellen, und planen Sie Ihre Produktion." },
      { icon: "shipping", title: "Weniger Aufwand", body: "Bestellungen, Rechnungen und Zahlungen an einem Ort, damit Sie sich auf Ihre Produkte konzentrieren." },
    ],
    faq: [
      { question: "Wer kann auf Faire verkaufen?", answer: "Unabhängige Marken, die ihre eigenen Produkte herstellen oder entwerfen, können sich bewerben." },
      { question: "Wie werde ich bezahlt?", answer: "Auszahlungen erfolgen regelmäßig nach dem Versand, ohne dass Sie Rechnungen hinterherlaufen." },
      { question: "Kann ich meine bestehenden Händler einladen?", answer: "Ja. Sie können die Läden, mit denen Sie schon arbeiten, zum Bestellen auf Faire einladen." },
    ],
    closing: { headline: "Ihre Marke in mehr Läden", ctaLabel: "Los geht's" },
  },
};

// Reviewed alternate headlines so a B variant exists even in template mode.
const B_HEADLINES: Record<Locale, Record<Brief["audience"], string>> = {
  "en-US": { retailer: "Stock up now, pay on your schedule", brand: "Let independent shops find you" },
  "en-GB": { retailer: "Stock up now, pay on your schedule", brand: "Let independent shops find you" },
  "fr-FR": { retailer: "Remplissez vos rayons, payez à votre rythme", brand: "Laissez les boutiques vous trouver" },
  "de-DE": { retailer: "Jetzt bestücken, flexibel zahlen", brand: "Lassen Sie sich von Läden finden" },
};

// Featured-brand hero, by market. It names the brand and says nothing else about it.
const FEATURED: Record<Locale, (name: string) => { eyebrow: string; headline: string; ctaLabel: string }> = {
  "en-US": (n) => ({ eyebrow: "Now on Faire", headline: `Stock ${n} in your shop`, ctaLabel: "Shop wholesale" }),
  "en-GB": (n) => ({ eyebrow: "Now on Faire", headline: `Stock ${n} in your shop`, ctaLabel: "Shop wholesale" }),
  "fr-FR": (n) => ({ eyebrow: "Disponible sur Faire", headline: `Proposez ${n} en boutique`, ctaLabel: "Voir la marque" }),
  "de-DE": (n) => ({ eyebrow: "Jetzt auf Faire", headline: `${n} für Ihren Laden`, ctaLabel: "Marke ansehen" }),
};

const MARKETS: Record<Locale, MarketText> = { "en-US": EN, "en-GB": EN, "fr-FR": FR, "de-DE": DE };

// Drop the offer rather than truncate mid-sentence when it would overflow the subhead slot.
const fit = (base: string, extra: string) => (base.length + extra.length <= 160 ? base + extra : base);

export function templateCopy(brief: Brief, variant: "A" | "B" = "A"): PageCopy {
  const market = MARKETS[brief.locale];
  const text = market[brief.audience];
  const picked = [...brief.focusCategories, ...DEFAULT_CATEGORIES[brief.audience], ...CATEGORIES]
    .filter((c, i, a) => a.indexOf(c) === i)
    .slice(0, 3);

  // The brief is untrusted input: only carry the offer over if it passes the same claim checks.
  // Offers are written in English, so other markets keep the reviewed subhead as is.
  const offer = brief.offer.trim();
  const useOffer = offer && brief.locale.startsWith("en") && claimViolations(offer, brief.locale).length === 0;
  const offerLine = useOffer ? ` ${offer.replace(/\.?$/, ".")}` : "";

  const b = variant === "B";
  const featured = brief.featuredBrand && brief.audience === "retailer" ? FEATURED[brief.locale](brief.featuredBrand.name) : null;
  // Deep copy: callers may edit the page, and must never mutate the shared reviewed copy.
  return structuredClone({
    ...text,
    hero: {
      ...text.hero,
      ...(featured && { eyebrow: featured.eyebrow, ctaLabel: featured.ctaLabel }),
      headline: featured ? featured.headline : b ? B_HEADLINES[brief.locale][brief.audience] : text.hero.headline,
      subhead: fit(text.hero.subhead, offerLine),
      destination: featured ? "brand_storefront" : brief.audience === "retailer" ? "retailer_signup" : "brand_signup",
      palette: b ? "clay" : brief.audience === "retailer" ? "sand" : "sage",
    },
    // B leads with a different benefit, which is the main thing the test learns about.
    valueProps: b ? [text.valueProps[1], text.valueProps[0], text.valueProps[2]] : text.valueProps,
    categories: picked.map((name) => ({ name, blurb: market.blurbs[name] })),
    testimonialId: brief.audience === "retailer" ? "t_home_portland" : "t_brand_candles",
  } satisfies PageCopy);
}
