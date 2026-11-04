/**
 * Population profiles (InterpretationAgent, population step): plain-language
 * "who / where / why similar" for the top fitted panel sources, grounded only
 * in the gazetteer record for each source. Each profile becomes a context
 * Claim whose source is the AADR publication for that sample group.
 */

import { z } from "zod";
import { ClaimSchema, type Claim, type EvidenceRecord } from "../contracts/index.ts";
import { callJson, readPrompt } from "../lib/muse/client.ts";
import { SPARK } from "../lib/muse/models.ts";
import { loadGazetteer, placeText, publicationYear, type Gazetteer, type GazetteerEntry } from "./gazetteer.ts";

export const PROFILES_PER_ERA = 3;
const MIN_PROFILE_WEIGHT = 0.02;
const AADR_DOI = "10.7910/DVN/FFIDCW";
const AADR_YEAR = 2024;

export const ProfileSchema = z.object({
  source_id: z.string(),
  name: z.string().min(1),
  who: z.string().min(1),
  where: z.string(),
  why_similar: z.string().min(1),
  caution: z.string(),
});

export type PopulationProfile = z.infer<typeof ProfileSchema>;

const ProfilesOut = z.object({ profiles: z.array(ProfileSchema) });

export const PROFILE_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["profiles"],
  properties: {
    profiles: {
      type: "array",
      items: {
        type: "object",
        required: ["source_id", "name", "who", "where", "why_similar", "caution"],
        properties: {
          source_id: { type: "string" },
          name: { type: "string" },
          who: { type: "string" },
          where: { type: "string" },
          why_similar: { type: "string" },
          caution: { type: "string" },
        },
      },
    },
  },
};

export interface ProfileTarget {
  sourceId: string;
  era: string;
  panelLabel: string;
  record: GazetteerEntry | undefined;
}

/** Top sources per era worth profiling; weights stay out of the request (minimal brief). */
export function profileTargets(evidence: EvidenceRecord): ProfileTarget[] {
  if (evidence.kind !== "raw") return [];
  const gazetteer = loadGazetteer();
  const seen = new Set<string>();
  const targets: ProfileTarget[] = [];
  for (const epoch of evidence.epochs) {
    const top = [...epoch.shares]
      .filter((s) => s.weight >= MIN_PROFILE_WEIGHT)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, PROFILES_PER_ERA);
    for (const share of top) {
      if (seen.has(share.id)) continue;
      seen.add(share.id);
      targets.push({ sourceId: share.id, era: epoch.era, panelLabel: share.label, record: gazetteer.get(share.id) });
    }
  }
  return targets;
}

function recordForPrompt(target: ProfileTarget): Record<string, unknown> {
  const r = target.record;
  return {
    source_id: target.sourceId,
    era_chapter: target.era,
    panel_family_label: target.panelLabel,
    aadr_group: r?.groupId ?? null,
    locality: r?.locality ?? null,
    country: r?.country ?? null,
    date: r?.dateText ?? null,
    individuals_in_group: r?.individuals ?? 0,
    publication: r?.publication ?? null,
    doi: r?.doi ?? null,
  };
}

/** "KumarFuMolBiolEvol2021" -> authors "Kumar, Fu et al.", venue "MolBiolEvol". */
export function splitPublication(abbrev: string): { authors: string; venue: string } {
  const body = abbrev.replace(/\d{4}$/, "");
  const tokens = body.match(/[A-Z][a-z]+|[A-Z]+(?![a-z])/g) ?? [body];
  const authors = tokens.slice(0, 2);
  const venue = tokens.slice(2).join(" ");
  return { authors: authors.length === 0 ? abbrev : `${authors.join(", ")} et al.`, venue: venue === "" ? "AADR" : venue };
}

export function claimId(sourceId: string): string {
  return `pop-${sourceId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function profileToClaim(profile: PopulationProfile, record: GazetteerEntry | undefined): Claim {
  const publication = record?.publication ?? null;
  const split = publication === null ? null : splitPublication(publication);
  return ClaimSchema.parse({
    id: claimId(profile.source_id),
    text: `${profile.name}: ${profile.who}`,
    class: "context",
    source: {
      authors: split?.authors ?? "Allen Ancient DNA Resource (AADR) v66.p1",
      year: publicationYear(publication) ?? AADR_YEAR,
      venue: split?.venue ?? "Reference panel metadata",
      doi: record?.doi ?? AADR_DOI,
    },
    detail: [profile.where, profile.why_similar, profile.caution].filter((p) => p !== "").join(" "),
  });
}

export interface ProfilesResult {
  profiles: PopulationProfile[];
  claims: Claim[];
  costUsd: number;
}

export async function profilePopulations(evidence: EvidenceRecord, runSpentUsd: number): Promise<ProfilesResult> {
  const targets = profileTargets(evidence);
  if (targets.length === 0) return { profiles: [], claims: [], costUsd: 0 };
  const result = await callJson({
    agent: "population-profiler",
    model: SPARK,
    effort: "high",
    messages: [
      { role: "system", content: readPrompt("population-profiler") },
      { role: "user", content: [{ type: "text", text: JSON.stringify({ populations: targets.map(recordForPrompt) }) }] },
    ],
    jsonSchema: { name: "population_profiles", strict: true, schema: PROFILE_OUTPUT_SCHEMA },
    validate: (d) => ProfilesOut.parse(d),
    runSpentUsd,
  });
  const byId = new Map(targets.map((t) => [t.sourceId, t]));
  const profiles = result.data.profiles.filter((p) => byId.has(p.source_id));
  const claims = profiles.map((p) => profileToClaim(p, byId.get(p.source_id)?.record));
  return { profiles, claims, costUsd: result.costUsd };
}

/** Readable name for a source id once profiles exist; falls back to the gazetteer label. */
export function displayName(sourceId: string, profiles: PopulationProfile[], gazetteer: Gazetteer, fallback: string): string {
  const profile = profiles.find((p) => p.source_id === sourceId);
  if (profile !== undefined) return profile.name;
  const entry = gazetteer.get(sourceId);
  if (entry === undefined) return fallback;
  const place = placeText(entry);
  return place === null ? entry.label : `${entry.label} · ${place}`;
}
