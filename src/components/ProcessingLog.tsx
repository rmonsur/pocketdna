/** Processing log (mockup pipeline stages): live SSE rows with real artifacts. */

import type { ProgressEvent } from "../contracts/index.ts";

const STEPS = [
  { step: 1, title: "Reading your results" },
  { step: 2, title: "Extracting composition" },
  { step: 3, title: "Selecting your citations" },
  { step: 4, title: "Directing your film" },
  { step: 5, title: "Choosing your scenes" },
  { step: 6, title: "Auditing" },
  { step: 7, title: "Film ready" },
] as const;

export function ProcessingLog({ events }: { events: ProgressEvent[] }): React.JSX.Element {
  const byStep = new Map(events.map((e) => [e.step, e]));
  return (
    <div className="w-full max-w-[560px] rounded-2xl bg-surface-translucent p-6 shadow-xl backdrop-blur-xl">
      <p className="font-mono text-xs text-text-muted">Directing your story</p>
      {STEPS.map((s) => {
        const ev = byStep.get(s.step);
        const state = ev?.status === "done" ? "done" : ev?.status === "failed" ? "· failed" : ev !== undefined ? "· live" : "";
        return (
          <div key={s.step} className="border-b border-white/10 py-3 last:border-0">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm text-on-surface">
                {s.step}. {ev?.title !== "" && ev?.title !== undefined ? ev.title : s.title}
              </span>
              <span className={`font-mono text-[11px] ${ev?.status === "failed" ? "text-red-400" : "text-archival-amber"}`}>
                {ev?.model ?? ""} {state}
              </span>
            </div>
            {ev?.artifact !== undefined && ev.artifact !== "" && (
              <p className="mt-1 font-mono text-xs text-bio-lime">{ev.artifact}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
