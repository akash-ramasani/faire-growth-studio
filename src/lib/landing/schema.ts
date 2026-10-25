import { z } from "zod";
import { CATEGORIES, CHANNELS, DESTINATION_KEYS, ICONS, PALETTES, TESTIMONIAL_IDS, TONES } from "./catalog";

// What a marketer fills in. This is the only free-form input to the system.
export const BriefSchema = z.object({
  campaignName: z.string().min(3).max(80),
  audience: z.enum(["retailer", "brand"]),
  channel: z.enum(CHANNELS),
  goal: z.string().min(10).max(400),
  keyMessage: z.string().max(300).default(""),
  offer: z.string().max(200).default(""),
  tone: z.enum(TONES).default("warm"),
  focusCategories: z.array(z.enum(CATEGORIES)).max(4).default([]),
});
export type Brief = z.infer<typeof BriefSchema>;

// What the model returns. Every enum here is a constraint the model cannot step outside of:
// it composes copy and picks from approved catalogs; code assembles URLs and tracking.
export const PageCopySchema = z.object({
  metaTitle: z.string().describe("SEO title, under 60 characters"),
  metaDescription: z.string().describe("SEO description, under 155 characters"),
  hero: z.object({
    eyebrow: z.string().describe("2-4 word kicker above the headline"),
    headline: z.string().describe("Under 70 characters, sentence case"),
    subhead: z.string().describe("One or two sentences, under 160 characters"),
    ctaLabel: z.string().describe("2-4 words, starts with a verb"),
    destination: z.enum(DESTINATION_KEYS),
    imageAlt: z.string().describe("Alt text describing the hero visual"),
    palette: z.enum(PALETTES),
  }),
  valueProps: z
    .array(
      z.object({
        icon: z.enum(ICONS),
        title: z.string().describe("Under 40 characters"),
        body: z.string().describe("Under 140 characters"),
      }),
    )
    .describe("Exactly 3 value propositions"),
  categories: z
    .array(
      z.object({
        name: z.enum(CATEGORIES),
        blurb: z.string().describe("Under 90 characters"),
      }),
    )
    .describe("3 to 4 featured categories"),
  testimonialId: z.enum(TESTIMONIAL_IDS),
  faq: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .describe("3 to 4 questions a prospect would ask"),
  closing: z.object({
    headline: z.string().describe("Under 60 characters"),
    ctaLabel: z.string(),
  }),
});
export type PageCopy = z.infer<typeof PageCopySchema>;

export type PageSpec = PageCopy & {
  slug: string;
  ctaUrl: string;
  brief: Brief;
};

export type GenerationSource = "claude" | "claude_repaired" | "template_fallback";

export type EvalResult = {
  id: string;
  name: string;
  severity: "blocking" | "warning";
  passed: boolean;
  detail: string;
};

export type GenerationResult = {
  spec: PageSpec;
  evals: EvalResult[];
  source: GenerationSource;
  fallbackReason?: string;
  latencyMs: number;
  attempts: number;
  model?: string;
  usage?: { inputTokens: number; outputTokens: number };
};
