/**
 * t-driven reel engine: every visual property is a pure function of time t.
 * Pattern adapted from MengTo Skills html-reel (MIT); engine written in-event.
 * Framework-free and deterministic: same (reel, t) always yields the same frame,
 * which is what makes Modal MP4 export exact (step t, screenshot, ffmpeg).
 */

export type BeatKind = "hook" | "method" | "era" | "convergence" | "stamp";
export type Epoch = "bronze" | "middle" | "modern";
export type LonLat = [number, number];

export interface Beat {
  id: string;
  kind: BeatKind;
  epoch?: Epoch;
  t_start: number;
  t_end: number;
  copy: string;
  explainer: string;
  citation_ids: string[];
  scene_id: string;
  map_path: LonLat[];
}

export interface Reel {
  version: 1;
  duration_s: number;
  beats: Beat[];
}

export interface FrameState {
  t: number;
  beatIndex: number;
  beat: Beat;
  /** 0..1 progress within the current beat. */
  beatProgress: number;
  /** Scene crossfade alpha 0..1 (ramps at beat edges). */
  sceneAlpha: number;
  /** Interpolated map position, or null when the beat has no path. */
  mapPoint: LonLat | null;
  /** 0..1 fraction of the map path drawn. */
  mapDrawn: number;
}

const EDGE_FADE_S = 0.4;

export function clampT(reel: Reel, t: number): number {
  if (t < 0) return 0;
  if (t > reel.duration_s) return reel.duration_s;
  return t;
}

export function beatAt(reel: Reel, t: number): { index: number; beat: Beat } {
  const beats = reel.beats;
  for (let i = 0; i < beats.length; i += 1) {
    if (t < beats[i].t_end || i === beats.length - 1) {
      return { index: i, beat: beats[i] };
    }
  }
  return { index: 0, beat: beats[0] };
}

export function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

function segLen(a: LonLat, b: LonLat): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function pathPointAt(path: LonLat[], k: number): LonLat | null {
  if (path.length === 0) return null;
  if (path.length === 1 || k <= 0) return path[0];
  if (k >= 1) return path[path.length - 1];
  let total = 0;
  for (let i = 1; i < path.length; i += 1) total += segLen(path[i - 1], path[i]);
  if (total === 0) return path[0];
  let target = total * k;
  for (let i = 1; i < path.length; i += 1) {
    const len = segLen(path[i - 1], path[i]);
    if (target <= len) {
      const f = len === 0 ? 0 : target / len;
      return [lerp(path[i - 1][0], path[i][0], f), lerp(path[i - 1][1], path[i][1], f)];
    }
    target -= len;
  }
  return path[path.length - 1];
}

export function frameAt(reel: Reel, t: number): FrameState {
  const ct = clampT(reel, t);
  const { index, beat } = beatAt(reel, ct);
  const span = Math.max(beat.t_end - beat.t_start, 0.0001);
  const beatProgress = Math.min(Math.max((ct - beat.t_start) / span, 0), 1);
  const fadeIn = Math.min((ct - beat.t_start) / EDGE_FADE_S, 1);
  const fadeOut = Math.min((beat.t_end - ct) / EDGE_FADE_S, 1);
  const sceneAlpha = Math.min(Math.max(Math.min(fadeIn, fadeOut), 0), 1);
  return {
    t: ct,
    beatIndex: index,
    beat,
    beatProgress,
    sceneAlpha,
    mapPoint: pathPointAt(beat.map_path, beatProgress),
    mapDrawn: beat.map_path.length > 0 ? beatProgress : 0,
  };
}
