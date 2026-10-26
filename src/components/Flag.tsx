import { AU, CA, DE, FR, GB, US } from "country-flag-icons/react/3x2";

const FLAGS = { US, GB, FR, DE, CA, AU } as const;
export type FlagCode = keyof typeof FLAGS;

export const isFlagCode = (v: string): v is FlagCode => v in FLAGS;

// 3:2 SVG flags with a hairline so white flag edges don't disappear on white.
export function Flag({ code, className = "h-3 w-[18px]" }: { code: string; className?: string }) {
  if (!isFlagCode(code)) return null;
  const Svg = FLAGS[code];
  return <Svg title={code} className={`inline-block shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgb(0_0_0/0.08)] ${className}`} />;
}

export const LOCALE_FLAG: Record<string, FlagCode> = { "en-US": "US", "en-GB": "GB", "fr-FR": "FR", "de-DE": "DE" };
