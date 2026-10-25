import { CATEGORIES, type Category } from "../landing/catalog";
import { COUNTRIES, RETAILER_TYPES } from "./contract";

// Synthetic retailer table standing in for the warehouse. Seeded, so counts are stable across runs.

export type Retailer = {
  id: string;
  storeName: string;
  email: string;
  retailer_type: (typeof RETAILER_TYPES)[number];
  country: (typeof COUNTRIES)[number];
  top_category: Category;
  signup_days_ago: number;
  orders_last_90d: number;
  gmv_last_365d: number;
  days_since_last_order: number | null;
  email_engaged_30d: boolean;
  is_insider: boolean;
  email_opt_in: boolean;
  ads_consent: boolean;
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ADJ = ["Golden", "Little", "Wild", "Juniper", "Maple", "Harbor", "Willow", "Copper", "Saltwater", "Bramble", "Fern", "Honey", "North", "Olive", "Paper"];
const NOUN = ["Goods", "Mercantile", "Market", "House", "Collective", "Studio", "Trading Co.", "Supply", "Shop", "General", "Emporium", "Room"];

function pick<T>(rand: () => number, arr: readonly T[], weights?: number[]): T {
  if (!weights) return arr[Math.floor(rand() * arr.length)];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < arr.length; i++) if ((r -= weights[i]) < 0) return arr[i];
  return arr[arr.length - 1];
}

function build(n: number): Retailer[] {
  const rand = mulberry32(20170401);
  return Array.from({ length: n }, (_, i) => {
    const storeName = `${pick(rand, ADJ)} ${pick(rand, NOUN)}`;
    const signup = Math.floor(rand() * 1400) + 1;
    const activity = rand();
    const neverOrdered = activity < 0.18;
    const orders = neverOrdered ? 0 : Math.floor(activity * activity * 14);
    const gmv = neverOrdered ? 0 : Math.round((orders + rand() * 4) * (180 + rand() * 900));
    const lastOrder = neverOrdered ? null : orders > 0 ? Math.floor(rand() * 85) + 1 : Math.floor(rand() * Math.min(signup, 600)) + 91;
    return {
      id: `r_${(100000 + i).toString(36)}`,
      storeName,
      email: `owner+${i}@${storeName.toLowerCase().replace(/[^a-z]+/g, "")}.example`,
      retailer_type: pick(rand, RETAILER_TYPES, [26, 22, 18, 14, 6, 7, 7]),
      country: pick(rand, COUNTRIES, [58, 12, 11, 7, 6, 6]),
      top_category: pick(rand, CATEGORIES),
      signup_days_ago: signup,
      orders_last_90d: orders,
      gmv_last_365d: gmv,
      days_since_last_order: lastOrder,
      email_engaged_30d: rand() < 0.42,
      is_insider: !neverOrdered && rand() < 0.15 + orders * 0.03,
      email_opt_in: rand() < 0.82,
      ads_consent: rand() < 0.64,
    };
  });
}

export const RETAILERS: Retailer[] = build(2400);
