/** On-device result: deep ancestry across three periods, with breakdowns and closest genetic distances. */

import type { RawRunResult } from "../lib/rawAnalysis";

const ERA_TITLE: Record<string, string> = {
  bronze: "Bronze Age",
  middle: "Middle Ages",
  modern: "Modern period",
};

const MIN_SHOWN_SHARE = 0.01;
const MAX_ROWS = 6;

/** Two samples from one panel family share a label; number them so rows never read as duplicates. */
function numbered(labels: string[]): string[] {
  const counts = new Map<string, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  const seen = new Map<string, number>();
  return labels.map((l) => {
    if ((counts.get(l) ?? 0) < 2) return l;
    const n = (seen.get(l) ?? 0) + 1;
    seen.set(l, n);
    return `${l} (individual ${n})`;
  });
}

export function RawResult({
  result,
  onGenerateEpisode,
}: {
  result: RawRunResult;
  onGenerateEpisode: () => void;
}): React.JSX.Element {
  return (
    <div className="flex w-full max-w-[560px] flex-col gap-5 rounded-2xl bg-surface-translucent p-6 shadow-xl backdrop-blur-xl lg:p-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-bio-lime">Analysed on this device</p>
        <h2 className="pt-1 text-2xl font-light text-text-primary">Your deep ancestry across three periods</h2>
        <p className="pt-1 text-[13px] text-text-muted">
          How much of your DNA looks like each reference group, with a likely range, and the groups you sit closest to.
        </p>
      </div>

      {result.eras.map((era) => (
        <section key={era.era}>
          <h3 className="pb-1 text-[11px] font-bold uppercase tracking-wider text-archival-amber">
            {ERA_TITLE[era.era] ?? era.era}
          </h3>
          <ul className="flex flex-col gap-1">
            {numbered(era.shares.filter((s) => s.weight >= MIN_SHOWN_SHARE).slice(0, MAX_ROWS).map((s) => s.label)).map((label, i) => {
              const s = era.shares.filter((x) => x.weight >= MIN_SHOWN_SHARE).slice(0, MAX_ROWS)[i];
              return (
              <li key={s.source_id} className="flex items-baseline justify-between gap-3 text-[13px] text-on-surface">
                <span>{label}</span>
                <span className="font-mono text-[12px] text-text-muted">
                  {(s.weight * 100).toFixed(1)}% ({(s.low * 100).toFixed(1)}–{(s.high * 100).toFixed(1)})
                </span>
              </li>
              );
            })}
          </ul>
          <p className="pt-1.5 text-[12px] text-text-muted">
            Closest genetic distances:{" "}
            {[...new Map(era.closest.map((c) => [c.label, c])).values()]
              .map((c) => `${c.label} (${c.distance.toFixed(3)})`)
              .join(" · ")}
          </p>
        </section>
      ))}

      <button
        type="button"
        onClick={onGenerateEpisode}
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-bio-lime px-6 text-base font-black tracking-wide text-surface-container-lowest"
      >
        Generate your episode
      </button>
      <p className="-mt-2 text-center text-[12px] text-text-muted">
        Only this summary goes to the film agents. Your DNA file stays on this device.
      </p>
    </div>
  );
}
