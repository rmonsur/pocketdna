/** Provider (screenshot) path: label resolution, context-site scenes, profile targets, repair prompt, name disambiguation. */
import assert from "node:assert";
import type { EvidenceRecord } from "../src/contracts/index.ts";
import { AtlasSceneSchema } from "../src/contracts/index.ts";
import { CONTEXT_LEGEND, PROVIDER_LEGEND, convergenceScene, providerEraScene, providerMarkers, siteMarkers } from "../src/server/atlasScenes.ts";
import type { ContextSite, Gazetteer, GazetteerEntry } from "../src/server/gazetteer.ts";
import { sitesForClaims } from "../src/server/gazetteer.ts";
import { AuditOut, compileRepairPrompt, MAX_REPAIRS_PER_EPISODE } from "../src/server/images.ts";
import { disambiguate, profileFor } from "../src/server/profiles.ts";
import { normalizeLabel, resolveProviderLabel, resolveProviderShares } from "../src/server/providerRegions.ts";

/* Label resolution only through the reviewed table. */
assert.equal(normalizeLabel("British & Irish"), "british and irish");
assert.deepEqual(resolveProviderLabel("British & Irish")?.sourceIds, ["English", "Scottish", "Orcadian"]);
assert.deepEqual(resolveProviderLabel("Scandinavian")?.sourceIds, ["Norwegian", "Icelandic"]);
assert.deepEqual(resolveProviderLabel("Broadly Northwestern European")?.sourceIds, ["English", "Norwegian", "Orcadian"]);
assert.equal(resolveProviderLabel("Ashkenazi Jewish"), null, "no reviewed rule, no marker");
assert.equal(resolveProviderLabel(""), null);
assert.equal(resolveProviderLabel("Unassigned"), null);

const provider: EvidenceRecord = {
  kind: "provider",
  vendor: "23andMe",
  shares: [
    { id: "s1", label: "British & Irish", weight: 0.6 },
    { id: "s2", label: "Scandinavian", weight: 0.3 },
    { id: "s3", label: "Unassigned", weight: 0.1 },
  ],
  limitations: [],
};
const resolved = resolveProviderShares(provider.shares);
assert.deepEqual(resolved.map((r) => r.share.id), ["s1", "s2"], "unresolved labels are dropped, heaviest first");

function entry(id: string, lat: number, lon: number): GazetteerEntry {
  return { id, label: `Present-day ${id}`, eras: ["modern"], groupId: id, locality: id, country: "UK", lat, lon, dateText: "present-day", publication: "X2015", doi: null, individuals: 10, match: "group" };
}
const gazetteer: Gazetteer = new Map([
  ["English", entry("English", 51.19, 0.73)],
  ["Scottish", entry("Scottish", 56.04, -5.44)],
  ["Orcadian", entry("Orcadian", 59, -3)],
  ["Norwegian", entry("Norwegian", 60.36, 5.36)],
]);
const sites: ContextSite[] = [
  { ...entry("Russia_Samara_EBA_Yamnaya", 53.64, 50.66), label: "Yamnaya herders of the Samara steppe", dateText: "about 3018 BCE", era: "bronze", claimIds: ["c-steppe-haak2015"] },
  { ...entry("Sweden_Viking", 58.38, 13.65), label: "Viking Age Swedes", dateText: "about 1050 CE", era: "middle", claimIds: ["c-viking-margaryan2020"] },
];

const modern = providerMarkers(provider, gazetteer);
assert.deepEqual(modern.map((m) => m.id), ["English", "Scottish", "Orcadian", "Norwegian"]);
assert.ok(Math.abs(modern[0].weight - 0.2) < 1e-6, "label weight is split across its populations");
assert.ok(modern.every((m) => m.weight > 0), "Icelandic is absent from this gazetteer and simply omitted");

const bronze = providerEraScene(provider, "bronze", ["c-steppe-haak2015"], gazetteer, sites);
assert.ok(bronze !== undefined);
AtlasSceneSchema.parse(bronze);
assert.equal(bronze.legend, CONTEXT_LEGEND);
assert.deepEqual(bronze.markers.map((m) => m.id), ["Russia_Samara_EBA_Yamnaya"]);
assert.equal(providerEraScene(provider, "middle", ["c-steppe-haak2015"], gazetteer, sites), undefined, "no cited middle site, no scene");
const modernScene = providerEraScene(provider, "modern", [], gazetteer, sites);
assert.equal(modernScene?.legend, PROVIDER_LEGEND);
const convergence = convergenceScene(provider, ["c-steppe-haak2015", "c-viking-margaryan2020"], gazetteer, sites);
assert.ok(convergence !== undefined);
assert.deepEqual(convergence.markers.map((m) => m.id), ["Russia_Samara_EBA_Yamnaya", "Sweden_Viking", "English", "Scottish", "Orcadian"], "cited sites plus top present-day populations");
assert.equal(sitesForClaims(["nope"], sites).length, 0);
assert.equal(siteMarkers(sites).length, 2);

/* Repair pass contract. */
const brief = { beatId: "b3", era: "bronze", place: "Lopatino, Russia", dateText: "about 3018 BCE", family: "Yamnaya", publication: null, doi: null, purpose: "p" };
const repair = compileRepairPrompt(brief, "Remove the iron horseshoe on the left edge.");
assert.ok(repair.startsWith("Edit the attached image."));
assert.ok(repair.includes("Lopatino, Russia") && repair.includes("No text"));
assert.throws(() => compileRepairPrompt(brief, "  "), /repair instruction missing/);
assert.equal(AuditOut.parse({ verdict: "repair", issues: [], repair: "x" }).verdict, "repair");
assert.equal(AuditOut.parse({ verdict: "pass", issues: [] }).repair, "", "repair defaults to empty");
assert.ok(MAX_REPAIRS_PER_EPISODE === 2, "AGENT.md: at most two repairs per episode");

/* Names: two samples of one AADR group share a profile and never show as identical rows. */
const profiles = [{ source_id: "L8630", name: "Antiquity-era people near Rabat", who: "w", where: "", why_similar: "y", caution: "", story: "" }];
const grouped: Gazetteer = new Map([
  ["L8630", { ...entry("L8630", 38.1, 67.3), groupId: "Uzbekistan_Antiquity" }],
  ["L8002", { ...entry("L8002", 38.1, 67.3), groupId: "Uzbekistan_Antiquity" }],
]);
assert.equal(profileFor("L8002", profiles, grouped)?.name, "Antiquity-era people near Rabat", "same group, same profile");
assert.equal(profileFor("Mala", profiles, grouped), undefined);
assert.deepEqual(disambiguate(["A", "B", "A"]), ["A (individual 1)", "B", "A (individual 2)"]);
assert.deepEqual(disambiguate(["A", "B"]), ["A", "B"]);

console.log("PASS providerPath");
