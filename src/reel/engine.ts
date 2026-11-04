/**
 * t-driven film engine: every visual property is a pure function of time t.
 * Deterministic frame state (preview and export share it). See DESIGN.md motion.
 */

export interface PlanBeat {
  id: string;
  kind: string;
  era?: string;
  tStart: number;
  tEnd: number;
  mapPaths: Array<{ to: [number, number]; label: string | null }>;
}

export interface PlanLike {
  duration_s: number;
  beats: PlanBeat[];
}

export interface FrameState {
  t: number;
  beatIndex: number;
  beat: PlanBeat;
  beatProgress: number;
  sceneAlpha: number;
  /** Camera push 1..1.18 across the beat (mockup slow zoom, now deterministic). */
  push: number;
}

const EDGE_FADE_S = 0.6;

export function clampT(plan: PlanLike, t: number): number {
  if (t < 0) return 0;
  if (t > plan.duration_s) return plan.duration_s;
  return t;
}

export function beatAt(plan: PlanLike, t: number): { index: number; beat: PlanBeat } {
  const beats = plan.beats;
  for (let i = 0; i < beats.length; i += 1) {
    if (t < beats[i].tEnd || i === beats.length - 1) return { index: i, beat: beats[i] };
  }
  return { index: 0, beat: beats[0] };
}

export function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

export function frameAt(plan: PlanLike, t: number): FrameState {
  const ct = clampT(plan, t);
  const { index, beat } = beatAt(plan, ct);
  const span = Math.max(beat.tEnd - beat.tStart, 0.0001);
  const beatProgress = Math.min(Math.max((ct - beat.tStart) / span, 0), 1);
  const fadeIn = Math.min((ct - beat.tStart) / EDGE_FADE_S, 1);
  const fadeOut = Math.min((beat.tEnd - ct) / EDGE_FADE_S, 1);
  const sceneAlpha = Math.min(Math.max(Math.min(fadeIn, fadeOut), 0), 1);
  return {
    t: ct,
    beatIndex: index,
    beat,
    beatProgress,
    sceneAlpha,
    push: 1 + 0.18 * beatProgress,
  };
}
