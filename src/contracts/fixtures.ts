/** Demo replay bundle (STACK modes). Saved generation, clearly labelled. */

import type { ReplayBundle } from "./index.ts";

const beats = [
  {
    id: "b1", kind: "hook" as const, tStart: 0, tEnd: 6,
    category: "Opening Question", headline: "Some of your matches are 5,000 years old.",
    subtext: "Ancient reference samples, dated by their studies. Tap any claim to see its source.",
    evidenceClass: "editorial" as const, claimIds: ["haak2015"], assetId: "asset-steppe-horseman",
    coords: null, mapPaths: [],
  },
  {
    id: "b2", kind: "method" as const, tStart: 6, tEnd: 14,
    category: "How We Know", headline: "Your report, compared against thousands of ancient genomes.",
    subtext: "Vendor percentages are matched to dated ancient samples. Every claim binds to a paper.",
    evidenceClass: "editorial" as const, claimIds: [], assetId: "asset-method-panel",
    coords: null, mapPaths: [],
  },
  {
    id: "b3", kind: "era" as const, era: "bronze" as const, tStart: 14, tEnd: 40,
    category: "Calculated Affinity", headline: "42.8% Steppe Pastoralist",
    subtext: "Yamnaya Horizon (~3300–2600 BCE). Tap to inspect laboratory evidence.",
    evidenceClass: "personal" as const, claimIds: ["haak2015"], assetId: "asset-steppe-horseman",
    coords: "53°11'N 50°07'E · PONTIC-CASPIAN",
    mapPaths: [
      { to: [20, 41] as [number, number], label: "Corded Ware" },
      { to: [88, 40] as [number, number], label: "Afanasievo" },
    ],
  },
  {
    id: "b4", kind: "era" as const, era: "middle" as const, tStart: 40, tEnd: 66,
    category: "Early Medieval Horizon", headline: "31.4% Scandinavian and Saxon",
    subtext: "Viking Age seafaring (~750–1050 CE). Tap to inspect laboratory evidence.",
    evidenceClass: "personal" as const, claimIds: ["margaryan2020"], assetId: "asset-market-town",
    coords: "59°37'N 17°43'E · BALTIC SEA BASIN",
    mapPaths: [{ to: [46, 30] as [number, number], label: "Sigtuna" }],
  },
  {
    id: "b5", kind: "era" as const, era: "modern" as const, tStart: 66, tEnd: 92,
    category: "Recent Biogeographical Ancestry", headline: "25.8% Northwest European",
    subtext: "Shown as your report words it. Tap to inspect the source.",
    evidenceClass: "personal" as const, claimIds: ["leslie2015"], assetId: "asset-harbor",
    coords: "51°30'N 0°07'W · WESTERN EUROPE",
    mapPaths: [{ to: [50, 36] as [number, number], label: "British Isles" }],
  },
  {
    id: "b6", kind: "convergence" as const, tStart: 92, tEnd: 112,
    category: "Convergence", headline: "Every path leads to you.",
    subtext: "Approved places, revisited with a legend. No route is drawn to a person.",
    evidenceClass: "editorial" as const, claimIds: [], assetId: "asset-convergence-globe",
    coords: null, mapPaths: [],
  },
  {
    id: "b7", kind: "stamp" as const, tStart: 112, tEnd: 120,
    category: "Sources", headline: "PocketDNA. Watch your origins.",
    subtext: "Full sources travel with the export as an evidence manifest.",
    evidenceClass: "editorial" as const, claimIds: [], assetId: "asset-stamp-dark",
    coords: null, mapPaths: [],
  },
];

export const REPLAY: ReplayBundle = {
  mode: "replay",
  plan: {
    version: 1,
    duration_s: 120,
    question: "How much can one word in your report tell you?",
    answer: "Your report gave you a region. The evidence gave it depth.",
    beats,
    audits: { narrative: "pass", compliance: "pass" },
  },
  evidence: {
    kind: "raw",
    basisId: "pocketdna-pca25-demo",
    markerCount: 612409,
    usableMarkers: 164204,
    epochs: [
      {
        era: "bronze",
        shares: [
          { id: "steppe", label: "Steppe Pastoralist", weight: 0.428, low: 0.372, high: 0.479 },
          { id: "farmer", label: "Early Farmer", weight: 0.341, low: 0.29, high: 0.39 },
          { id: "hunter", label: "Western Hunter-Gatherer", weight: 0.231, low: 0.183, high: 0.28 },
        ],
        closest: [{ label: "Yamnaya, Samara", distance: 0.041 }],
      },
      {
        era: "middle",
        shares: [
          { id: "scand", label: "Scandinavian and Saxon", weight: 0.314, low: 0.262, high: 0.368 },
          { id: "local", label: "Local continuity", weight: 0.686, low: 0.632, high: 0.738 },
        ],
        closest: [{ label: "Sigtuna, Viking Age", distance: 0.052 }],
      },
      {
        era: "modern",
        shares: [
          { id: "nwe", label: "Northwest European", weight: 0.258, low: 0.21, high: 0.31 },
          { id: "other", label: "Other reported", weight: 0.742, low: 0.69, high: 0.79 },
        ],
        closest: [{ label: "Present-day panel", distance: 0.018 }],
      },
    ],
    limitations: [
      "Replay: saved illustrative generation, not a live measurement.",
      "Ranges are bootstrap 5–95 intervals on the fitted shares.",
    ],
  },
  claims: [
    {
      id: "haak2015", text: "Steppe pastoralists migrated into central Europe ~4,500 years ago.",
      class: "context",
      source: { authors: "Haak et al.", year: 2015, venue: "Nature 522, 207–211", doi: "10.1038/nature14317" },
      detail: "Replay illustration of the fit card; live mode recomputes from your file.",
    },
    {
      id: "margaryan2020", text: "Viking Age Scandinavians settled widely across Europe.",
      class: "context",
      source: { authors: "Margaryan et al.", year: 2020, venue: "Nature 585, 390–396", doi: "10.1038/s41586-020-2688-8" },
      detail: "Replay illustration of the fit card; live mode recomputes from your file.",
    },
    {
      id: "leslie2015", text: "Fine-scale genetic structure of the British Isles.",
      class: "context",
      source: { authors: "Leslie et al.", year: 2015, venue: "Nature 519, 309–314", doi: "10.1038/nature14230" },
      detail: "Provider percentage shown as reported; screenshot claims never imply SNP analysis.",
    },
  ],
};
