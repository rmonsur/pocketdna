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

const GazetteerFileSchema = z.object({
  schemaVersion: z.literal(1),
  basisId: z.string(),
  entries: z.record(z.string(), GazetteerEntrySchema),
});

export type Gazetteer = Map<string, GazetteerEntry>;

const GAZETTEER_PATH = join(process.cwd(), "dataset", "interim", "era-panels", "gazetteer.json");

let cached: Gazetteer | null = null;

/** Load once per process; an absent file yields an empty gazetteer (labels fall back to panel names). */
export function loadGazetteer(path = GAZETTEER_PATH): Gazetteer {
  if (cached !== null && path === GAZETTEER_PATH) return cached;
  const map: Gazetteer = new Map();
  if (existsSync(path)) {
    const parsed = GazetteerFileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    for (const [id, entry] of Object.entries(parsed.entries)) map.set(id, entry);
  }
  if (path === GAZETTEER_PATH) cached = map;
  return map;
}

/** Readable "where" for captions and briefs: "Rabat, Uzbekistan" or null. */
export function placeText(entry: GazetteerEntry | undefined): string | null {
  if (entry === undefined) return null;
  const parts = [entry.locality, entry.country].filter((p): p is string => p !== null && p !== "");
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
