/**
 * Deterministic atlas scenes for the reel globe (ATLAS 6/8). Raw episodes
 * plot the sampling locations of fitted panel sources weighted by share.
 * Provider (screenshot) episodes plot dated reference sites from the studies
 * each beat cites, plus reviewed present-day panel populations for the
 * provider's own regional labels. No LLM chooses coordinates; anything
 * unresolved is simply omitted from the map.
 */

import type { AtlasMarker, AtlasScene, Era, EvidenceRecord } from "../contracts/index.ts";
import { loadGazetteer, placeText, sitesForClaims, type ContextSite, type Gazetteer } from "./gazetteer.ts";
import { resolveProviderShares } from "./providerRegions.ts";

export const ATLAS_LEGEND = "Reference sampling locations · similarity, not territory or route";
export const CONTEXT_LEGEND = "Dated reference sites from the cited studies · context, not your route";
export const PROVIDER_LEGEND = "Present-day reference populations for your report's labels · not origins";
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

export function siteMarkers(sites: ContextSite[]): AtlasMarker[] {
  const weight = sites.length === 0 ? 1 : Number((1 / sites.length).toFixed(4));
  return sites
    .filter((site) => site.lat !== null && site.lon !== null)
    .map((site) => ({
      id: site.id,
      label: site.label,
      place: placeText(site),
      dateText: site.dateText,
      lon: site.lon ?? 0,
      lat: site.lat ?? 0,
      weight,
    }))
    .slice(0, ATLAS_MAX_MARKERS);
}

/** Provider labels resolve through the reviewed table; each label's weight is split over its populations. */
export function providerMarkers(evidence: EvidenceRecord, gazetteer: Gazetteer): AtlasMarker[] {
  if (evidence.kind !== "provider") return [];
  const resolved = resolveProviderShares(evidence.shares);
  const shares = resolved.flatMap((r) =>
    r.sourceIds.map((id) => ({ id, label: r.share.label, weight: r.share.weight / r.sourceIds.length })),
  );
  const merged = new Map<string, ShareLike>();
  for (const s of shares) {
    const prev = merged.get(s.id);
    merged.set(s.id, prev === undefined ? s : { ...prev, weight: prev.weight + s.weight });
  }
  return markersFor([...merged.values()], gazetteer);
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

function scene(preset: AtlasScene["preset"], markers: AtlasMarker[], legend: string): AtlasScene | undefined {
  if (markers.length === 0) return undefined;
  return { preset, focus: focusOf(markers), markers, legend };
}

export function eraScene(evidence: EvidenceRecord, era: Era, gazetteer = loadGazetteer()): AtlasScene | undefined {
  if (evidence.kind !== "raw") return undefined;
  const epoch = evidence.epochs.find((e) => e.era === era);
  if (epoch === undefined) return undefined;
  return scene("locate-region", markersFor(epoch.shares, gazetteer), ATLAS_LEGEND);
}

/** Provider era beat: modern chapter shows the resolved labels; other eras show the cited studies' sites. */
export function providerEraScene(
  evidence: EvidenceRecord,
  era: Era,
  claimIds: string[],
  gazetteer = loadGazetteer(),
  sites?: ContextSite[],
): AtlasScene | undefined {
  if (evidence.kind !== "provider") return undefined;
  if (era === "modern") return scene("locate-region", providerMarkers(evidence, gazetteer), PROVIDER_LEGEND);
  const eraSites = sitesForClaims(claimIds, sites).filter((s) => s.era === era);
  return scene("locate-region", siteMarkers(eraSites), CONTEXT_LEGEND);
}

/** Convergence: the top markers of every era together, no connecting routes. */
export function convergenceScene(
  evidence: EvidenceRecord,
  claimIds: string[] = [],
  gazetteer = loadGazetteer(),
  sites?: ContextSite[],
): AtlasScene | undefined {
  const perEra = 3;
  const markers =
    evidence.kind === "raw"
      ? evidence.epochs.flatMap((epoch) => markersFor(epoch.shares, gazetteer).slice(0, perEra))
      : [...siteMarkers(sitesForClaims(claimIds, sites)).slice(0, perEra * 2), ...providerMarkers(evidence, gazetteer).slice(0, perEra)];
  const unique = [...new Map(markers.map((m) => [m.id, m])).values()].slice(0, ATLAS_MAX_MARKERS);
  const legend = evidence.kind === "raw" ? ATLAS_LEGEND : CONTEXT_LEGEND;
  return scene("affinity-overview", unique, legend);
}
