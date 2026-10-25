import type { Category, TestimonialId } from "./catalog";

// Market configuration. Claim rules are per language because compliance review is per market:
// a translated "guaranteed" is still a guarantee.

export const LOCALES = ["en-US", "en-GB", "fr-FR", "de-DE"] as const;
export type Locale = (typeof LOCALES)[number];

type ClaimRule = { re: RegExp; why: string };
type QualifiedRule = { claim: RegExp; qualifier: RegExp; name: string };

type LocaleConfig = {
  label: string;
  flag: string;
  language: string;
  currency: { symbol: string; code: string };
  pathPrefix: string;
  promptNotes: string;
  banned: ClaimRule[];
  qualified: QualifiedRule[];
  // Function words used to check the copy is actually in this language.
  stopwords: string[];
  // Other currency symbols that must not appear in this market's copy.
  foreignCurrency: RegExp;
  ui: { categories: string; faq: string };
};

const EN_BANNED: ClaimRule[] = [
  { re: /\bguarantee(d|s)?\b/i, why: "guarantee language" },
  { re: /\brisk[- ]free\b/i, why: "risk-free claim" },
  { re: /#1|\bnumber one\b/i, why: "unsubstantiated #1 claim" },
  { re: /\bbest in the world\b/i, why: "superlative claim" },
  { re: /\bcheapest\b/i, why: "price superlative" },
  { re: /\b100%/i, why: "absolute claim" },
  { re: /\bno fees\b|\bfee[- ]free\b/i, why: "fee claim" },
  { re: /\bunlimited\b/i, why: "unlimited claim" },
  { re: /\bovernight\b/i, why: "outcome-timing claim" },
];

const EN_QUALIFIED: QualifiedRule[] = [
  { claim: /\bfree shipping\b|\bfree delivery\b/i, qualifier: /\b(minimum|qualifying|eligible|over [$£€])/i, name: "free shipping" },
  { claim: /\bfree returns\b/i, qualifier: /\b(opening order|eligible|first order)/i, name: "free returns" },
  { claim: /\bnet ?60\b/i, qualifier: /\b(eligible|approved|qualifying|terms)/i, name: "Net 60" },
];

const EN_STOP = ["the", "and", "your", "for", "with", "you", "to", "of", "in", "from"];

export const LOCALE_CONFIG: Record<Locale, LocaleConfig> = {
  "en-US": {
    label: "United States",
    flag: "US",
    language: "American English",
    currency: { symbol: "$", code: "USD" },
    pathPrefix: "",
    promptNotes: "Use American spelling and US dollars.",
    banned: EN_BANNED,
    qualified: EN_QUALIFIED,
    stopwords: EN_STOP,
    foreignCurrency: /[£€]/,
    ui: { categories: "Shop by category", faq: "Questions, answered" },
  },
  "en-GB": {
    label: "United Kingdom",
    flag: "GB",
    language: "British English",
    currency: { symbol: "£", code: "GBP" },
    pathPrefix: "/en-gb",
    promptNotes: "Use British spelling (colour, favourite, organise, centre, catalogue) and pounds sterling. Prefer 'shop' over 'store', 'delivery' over 'shipping'.",
    banned: EN_BANNED,
    qualified: EN_QUALIFIED,
    stopwords: EN_STOP,
    foreignCurrency: /[$€]/,
    ui: { categories: "Shop by category", faq: "Questions, answered" },
  },
  "fr-FR": {
    label: "France",
    flag: "FR",
    language: "French (France)",
    currency: { symbol: "€", code: "EUR" },
    pathPrefix: "/fr-fr",
    promptNotes: "Write natural French for French shop owners, not a literal translation. Use 'vous'. Euros, with the € sign after the number.",
    banned: [
      { re: /\bgaranti(e|s|es)?\b/i, why: "guarantee language (garanti)" },
      { re: /\bsans risque\b/i, why: "risk-free claim (sans risque)" },
      { re: /n[°o] ?1\b|\bnuméro un\b/i, why: "unsubstantiated #1 claim" },
      { re: /\ble moins cher\b|\bles moins chers\b/i, why: "price superlative" },
      { re: /\b100 ?%/i, why: "absolute claim" },
      { re: /\bsans frais\b/i, why: "fee claim (sans frais)" },
      { re: /\billimité(e|s|es)?\b/i, why: "unlimited claim (illimité)" },
    ],
    qualified: [
      { claim: /\blivraison gratuite\b/i, qualifier: /(éligible|à partir de|minimum|admissible)/i, name: "livraison gratuite" },
      { claim: /\bretours?\b[^.]{0,25}\bgratuits?\b/i, qualifier: /(première commande|éligible|admissible)/i, name: "retours gratuits" },
      { claim: /\b60 jours\b/i, qualifier: /(éligible|approuvé|admissible|conditions)/i, name: "paiement à 60 jours" },
    ],
    stopwords: ["le", "la", "les", "des", "et", "vous", "pour", "votre", "vos", "de", "du", "en", "avec"],
    foreignCurrency: /[$£]/,
    ui: { categories: "Parcourir par catégorie", faq: "Vos questions, nos réponses" },
  },
  "de-DE": {
    label: "Germany",
    flag: "DE",
    language: "German (Germany)",
    currency: { symbol: "€", code: "EUR" },
    pathPrefix: "/de-de",
    promptNotes: "Write natural German for German shop owners using 'Sie'. German runs long: keep headlines short to fit the same layout. Euros, with the € sign after the number.",
    banned: [
      { re: /\bgarantiert\b|\bgarantie\b/i, why: "guarantee language (garantiert)" },
      { re: /\brisikofrei\b|\bohne risiko\b/i, why: "risk-free claim (risikofrei)" },
      { re: /\bnr\. ?1\b|\bnummer eins\b/i, why: "unsubstantiated #1 claim" },
      { re: /\bam günstigsten\b|\bbilligste[nr]?\b/i, why: "price superlative" },
      { re: /\b100 ?%/i, why: "absolute claim" },
      { re: /\bgebührenfrei\b|\bkeine gebühren\b/i, why: "fee claim (gebührenfrei)" },
      { re: /\bunbegrenzt(e|en|er)?\b/i, why: "unlimited claim (unbegrenzt)" },
    ],
    qualified: [
      { claim: /\bkostenlose[nr]? versand\b|\bgratisversand\b|\bversandkostenfrei\b/i, qualifier: /(\bab\b|berechtigt|qualifizierend|mindest)/i, name: "kostenloser Versand" },
      { claim: /\bkostenlose[n]? (rücksendung|retoure)|(rücksendung|retoure)(en|n)?\b[^.]{0,25}\bkostenlos\b/i, qualifier: /(erstbestellung|berechtigt|qualifizierend)/i, name: "kostenlose Rücksendungen" },
      { claim: /\b60 tage\b|\b60 tagen\b/i, qualifier: /(berechtigt|genehmigt|qualifizierend|bedingungen)/i, name: "60 Tage Zahlungsziel" },
    ],
    stopwords: ["der", "die", "das", "und", "sie", "für", "mit", "ihre", "ihren", "ihr", "zu", "den", "von", "in"],
    foreignCurrency: /[$£]/,
    ui: { categories: "Nach Kategorie stöbern", faq: "Häufige Fragen" },
  },
};

// US spellings that should not appear on en-GB pages.
export const US_SPELLINGS = /\b(color(s|ful)?|favorite(s)?|organiz(e|es|ed|ing|ation)|center(s)?|catalog(s)?|neighbor(s|hood)?|jewelry|personaliz(e|ed|ation)|customiz(e|ed|able))\b/i;

export const CATEGORY_LABELS: Record<Locale, Record<Category, string>> = {
  "en-US": {
    "Home Decor": "Home Decor",
    Jewelry: "Jewelry",
    "Food & Drink": "Food & Drink",
    "Beauty & Wellness": "Beauty & Wellness",
    "Kids & Baby": "Kids & Baby",
    "Women's Apparel": "Women's Apparel",
    "Paper & Stationery": "Paper & Stationery",
    "Pet Supplies": "Pet Supplies",
    "Candles & Fragrance": "Candles & Fragrance",
    "Gifts & Novelty": "Gifts & Novelty",
  },
  "en-GB": {
    "Home Decor": "Home Décor",
    Jewelry: "Jewellery",
    "Food & Drink": "Food & Drink",
    "Beauty & Wellness": "Beauty & Wellness",
    "Kids & Baby": "Kids & Baby",
    "Women's Apparel": "Womenswear",
    "Paper & Stationery": "Paper & Stationery",
    "Pet Supplies": "Pet Supplies",
    "Candles & Fragrance": "Candles & Fragrance",
    "Gifts & Novelty": "Gifts & Novelty",
  },
  "fr-FR": {
    "Home Decor": "Décoration",
    Jewelry: "Bijoux",
    "Food & Drink": "Épicerie fine",
    "Beauty & Wellness": "Beauté & bien-être",
    "Kids & Baby": "Enfant & bébé",
    "Women's Apparel": "Mode femme",
    "Paper & Stationery": "Papeterie",
    "Pet Supplies": "Animaux",
    "Candles & Fragrance": "Bougies & parfums",
    "Gifts & Novelty": "Idées cadeaux",
  },
  "de-DE": {
    "Home Decor": "Wohnaccessoires",
    Jewelry: "Schmuck",
    "Food & Drink": "Feinkost & Getränke",
    "Beauty & Wellness": "Beauty & Wellness",
    "Kids & Baby": "Kind & Baby",
    "Women's Apparel": "Damenmode",
    "Paper & Stationery": "Papeterie",
    "Pet Supplies": "Tierbedarf",
    "Candles & Fragrance": "Kerzen & Düfte",
    "Gifts & Novelty": "Geschenkideen",
  },
};

// Approved translations of the approved quotes. Translations are reviewed like originals.
export const TESTIMONIAL_TRANSLATIONS: Record<Exclude<Locale, "en-US" | "en-GB">, Record<TestimonialId, string>> = {
  "fr-FR": {
    t_home_portland: "Nous avons découvert des créateurs que nous n'aurions jamais rencontrés sur un salon, et les conditions de paiement nous permettent de tester de nouvelles gammes sans immobiliser notre trésorerie.",
    t_gift_austin: "Recommander prend quelques minutes. Ce temps, nous le consacrons à la boutique et à nos clients.",
    t_brand_candles: "Nos comptes de vente en gros ont triplé en un an, et nous ne courons plus après les factures.",
    t_brand_jewelry: "Des boutiques de villes où nous n'avions jamais vendu nous ont trouvés d'elles-mêmes.",
  },
  "de-DE": {
    t_home_portland: "Wir haben Marken entdeckt, die wir auf keiner Messe getroffen hätten, und dank der Zahlungsbedingungen können wir neue Linien testen, ohne Liquidität zu binden.",
    t_gift_austin: "Nachbestellen dauert nur Minuten. Diese Zeit gehört jetzt dem Laden und unseren Kundinnen und Kunden.",
    t_brand_candles: "Unsere Großhandelskunden haben sich in einem Jahr verdreifacht, und wir laufen keinen Rechnungen mehr hinterher.",
    t_brand_jewelry: "Läden in Städten, in denen wir nie verkauft hatten, haben uns von selbst gefunden.",
  },
};

export function languageScore(text: string, locale: Locale): number {
  const words = text.toLowerCase().match(/[a-zà-ÿß']+/g) ?? [];
  if (words.length === 0) return 0;
  const own = new Set(LOCALE_CONFIG[locale].stopwords);
  const others = new Set(LOCALES.filter((l) => LOCALE_CONFIG[l].stopwords !== LOCALE_CONFIG[locale].stopwords).flatMap((l) => LOCALE_CONFIG[l].stopwords));
  const hits = words.filter((w) => own.has(w)).length;
  const foreign = words.filter((w) => others.has(w) && !own.has(w)).length;
  return hits / Math.max(1, hits + foreign);
}
