/**
 * Deterministic globe camera for reel atlas scenes (ATLAS 8, "locate-region"):
 * rotation, settle and marker reveal are pure functions of beat progress.
 */

import type { AtlasScene } from "../contracts/index";

export const GLOBE_SETTLE_FRACTION = 0.45;
export const GLOBE_START_OFFSET_DEG = 70;
const MARKER_REVEAL_START = 0.2;
const MARKER_REVEAL_END = 0.7;

export interface GlobeCamera {
  /** d3-geo rotation: [-lon, -lat, 0] of the point facing the viewer. */
  rotate: [number, number, number];
  /** 0..1 reveal of markers in weight order. */
  reveal: number;
  /** Zoom factor 1..1.25 across the settle. */
  zoom: number;
}

export function easeInOut(k: number): number {
  const c = Math.min(Math.max(k, 0), 1);
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

export function wrapLon(lon: number): number {
  let value = lon;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

export function cameraAt(scene: AtlasScene, beatProgress: number): GlobeCamera {
  const settle = easeInOut(beatProgress / GLOBE_SETTLE_FRACTION);
  const startLon = wrapLon(scene.focus[0] - GLOBE_START_OFFSET_DEG);
  const lon = wrapLon(startLon + GLOBE_START_OFFSET_DEG * settle);
  const lat = scene.focus[1] * settle;
  const reveal = Math.min(Math.max((beatProgress - MARKER_REVEAL_START) / (MARKER_REVEAL_END - MARKER_REVEAL_START), 0), 1);
  return { rotate: [-lon, -lat, 0], reveal, zoom: 1 + 0.25 * settle };
}

/** Which markers are visible at this reveal fraction (weight order, one by one). */
export function visibleMarkers<T>(markers: T[], reveal: number): T[] {
  const count = Math.ceil(reveal * markers.length);
  return markers.slice(0, count);
}
