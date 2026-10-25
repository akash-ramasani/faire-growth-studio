// Approved, code-owned content the model is allowed to reference but never invent.
// In production these would be read from the CMS / brand system, not hardcoded.

export const CATEGORIES = [
  "Home Decor",
  "Jewelry",
  "Food & Drink",
  "Beauty & Wellness",
  "Kids & Baby",
  "Women's Apparel",
  "Paper & Stationery",
  "Pet Supplies",
  "Candles & Fragrance",
  "Gifts & Novelty",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const ICONS = ["terms", "returns", "discover", "shipping", "insights", "community"] as const;
export type Icon = (typeof ICONS)[number];

export const PALETTES = ["sand", "sage", "clay", "sky", "ink"] as const;
export type Palette = (typeof PALETTES)[number];

// Destinations are an allowlist. The model picks one; code builds the URL + UTMs.
export const DESTINATIONS = {
  retailer_signup: { path: "/signup", label: "Retailer sign up", audience: "retailer" },
  brand_signup: { path: "/brand-portal/signup", label: "Brand sign up", audience: "brand" },
  category_browse: { path: "/category", label: "Browse category", audience: "retailer" },
  insider: { path: "/insider", label: "Faire Insider", audience: "retailer" },
  brand_referral: { path: "/brand-portal/referrals", label: "Brand referrals", audience: "brand" },
} as const;
export type DestinationKey = keyof typeof DESTINATIONS;
export const DESTINATION_KEYS = Object.keys(DESTINATIONS) as [DestinationKey, ...DestinationKey[]];

// Legal-approved quotes. LLMs must select by id; they cannot write testimonials.
export const TESTIMONIALS = {
  t_home_portland: {
    quote: "We found makers we never would have met at a trade show, and the terms let us test new lines without tying up cash.",
    name: "Sample Owner A",
    store: "Sample Home Goods",
    city: "Portland, OR",
    audience: "retailer",
  },
  t_gift_austin: {
    quote: "Reordering takes minutes. That time goes back into the shop floor and our customers.",
    name: "Sample Owner B",
    store: "Sample Gift Shop",
    city: "Austin, TX",
    audience: "retailer",
  },
  t_brand_candles: {
    quote: "Our wholesale accounts tripled in a year, and we stopped chasing invoices.",
    name: "Sample Founder C",
    store: "Sample Candle Co.",
    city: "Brooklyn, NY",
    audience: "brand",
  },
  t_brand_jewelry: {
    quote: "Retailers in cities we'd never sold to found us on their own.",
    name: "Sample Founder D",
    store: "Sample Jewelry Studio",
    city: "Toronto, ON",
    audience: "brand",
  },
} as const;
export type TestimonialId = keyof typeof TESTIMONIALS;
export const TESTIMONIAL_IDS = Object.keys(TESTIMONIALS) as [TestimonialId, ...TestimonialId[]];

export const CHANNELS = ["paid_social", "paid_search", "lifecycle_email", "blog", "newsroom"] as const;
export type Channel = (typeof CHANNELS)[number];

export const TONES = ["warm", "confident", "playful", "editorial"] as const;
export type Tone = (typeof TONES)[number];
