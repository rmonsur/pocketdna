/** Viewport-side generation status: what the film pipeline is doing right now. */

import { PIPELINE_STEP_COUNT, type GenerationStatusProps } from "../lib/generationStatus";

export function GenerationStatus({ title, detail, step }: GenerationStatusProps): React.JSX.Element {
  const progress = step === null ? 0 : (step / PIPELINE_STEP_COUNT) * 100;
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 w-full max-w-[560px] rounded-2xl bg-surface-translucent p-4 shadow-xl backdrop-blur-xl"
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-bio-lime" />
        <span className="font-mono text-[11px] font-semibold uppercase text-on-surface-variant">Generating your episode</span>
        {step !== null && (
          <span className="ml-auto font-mono text-[11px] text-text-muted">
            {step}/{PIPELINE_STEP_COUNT}
          </span>
        )}
      </div>
      <p className="pt-2 text-base font-light text-text-primary">{title}</p>
      <p className="pt-0.5 font-mono text-[12px] text-text-muted">{detail}</p>
      <span className="mt-3 block h-1 w-full overflow-hidden rounded-full bg-surface-container-high">
        <span className="block h-full bg-archival-amber transition-[width] ease-linear" style={{ width: `${progress}%` }} />
      </span>
      <p className="pt-2 text-[11px] text-text-muted">The saved episode keeps playing below until your film is ready.</p>
    </div>
  );
}
