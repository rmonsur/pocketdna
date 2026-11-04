/**
 * Build the era-panel gazetteer from the AADR annotation files (offline tooling).
 * For every panel source id: readable label, group id, locality, country,
 * mean sampling lon/lat, date text, publication and DOI. Public reference
 * metadata only; no user data. Writes dataset/interim/era-panels/gazetteer.json.
 *
 * Usage: node scripts/build-gazetteer.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PANELS = join(ROOT, "dataset", "interim", "era-panels", "panels.json");
const OUT = join(ROOT, "dataset", "interim", "era-panels", "gazetteer.json");
const ANNO_FILES = ["dataset/v66.p1_1240K.aadr.PUB.anno", "dataset/v66.p1_compatibility_HO.aadr.PUB.anno"];

const COL = { geneticId: 0, publication: 6, doi: 7, dateMeanBp: 10, fullDate: 12, group: 14, locality: 15, country: 16, lat: 17, lon: 18 };

function readRows(path) {
  const text = readFileSync(join(ROOT, path), "utf8");
  const lines = text.split("\n");
  return lines.slice(1).filter((l) => l.length > 0).map((l) => l.split("\t"));
}

const byGroup = new Map();
const bySample = new Map();
for (const path of ANNO_FILES) {
  for (const row of readRows(path)) {
    if (row.length <= COL.lon) continue;
    const group = row[COL.group];
    const base = group.split(".")[0];
    for (const key of new Set([group, base])) {
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key).push(row);
    }
    const sample = row[COL.geneticId].split(".")[0];
    if (!bySample.has(sample)) bySample.set(sample, []);
    bySample.get(sample).push(row);
  }
}
const groupKeys = [...byGroup.keys()];

/** Panel ids whose AADR group uses a different spelling (checked by grep over the annotation files). */
const ALIASES = {
  IRN_Shahr_I_Sokhta_BA2: ["Iran_ShahriSokhta_BA2-2"],
  NPL_Samdzong_1500BP: ["Nepal_Mustang_SamdzongTomb_MiddleKingdom"],
  RUS_Yankovsky_IA: ["Russia_PrimorskyKrai_IA_Yankovsky"],
  HRV_MN_Sopot: ["Croatia_MN_Sopot"],
  ARG_Yamana_1500BP: ["Argentina_BeagleChannel_1500BP_LateHorizon_Yamana"],
  "San (Khomani)": ["Khomani", "Khomani_San"],
  "Herero (Namibia)": ["Namibia_Bantu_Herero"],
  Cochin_Jew_A: ["Jew_Cochin"],
  Cochin_Jew_B: ["Jew_Cochin"],
  Yemenite_Jew: ["Jew_Yemenite"],
};

function resolveRows(id) {
  const aliases = (ALIASES[id] ?? []).filter((g) => byGroup.has(g));
  if (aliases.length > 0) return { rows: aliases.flatMap((g) => byGroup.get(g)), match: "alias" };
  if (byGroup.has(id)) return { rows: byGroup.get(id), match: "group" };
  if (bySample.has(id)) return { rows: bySample.get(id), match: "sample" };
  const stripped = id.replace(/\s*\(.*\)\s*$/, "").trim();
  if (stripped !== id && byGroup.has(stripped)) return { rows: byGroup.get(stripped), match: "group-stripped" };
  const prefixed = groupKeys.filter((g) => g.startsWith(`${id}_`) || g.startsWith(`${id}.`));
  if (prefixed.length > 0) return { rows: prefixed.flatMap((g) => byGroup.get(g)), match: "group-prefix" };
  const shortest = groupKeys.filter((g) => id.startsWith(`${g}_`)).sort((a, b) => b.length - a.length)[0];
  if (shortest !== undefined) return { rows: byGroup.get(shortest), match: "group-parent" };
  return { rows: [], match: "none" };
}

function mean(values) {
  const nums = values.map(Number).filter((v) => Number.isFinite(v));
  return nums.length === 0 ? null : nums.reduce((a, b) => a + b, 0) / nums.length;
}

