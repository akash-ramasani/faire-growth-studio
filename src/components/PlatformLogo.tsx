/* eslint-disable @next/next/no-img-element -- tiny local SVGs; next/image adds nothing here */
const LOGOS = {
  braze: { src: "/logos/braze.svg", name: "Braze" },
  meta: { src: "/logos/meta.svg", name: "Meta" },
  google: { src: "/logos/google-ads.svg", name: "Google Ads" },
} as const;

export type Platform = keyof typeof LOGOS;

export function PlatformLogo({ platform, size = 20 }: { platform: Platform; size?: number }) {
  const l = LOGOS[platform];
  return <img src={l.src} alt={`${l.name} logo`} width={size} height={size} className="shrink-0 object-contain" />;
}
