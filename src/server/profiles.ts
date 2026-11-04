/**
 * Population profiles (InterpretationAgent, population step): plain-language
 * "who / where / why similar" for the reference populations an episode
 * names, grounded only in the gazetteer record for each one. Each profile
 * becomes a context Claim whose source is the AADR publication for that
 * sample group. Raw episodes profile the top fitted sources per era (one per
 * AADR group); provider episodes profile the present-day populations their
 * labels resolve to plus the dated sites of the studies they cite.
 */

import { z } from "zod";
import { ClaimSchema, type Claim, type EvidenceRecord } from "../contracts/index.ts";
import { callJson, readPrompt } from "../lib/muse/client.ts";
import { SPARK } from "../lib/muse/models.ts";
import { loadGazetteer, placeText, publicationYear, sitesForClaims, type Gazetteer, type GazetteerEntry } from "./gazetteer.ts";
import { resolveProviderShares } from "./providerRegions.ts";

export const PROFILES_PER_ERA = 3;
const PROVIDER_PROFILE_LABELS = 3;
const CONTEXT_SITE_PROFILES = 4;
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

function groupKey(id: string, record: GazetteerEntry | undefined): string {
  return record?.groupId ?? id;
}

/** Raw: top sources per era, one target per AADR group (several samples of one group share a profile). */
function rawTargets(evidence: Extract<EvidenceRecord, { kind: "raw" }>, gazetteer: Gazetteer): ProfileTarget[] {
  const seenGroups = new Set<string>();
  const targets: ProfileTarget[] = [];
  for (const epoch of evidence.epochs) {
    const top = [...epoch.shares]
      .filter((s) => s.weight >= MIN_PROFILE_WEIGHT)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, PROFILES_PER_ERA);
    for (const share of top) {
      const record = gazetteer.get(share.id);
      const key = `${epoch.era}:${groupKey(share.id, record)}`;
      if (seenGroups.has(key)) continue;
      seenGroups.add(key);
      targets.push({ sourceId: share.id, era: epoch.era, panelLabel: share.label, record });
    }
  }
  return targets;
}

/** Provider: present-day populations behind the heaviest labels, plus the cited studies' sites. */
function providerTargets(evidence: Extract<EvidenceRecord, { kind: "provider" }>, claimIds: string[], gazetteer: Gazetteer): ProfileTarget[] {
  const seen = new Set<string>();
  const targets: ProfileTarget[] = [];
  for (const resolved of resolveProviderShares(evidence.shares).slice(0, PROVIDER_PROFILE_LABELS)) {
    const id = resolved.sourceIds[0];
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    targets.push({ sourceId: id, era: "modern", panelLabel: `${resolved.share.label} (provider label)`, record: gazetteer.get(id) });
  }
  for (const site of sitesForClaims(claimIds).slice(0, CONTEXT_SITE_PROFILES)) {
    if (seen.has(site.id)) continue;
    seen.add(site.id);
    targets.push({ sourceId: site.id, era: site.era, panelLabel: site.label, record: site });
  }
  return targets;
}

export function profileTargets(evidence: EvidenceRecord, claimIds: string[] = []): ProfileTarget[] {
  const gazetteer = loadGazetteer();
  return evidence.kind === "raw" ? rawTargets(evidence, gazetteer) : providerTargets(evidence, claimIds, gazetteer);
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

/** "KumarFuMolBiolEvol2021" -> authors "Kumar, Fu et al.", venue "Mol Biol Evol". */
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

export async function profilePopulations(evidence: EvidenceRecord, claimIds: string[], runSpentUsd: number): Promise<ProfilesResult> {
  const targets = profileTargets(evidence, claimIds);
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

/** Profile for a source, or for another sample of the same AADR group. */
export function profileFor(sourceId: string, profiles: PopulationProfile[], gazetteer: Gazetteer): PopulationProfile | undefined {
  const direct = profiles.find((p) => p.source_id === sourceId);
  if (direct !== undefined) return direct;
  const group = gazetteer.get(sourceId)?.groupId;
  if (group === undefined || group === null) return undefined;
  return profiles.find((p) => gazetteer.get(p.source_id)?.groupId === group);
}

/** Readable name for a source id; never a lab code. Falls back to the gazetteer label and place. */
export function displayName(sourceId: string, profiles: PopulationProfile[], gazetteer: Gazetteer, fallback: string): string {
  const profile = profileFor(sourceId, profiles, gazetteer);
  if (profile !== undefined) return profile.name;
  const entry = gazetteer.get(sourceId);
  if (entry === undefined) return fallback;
  const place = placeText(entry);
  if (entry.dateText === "present-day") {
    return entry.country === null ? `Present-day ${entry.label} people` : `Present-day ${entry.label} people from ${entry.country}`;
  }
  return place === null ? entry.label : `${entry.label} · ${place}`;
}

/** Shares of one AADR group get an ordinal so two rows never read as the same thing twice. */
export function disambiguate(names: string[]): string[] {
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  const seen = new Map<string, number>();
  return names.map((n) => {
    if ((counts.get(n) ?? 0) < 2) return n;
    const index = (seen.get(n) ?? 0) + 1;
    seen.set(n, index);
    return `${n} (individual ${index})`;
  });
}
