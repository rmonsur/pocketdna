/** Export planning: frame times + evidence manifest (STACK 9). Pure, tested offline. */

import type { Claim, EvidenceRecord, ReelPlan } from "../contracts/index.ts";

export function frameTimes(durationS: number, fps: number): number[] {
  const count = Math.max(1, Math.floor(durationS * fps));
  return Array.from({ length: count }, (_, i) => Number((i / fps).toFixed(3)));
}

export interface EvidenceManifest {
  version: 1;
  exportedAt: string;
  mode: string;
  duration_s: number;
  fps: number;
  frames: number;
  size: "1080x1920";
  sound: "silent";
  citations: Array<{ id: string; authors: string; year: number; venue: string; doi: string | null }>;
  evidenceKind: string;
  limitations: string[];
}

export function buildManifest(
  plan: ReelPlan,
  evidence: EvidenceRecord,
  claims: Claim[],
  fps: number,
  mode: string,
  exportedAt = new Date().toISOString(),
): EvidenceManifest {
  return {
    version: 1,
    exportedAt,
    mode,
    duration_s: plan.duration_s,
    fps,
    frames: frameTimes(plan.duration_s, fps).length,
    size: "1080x1920",
    sound: "silent",
    citations: claims.map((c) => ({
      id: c.id,
      authors: c.source.authors,
      year: c.source.year,
      venue: c.source.venue,
      doi: c.source.doi,
    })),
    evidenceKind: evidence.kind,
    limitations: evidence.limitations,
  };
}
