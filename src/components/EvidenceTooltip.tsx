/** Evidence tooltip card (mockup citation card, docs-corrected values). */

import type { Claim, EvidenceRecord } from "../contracts/index";

interface Props {
  claim: Claim | null;
  evidence: EvidenceRecord;
  beatEra?: string;
  onClose: () => void;
}

function eraRange(evidence: EvidenceRecord, era?: string): string {
  if (evidence.kind !== "raw" || era === undefined) return "shown as your report words it";
  const fit = evidence.epochs.find((e) => e.era === era);
  if (fit === undefined || fit.shares.length === 0) return "contextual chapter";
  const top = fit.shares.reduce((a, b) => (b.weight > a.weight ? b : a));
  return `${(top.low * 100).toFixed(1)}–${(top.high * 100).toFixed(1)}% bootstrap range · ${evidence.usableMarkers.toLocaleString()} markers`;
}

export function EvidenceTooltip({ claim, evidence, beatEra, onClose }: Props): React.JSX.Element {
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-2xl bg-surface-charcoal/95 p-4 shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8F45B" strokeWidth="2">
            <path d="M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[11px] font-bold uppercase tracking-wider text-bio-lime">
            {evidence.kind === "raw" ? "Bootstrap range (not a confidence claim)" : "Provider reported"}
          </span>
        </div>
        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label="Close evidence">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {claim !== null ? (
        <p className="text-[12px] leading-relaxed text-on-surface">
          <strong className="text-text-primary">Source Citation:</strong> {claim.source.authors} ({claim.source.year}){" "}
          <em>{claim.source.venue}</em>. {claim.detail ?? ""}
        </p>
      ) : (
        <p className="text-[12px] leading-relaxed text-on-surface">No citation on this beat (editorial line).</p>
      )}
      <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-text-muted">
        <span>{eraRange(evidence, beatEra)}</span>
        <span className="text-archival-amber">{evidence.kind === "raw" ? evidence.basisId : ""}</span>
      </div>
    </div>
  );
}
