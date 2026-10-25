// Text wordmark in the spirit of Faire's spaced serif logotype; not the logo file itself.
export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-serif text-[22px] leading-none tracking-[0.42em] text-ink ${className}`}>FAIRE</span>;
}
