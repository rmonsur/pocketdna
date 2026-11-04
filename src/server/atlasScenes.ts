/**
 * Deterministic atlas scenes for the reel globe (ATLAS 6/8): reference
 * sampling locations of the fitted panel sources, weighted by share. No LLM
 * chooses coordinates; unmatched sources are simply omitted from the map.
 */

import type { AtlasMarker, AtlasScene, Era, EvidenceRecord } from "../contracts/index.ts";
import { loadGazetteer, placeText, type Gazetteer } from "./gazetteer.ts";

export const ATLAS_LEGEND = "Reference sampling locations · similarity, not territory or route";
export const ATLAS_MAX_MARKERS = 8;
const MIN_MARKER_WEIGHT = 0.01;

interface ShareLike {
  id: string;
  label: string;
  weight: number;
}

export function markersFor(shares: ShareLike[], gazetteer: Gazetteer): AtlasMarker[] {
  return shares
    .filter((s) => s.weight >= MIN_MARKER_WEIGHT)
    .sort((a, b) => b.weight - a.weight)
    .flatMap((s) => {
      const entry = gazetteer.get(s.id);
      if (entry === undefined || entry.lat === null || entry.lon === null) return [];
      return [
        {
          id: s.id,
          label: entry.label,
          place: placeText(entry),
          dateText: entry.dateText,
          lon: entry.lon,
          lat: entry.lat,
          weight: Number(s.weight.toFixed(4)),
        },
      ];
    })
    .slice(0, ATLAS_MAX_MARKERS);
}

/** Weighted centroid in lon/lat (adequate for a globe focus; not a geographic claim). */
export function focusOf(markers: AtlasMarker[]): [number, number] {
  if (markers.length === 0) return [20, 30];
  let x = 0;
  let y = 0;
  let z = 0;
  for (const m of markers) {
    const lat = (m.lat * Math.PI) / 180;
    const lon = (m.lon * Math.PI) / 180;
    const w = Math.max(m.weight, MIN_MARKER_WEIGHT);
    x += w * Math.cos(lat) * Math.cos(lon);
    y += w * Math.cos(lat) * Math.sin(lon);
    z += w * Math.sin(lat);
  }
  const lon = (Math.atan2(y, x) * 180) / Math.PI;
  const lat = (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI;
  return [Number(lon.toFixed(2)), Number(lat.toFixed(2))];
}

export function eraScene(evidence: EvidenceRecord, era: Era, gazetteer = loadGazetteer()): AtlasScene | undefined {
  if (evidence.kind !== "raw") return undefined;
  const epoch = evidence.epochs.find((e) => e.era === era);
  if (epoch === undefined) return undefined;
  const markers = markersFor(epoch.shares, gazetteer);
  if (markers.length === 0) return undefined;
  return { preset: "locate-region", focus: focusOf(markers), markers, legend: ATLAS_LEGEND };
}

/** Convergence: the top markers of every era together, no connecting routes. */
export function convergenceScene(evidence: EvidenceRecord, gazetteer = loadGazetteer()): AtlasScene | undefined {
  if (evidence.kind !== "raw") return undefined;
  const perEra = 3;
  const markers = evidence.epochs.flatMap((epoch) => markersFor(epoch.shares, gazetteer).slice(0, perEra));
  if (markers.length === 0) return undefined;
  const unique = [...new Map(markers.map((m) => [m.id, m])).values()].slice(0, ATLAS_MAX_MARKERS);
  return { preset: "affinity-overview", focus: focusOf(unique), markers: unique, legend: ATLAS_LEGEND };
}
