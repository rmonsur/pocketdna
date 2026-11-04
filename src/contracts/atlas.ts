/** Approved atlas sites: only these may render (ATLAS spec). Lon/lat WGS84. */

import { z } from "zod";

export const AtlasSiteSchema = z.object({
  id: z.string(),
  era: z.enum(["bronze", "middle", "modern"]),
  label: z.string(),
  lon: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  detail: z.string(),
  claimIds: z.array(z.string()),
});

export type AtlasSite = z.infer<typeof AtlasSiteSchema>;

export const APPROVED_SITES: AtlasSite[] = [
  {
    id: "samara-steppe",
    era: "bronze",
    label: "Yamnaya, Samara",
    lon: 50.2,
    lat: 53.2,
    detail: "Bronze Age steppe sample cluster named in the demonstration plan.",
    claimIds: ["haak2015"],
  },
  {
    id: "corded-ware",
    era: "bronze",
    label: "Corded Ware horizon",
    lon: 15.0,
    lat: 51.5,
    detail: "Regional horizon shown as context, never as a personal route.",
    claimIds: ["haak2015"],
  },
  {
    id: "sigtuna",
    era: "middle",
    label: "Sigtuna, Viking Age",
    lon: 17.72,
    lat: 59.62,
    detail: "Viking Age settlement named in the demonstration plan.",
    claimIds: ["margaryan2020"],
  },
  {
    id: "british-isles",
    era: "modern",
    label: "British Isles panel",
    lon: -2.5,
    lat: 54.0,
    detail: "Present-day comparison panel named in the demonstration plan.",
    claimIds: ["leslie2015"],
  },
];

/** Deterministic atlas data checks. Returns issue strings; empty = pass. */
export function verifyAtlasSites(sites: AtlasSite[], knownClaimIds: Set<string>): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const site of sites) {
    const parsed = AtlasSiteSchema.safeParse(site);
    if (!parsed.success) issues.push(`${site.id}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
    if (seen.has(site.id)) issues.push(`${site.id}: duplicate id`);
    seen.add(site.id);
    for (const cid of site.claimIds) {
      if (!knownClaimIds.has(cid)) issues.push(`${site.id}: unknown claim ${cid}`);
    }
  }
  return issues;
}
