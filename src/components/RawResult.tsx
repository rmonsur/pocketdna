/** Raw result: native PCA-25 coordinates + era mixture fits (experimental). */

import type { RawRunResult } from "../lib/rawAnalysis";

const ERA_TITLE: Record<string, string> = {
  bronze: "Bronze Age sources",
  middle: "Middle Ages sources",
  modern: "Modern reference populations",
};

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
        <p className="text-[11px] font-bold uppercase tracking-wider text-bio-lime">Experimental · analysed on this device</p>
        <h2 className="pt-1 text-2xl font-light text-text-primary">Your PCA-25 coordinates</h2>
        <p className="pt-1 font-mono text-[12px] leading-relaxed text-text-muted">
          {result.coordinates.slice(0, 5).map((v) => v.toFixed(4)).join(", ")} …
        </p>
        <p className="pt-2 text-[13px] text-on-surface">
          {result.usableMarkers.toLocaleString()} usable markers ({(result.callRate * 100).toFixed(1)}% of the{" "}
          {result.basisId} basis) · {result.harmonization.direct.toLocaleString()} direct +{" "}
          {result.harmonization.complement.toLocaleString()} strand-complemented calls
        </p>
      </div>

      {result.eras.map((era) => (
        <section key={era.era}>
          <h3 className="pb-1 text-[11px] font-bold uppercase tracking-wider text-archival-amber">
            {ERA_TITLE[era.era] ?? era.era}
          </h3>
          <ul className="flex flex-col gap-1">
            {era.shares.filter((s) => s.weight >= 0.01).slice(0, 6).map((s) => (
              <li key={s.source_id} className="flex items-baseline justify-between gap-3 text-[13px] text-on-surface">
                <span>{s.label}</span>
                <span className="font-mono text-[12px] text-text-muted">
                  {(s.weight * 100).toFixed(1)}% ({(s.low * 100).toFixed(1)}–{(s.high * 100).toFixed(1)})
                </span>
              </li>
            ))}
          </ul>
          <p className="pt-1 text-[12px] text-text-muted">
            Closest panel sources: {[...new Set(era.closest.map((c) => c.label))].join(" · ")}
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
        Sends only this derived summary (era fits and counts) to the film agents — never your genotypes or coordinates.
      </p>

      <section>
        <h3 className="pb-1 text-[11px] font-bold uppercase tracking-wider text-archival-amber">Limitations</h3>
        <ul className="list-disc pl-4 text-[12px] leading-relaxed text-text-muted">
          {result.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