function mode(values) {
  const counts = new Map();
  for (const v of values) if (v !== "" && v !== "..") counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function clean(value) {
  return value === undefined || value === ".." ? null : value.replace(/^"|"$/g, "").trim();
}

function dateText(rows) {
  const full = rows.map((r) => clean(r[COL.fullDate])).filter((v) => v !== null);
  if (full.length > 0 && full.every((v) => v === "present")) return "present-day";
  const bp = mean(rows.map((r) => r[COL.dateMeanBp]));
  if (bp === null || bp === 0) return full[0] ?? null;
  const year = Math.round(1950 - bp);
  return year < 0 ? `about ${-year} BCE` : `about ${year} CE`;
}

function readable(id, eraGroup) {
  if (eraGroup !== undefined && eraGroup !== id) return eraGroup;
  return id.replace(/_/g, " ");
}

/**
 * Context sites for cited studies (citation-index ids and replay claim ids):
 * AADR groups whose rows supply the coordinates and dates. Labels are the
 * readable names used on screen; eras match the citation index.
 */
const CONTEXT_SITES = [
  { group: "Russia_Samara_EBA_Yamnaya", label: "Yamnaya herders of the Samara steppe", era: "bronze", claims: ["c-steppe-haak2015", "haak2015", "c-euro3-lazaridis2014"] },
  { group: "Germany_Esperstedt_CordedWare", label: "Corded Ware community at Esperstedt", era: "bronze", claims: ["c-steppe-haak2015", "haak2015"] },
  { group: "Russia_Chelyabinsk_MLBA_Sintashta", label: "Sintashta settlement at Kamenny Ambar", era: "bronze", claims: ["c-bronze-allentoft2015"] },
  { group: "Russia_Altai_Afanasievo", label: "Afanasievo pastoralists of the Altai", era: "bronze", claims: ["c-bronze-allentoft2015"] },
  { group: "Turkey_N", label: "Neolithic farmers of northwest Anatolia", era: "bronze", claims: ["c-farming-lazaridis2016", "c-euro3-lazaridis2014"] },
  { group: "Luxembourg_Loschbour_Mesolithic", label: "Mesolithic forager at Loschbour", era: "bronze", claims: ["c-euro3-lazaridis2014", "c-iceage-fu2016"] },
  { group: "Sweden_Viking", label: "Viking Age Swedes", era: "middle", claims: ["c-viking-margaryan2020", "margaryan2020"] },
  { group: "Norway_Viking", label: "Viking Age Norwegians", era: "middle", claims: ["c-viking-margaryan2020", "margaryan2020"] },
  { group: "England_Viking", label: "Viking Age burials in England", era: "middle", claims: ["c-viking-margaryan2020", "margaryan2020"] },
  { group: "English", label: "Present-day English", era: "modern", claims: ["leslie2015"] },
  { group: "Scottish", label: "Present-day Scottish", era: "modern", claims: ["leslie2015"] },
  { group: "Orcadian", label: "Present-day Orcadians", era: "modern", claims: ["leslie2015"] },
];

const panels = JSON.parse(readFileSync(PANELS, "utf8"));
const entries = {};
let matched = 0;
for (const [era, sources] of Object.entries(panels.panels)) {
  for (const source of sources) {
    const id = source.source_id;
    if (entries[id] !== undefined) {
      entries[id].eras.push(era);
      continue;
    }
    const { rows, match } = resolveRows(id);
    const lat = mean(rows.map((r) => r[COL.lat]));
    const lon = mean(rows.map((r) => r[COL.lon]));
    if (rows.length > 0) matched += 1;
    const country = rows.length > 0 ? clean(mode(rows.map((r) => r[COL.country]))) : null;
    const locality = rows.length > 0 ? clean(mode(rows.map((r) => r[COL.locality]))) : null;
    entries[id] = {
      id,
      label: readable(id, source.era_group),
      eras: [era],
      groupId: rows.length > 0 ? clean(mode(rows.map((r) => r[COL.group]))) : null,
      locality: locality === null ? null : locality.split("(")[0].trim(),
      country,
      lat: lat === null ? null : Number(lat.toFixed(3)),
      lon: lon === null ? null : Number(lon.toFixed(3)),
      dateText: rows.length > 0 ? dateText(rows) : null,
      publication: rows.length > 0 ? clean(mode(rows.map((r) => r[COL.publication]))) : null,
      doi: rows.length > 0 ? clean(mode(rows.map((r) => r[COL.doi])))?.replace(/^https?:\/\/doi\.org\//, "") ?? null : null,
      individuals: rows.length,
      match,
    };
  }
}

function describeRows(id, label, rows, match) {
  const lat = mean(rows.map((r) => r[COL.lat]));
  const lon = mean(rows.map((r) => r[COL.lon]));
  const locality = rows.length > 0 ? clean(mode(rows.map((r) => r[COL.locality]))) : null;
  return {
    id,
    label,
    groupId: rows.length > 0 ? clean(mode(rows.map((r) => r[COL.group]))) : null,
    locality: locality === null ? null : locality.split("(")[0].trim(),
    country: rows.length > 0 ? clean(mode(rows.map((r) => r[COL.country]))) : null,
    lat: lat === null ? null : Number(lat.toFixed(3)),
    lon: lon === null ? null : Number(lon.toFixed(3)),
    dateText: rows.length > 0 ? dateText(rows) : null,
    publication: rows.length > 0 ? clean(mode(rows.map((r) => r[COL.publication]))) : null,
    doi: rows.length > 0 ? clean(mode(rows.map((r) => r[COL.doi])))?.replace(/^https?:\/\/doi\.org\//, "") ?? null : null,
    individuals: rows.length,
    match,
  };
}

/* Sites use the rows of their most frequent locality so coordinates name one real place, not a mean over several. */
const sites = CONTEXT_SITES.map((site) => {
  const all = byGroup.get(site.group) ?? [];
  const locality = mode(all.map((r) => r[COL.locality]));
  const rows = locality === null ? all : all.filter((r) => r[COL.locality] === locality);
  return { ...describeRows(site.group, site.label, rows, rows.length > 0 ? "group" : "none"), eras: [site.era], era: site.era, claimIds: site.claims };
});

const out = {
  schemaVersion: 1,
  basisId: panels.basis_id,
  sites,
  source: "AADR v66.p1 annotation files (1240K + HO compatibility); sampling metadata only",
  note: "Coordinates are reference sampling locations, never territories, routes or personal origins.",
  entries,
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
const total = Object.keys(entries).length;
console.log(`gazetteer: ${total} sources, ${matched} matched to AADR rows, ${total - matched} unmatched`);
console.log("unmatched:", Object.values(entries).filter((e) => e.match === "none").map((e) => e.id).join(", ") || "none");
