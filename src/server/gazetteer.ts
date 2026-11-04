/**
 * Era-panel gazetteer: public AADR sampling metadata per panel source id
 * (label, place, date, publication). Built offline by scripts/build-gazetteer.mjs.
 * Coordinates are reference sampling locations, never territories or routes (ATLAS 6).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const GazetteerEntrySchema = z.object({
  id: z.string(),
  label: z.string(),
  eras: z.array(z.string()),
  groupId: z.string().nullable(),
  locality: z.string().nullable(),
  country: z.string().nullable(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  dateText: z.string().nullable(),
  publication: z.string().nullable(),
  doi: z.string().nullable(),
  individuals: z.number().int().nonnegative(),
  match: z.string(),
});

export type GazetteerEntry = z.infer<typeof GazetteerEntrySchema>;

/** A dated reference site from a cited study (ATLAS 6: excavated sites as dated points). */
export const ContextSiteSchema = GazetteerEntrySchema.extend({
  era: z.enum(["bronze", "middle", "modern"]),
  claimIds: z.array(z.string()),
});

export type ContextSite = z.infer<typeof ContextSiteSchema>;

const GazetteerFileSchema = z.object({
  schemaVersion: z.literal(1),
  basisId: z.string(),
  sites: z.array(ContextSiteSchema).default([]),
  entries: z.record(z.string(), GazetteerEntrySchema),
});

export type Gazetteer = Map<string, GazetteerEntry>;

let cachedSites: ContextSite[] = [];

const GAZETTEER_PATH = join(process.cwd(), "dataset", "interim", "era-panels", "gazetteer.json");

let cached: Gazetteer | null = null;

/** Load once per process; an absent file yields an empty gazetteer (labels fall back to panel names). */
export function loadGazetteer(path = GAZETTEER_PATH): Gazetteer {
  if (cached !== null && path === GAZETTEER_PATH) return cached;
  const map: Gazetteer = new Map();
  if (existsSync(path)) {
    const parsed = GazetteerFileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    for (const [id, entry] of Object.entries(parsed.entries)) map.set(id, entry);
    if (path === GAZETTEER_PATH) cachedSites = parsed.sites;
  }
  if (path === GAZETTEER_PATH) cached = map;
  return map;
}

/** Context sites whose cited studies appear in the claim ids (gazetteer must be loaded first). */
export function sitesForClaims(claimIds: string[], sites: ContextSite[] = loadedSites()): ContextSite[] {
  const wanted = new Set(claimIds);
  return sites.filter((site) => site.lat !== null && site.lon !== null && site.claimIds.some((c) => wanted.has(c)));
}

export function loadedSites(): ContextSite[] {
  loadGazetteer();
  return cachedSites;
}

/** AADR present-day rows sometimes carry a locality like "India, modern 2"; that is not a place name. */
function usableLocality(locality: string | null, country: string | null): string | null {
  if (locality === null || locality === "") return null;
  if (/\bmodern\b/i.test(locality) || /^\d+$/.test(locality)) return null;
  if (country !== null && locality.toLowerCase() === country.toLowerCase()) return null;
  return locality;
}

/** Readable "where" for captions and briefs: "Rabat, Uzbekistan" or null. */
export function placeText(entry: GazetteerEntry | undefined): string | null {
  if (entry === undefined) return null;
  const parts = [usableLocality(entry.locality, entry.country), entry.country].filter((p): p is string => p !== null && p !== "");
  return parts.length === 0 ? null : parts.join(", ");
}

/** Readable label for a panel source id, preferring the curated panel family name. */
export function labelFor(gazetteer: Gazetteer, id: string, fallback?: string): string {
  const entry = gazetteer.get(id);
  if (entry !== undefined) return entry.label;
  return fallback !== undefined && fallback !== "" ? fallback : id.replace(/_/g, " ");
}

/** Year parsed from an AADR publication abbreviation such as KumarFuMolBiolEvol2021. */
export function publicationYear(publication: string | null): number | null {
  if (publication === null) return null;
  const match = /(\d{4})/.exec(publication);
  return match === null ? null : Number(match[1]);
}
