import { CATEGORIES, type Category } from "./catalog";
import { claimViolations } from "./evals";
import type { Brief, PageCopy } from "./schema";

// The defined failure mode: a deterministic, pre-approved page built only from the brief.
// It is always on-brand and always passes blocking evals, so a marketer is never left with nothing.

const DEFAULT_CATEGORIES: Record<Brief["audience"], Category[]> = {
  retailer: ["Home Decor", "Candles & Fragrance", "Paper & Stationery"],
  brand: ["Jewelry", "Beauty & Wellness", "Food & Drink"],
};

const BLURBS: Record<Category, string> = {
  "Home Decor": "Ceramics, textiles and objects from independent makers.",
  Jewelry: "Everyday pieces and statement styles from small studios.",
  "Food & Drink": "Pantry goods, snacks and sips customers come back for.",
  "Beauty & Wellness": "Clean skincare, bath and self-care essentials.",
  "Kids & Baby": "Thoughtful toys, apparel and nursery finds.",
  "Women's Apparel": "Seasonal styles from emerging labels.",
  "Paper & Stationery": "Cards, notebooks and desk goods that sell year-round.",
  "Pet Supplies": "Treats, toys and accessories for furry regulars.",
  "Candles & Fragrance": "Hand-poured candles and home scents.",
  "Gifts & Novelty": "Easy-to-merchandise gifts for every occasion.",
};

// Drop the offer rather than truncate mid-sentence when it would overflow the subhead slot.
const fit = (base: string, extra: string) => (base.length + extra.length <= 160 ? base + extra : base);

export function templateCopy(brief: Brief): PageCopy {
  const picked = [...brief.focusCategories, ...DEFAULT_CATEGORIES[brief.audience], ...CATEGORIES]
    .filter((c, i, a) => a.indexOf(c) === i)
    .slice(0, 3);
  const categories = picked.map((name) => ({ name, blurb: BLURBS[name] }));
  // The brief is untrusted input: only carry the offer over if it passes the same claim checks.
  const offer = brief.offer.trim();
  const offerLine = offer && claimViolations(offer).length === 0 ? ` ${offer.replace(/\.?$/, ".")}` : "";

  if (brief.audience === "retailer") {
    return {
      metaTitle: "Wholesale for independent retailers | Faire",
      metaDescription: "Discover unique products from independent brands and stock your shop with flexible terms on Faire.",
      hero: {
        eyebrow: "Wholesale, made simple",
        headline: "Find products your customers will love",
        subhead: fit("Shop thousands of independent brands in one place.", offerLine),
        ctaLabel: "Start shopping",
        destination: "retailer_signup",
        imageAlt: "A bright independent shop with shelves of ceramics, candles and cards",
        palette: "sand",
      },
      valueProps: [
        { icon: "discover", title: "Discover new makers", body: "Browse brands you won't find at big-box stores, curated for independent shops." },
        { icon: "terms", title: "Pay on your schedule", body: "Eligible retailers can use flexible payment terms so cash stays in the business." },
        { icon: "returns", title: "Try new lines with less risk", body: "Eligible opening orders come with free returns, so you can test what sells." },
      ],
      categories,
      testimonialId: "t_home_portland",
      faq: [
        { question: "Who can shop on Faire?", answer: "Independent retailers with a physical or online store can apply for a wholesale account." },
        { question: "Are there order minimums?", answer: "Each brand sets its own minimum, and many start low so you can try small batches." },
        { question: "How do payment terms work?", answer: "Eligible retailers can pay later on approved orders. Terms are shown at checkout." },
      ],
      closing: { headline: "Your next bestseller is waiting", ctaLabel: "Create an account" },
    };
  }

  return {
    metaTitle: "Sell wholesale to independent retailers | Faire",
    metaDescription: "Reach independent retailers worldwide and grow your wholesale business with Faire.",
    hero: {
      eyebrow: "For brands",
      headline: "Grow your wholesale business",
      subhead: fit("Get your products in front of independent retailers around the world.", offerLine),
      ctaLabel: "Apply to sell",
      destination: "brand_signup",
      imageAlt: "A maker packing handmade goods into boxes at a sunny studio workbench",
      palette: "sage",
    },
    valueProps: [
      { icon: "community", title: "Reach new retailers", body: "Independent shops discover your brand through search, recommendations and markets." },
      { icon: "insights", title: "Know what's working", body: "See which products and stores drive reorders so you can plan production." },
      { icon: "shipping", title: "Spend less time on ops", body: "Orders, invoicing and payments live in one place, so you can focus on making." },
    ],
    categories,
    testimonialId: "t_brand_candles",
    faq: [
      { question: "Who can sell on Faire?", answer: "Independent brands that make or design their own products can apply." },
      { question: "How do I get paid?", answer: "Payouts are sent on a regular schedule once orders ship, so you aren't chasing invoices." },
      { question: "Can I bring my existing retailers?", answer: "Yes. You can invite the stores you already work with to order from you on Faire." },
    ],
    closing: { headline: "Bring your brand to more shops", ctaLabel: "Get started" },
  };
}
