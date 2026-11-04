/** Audio waveform bars (decorative; aria-hidden). */

const HEIGHTS = ["h-2", "h-3", "h-3.5", "h-2", "h-1"] as const;

export function Waveform(): React.JSX.Element {
  return (
    <div aria-hidden className="flex h-3.5 items-center justify-center gap-1 opacity-80">
      {HEIGHTS.map((h, i) => (
        <span
          key={i}
          className={`w-1 animate-pulse rounded-full ${i === 2 ? "bg-bio-lime" : "bg-archival-amber/80"} ${h}`}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}
