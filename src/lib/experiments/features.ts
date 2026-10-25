import type { Icon } from "../landing/catalog";
import { fleschKincaidGrade } from "../landing/evals";
import type { PageSpec } from "../landing/schema";

// The interpretable features we learn from. Learning at this level ("lead with payment terms")
// generalises to the next brief; learning exact wording would not.

export type PageFeatures = {
  leadBenefit: Icon;
  headlineLength: "short" | "medium" | "long";
  headlineHasNumber: boolean;
  headlineIsQuestion: boolean;
  mentionsOffer: boolean;
  ctaVerb: string;
  palette: PageSpec["hero"]["palette"];
  plainLanguage: boolean;
};

const OFFER = /free (shipping|delivery|returns)|net ?60|payment terms|pay later|livraison gratuite|retours|kostenlos|zahlungsbedingungen|paiement/i;

export function extractFeatures(spec: PageSpec): PageFeatures {
  const words = spec.hero.headline.trim().split(/\s+/).length;
  const heroText = `${spec.hero.headline} ${spec.hero.subhead}`;
  return {
    leadBenefit: spec.valueProps[0]?.icon ?? "discover",
    headlineLength: words <= 5 ? "short" : words <= 9 ? "medium" : "long",
    headlineHasNumber: /\d/.test(spec.hero.headline),
    headlineIsQuestion: spec.hero.headline.trim().endsWith("?"),
    mentionsOffer: OFFER.test(heroText),
    ctaVerb: spec.hero.ctaLabel.trim().split(/\s+/)[0]?.toLowerCase() ?? "",
    palette: spec.hero.palette,
    plainLanguage: !spec.brief.locale.startsWith("en") || fleschKincaidGrade(heroText) <= 8,
  };
}

const BENEFIT: Record<Icon, string> = {
  terms: "payment terms",
  returns: "low-risk returns",
  discover: "product discovery",
  shipping: "less operational work",
  insights: "sales insights",
  community: "reaching new retailers",
};

/** Plain-English statements of how the winner differs from the loser. */
export function describeDifferences(winner: PageFeatures, loser: PageFeatures): string[] {
  const out: string[] = [];
  if (winner.leadBenefit !== loser.leadBenefit) out.push(`Leading with ${BENEFIT[winner.leadBenefit]} beat leading with ${BENEFIT[loser.leadBenefit]}`);
  if (winner.headlineLength !== loser.headlineLength) out.push(`A ${winner.headlineLength} headline beat a ${loser.headlineLength} one`);
  if (winner.headlineHasNumber !== loser.headlineHasNumber) out.push(winner.headlineHasNumber ? "A concrete number in the headline helped" : "Headlines without numbers did better");
  if (winner.headlineIsQuestion !== loser.headlineIsQuestion) out.push(winner.headlineIsQuestion ? "A question headline did better" : "A statement headline beat a question");
  if (winner.mentionsOffer !== loser.mentionsOffer) out.push(winner.mentionsOffer ? "Naming the offer in the hero lifted conversion" : "Keeping the offer out of the hero did better");
  if (winner.plainLanguage !== loser.plainLanguage) out.push(winner.plainLanguage ? "Plainer hero copy (grade 8 or below) won" : "Richer hero copy won over the plainer version");
  if (winner.ctaVerb !== loser.ctaVerb && winner.ctaVerb && loser.ctaVerb) out.push(`CTA starting "${winner.ctaVerb}" beat "${loser.ctaVerb}"`);
  return out;
}
