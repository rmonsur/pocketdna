/**
 * Full raw analysis in the browser: aligned calls -> PCA-25 projection ->
 * per-era mixture fits against the era panels, with chromosome-block
 * bootstrap ranges. Genotypes never leave the device.
 */

import { fitMixture, solveLinear } from "./mixture.ts";
import { QcError, validateBundle, type Pca25Bundle } from "./pca25.ts";

export interface EraPanelSource {
  source_id: string;
  era_group: string;
  n_individuals: number;
  centroid: number[];
}

export type EraPanels = Record<string, EraPanelSource[]>;

export interface EraFitShare {
  source_id: string;
  /** Curated panel family label (era_group), readable on screen; the id stays the panel key. */
  label: string;
  weight: number;
  low: number;
  high: number;
}

export interface EraFitResult {
  era: string;
  shares: EraFitShare[];
  residual: number;
  closest: { source_id: string; label: string; distance: number }[];
}

export interface RawAnalysisResult {
  basisId: string;
  markers: number;
  coordinates: number[];
  usableMarkers: number;
  callRate: number;
  eras: EraFitResult[];
  limitations: string[];
}

/** Least squares via normal equations over the given row indices (may repeat). */
export function projectRows(bundle: Pca25Bundle, calls: Uint8Array, rows: Uint32Array): Float64Array {
  const n = bundle.dimensions;
  const gram = new Float64Array(n * n);
  const cross = new Float64Array(n);
  const wRow = new Float64Array(n);
  for (const i of rows) {
    const call = calls[i];
    if (call === 3) continue;
    const value = (call - bundle.means[i]) * bundle.normalization[i];
    for (let j = 0; j < n; j++) wRow[j] = bundle.weights[i * n + j];
    for (let a = 0; a < n; a++) {
      cross[a] += wRow[a] * value;
      for (let b = a; b < n; b++) gram[a * n + b] += wRow[a] * wRow[b];
    }
  }
  for (let a = 0; a < n; a++) for (let b = 0; b < a; b++) gram[a * n + b] = gram[b * n + a];
  const beta = solveLinear(gram, cross, n);
  for (let j = 0; j < n; j++) beta[j] *= bundle.coordinateScales[j];
  return beta;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Panel family label for display; present-day groups are keyed by name, so underscores become spaces. */
function readableLabel(source: EraPanelSource): string {
  return source.era_group.replace(/_/g, " ");
}

const LIMITATIONS = [
  "Experimental PocketDNA PCA-25 coordinates; not Global25 and not comparable to it.",
  "Consumer-mask validation: coordinates from chip-density data shift ~0.3 SD (p95) vs full-marker scores.",
  "Era panels are experimental: bronze coverage is sparse (20 sources); panel sparsity limits fit precision.",
  "Bootstrap ranges resample chromosomes; they describe fit stability, not confidence in ancestry.",
];

export function analyzeRaw(
  bundle: Pca25Bundle,
  markerChroms: Uint16Array,
  calls: Uint8Array,
  panels: EraPanels,
  opts: { bootstrap?: number; seed?: number } = {},
): RawAnalysisResult {
  validateBundle(bundle);
  if (calls.length !== bundle.markers) throw new QcError("Call vector length does not match bundle markers");
  const obsRows: number[] = [];
  for (let i = 0; i < calls.length; i++) if (calls[i] !== 3) obsRows.push(i);
  if (obsRows.length < 40000) {
    throw new QcError(`Insufficient usable markers: ${obsRows.length} < 40000 (measured QC floor)`);
  }
  const obs = Uint32Array.from(obsRows);
  const coordinates = projectRows(bundle, calls, obs);

  const eras = Object.entries(panels).map(([era, sources]) => {
    const centroids = sources.map((s) => s.centroid);
    const fit = fitMixture(centroids, coordinates);
    const closest = sources
      .map((s, i) => ({
        source_id: s.source_id,
        label: readableLabel(s),
        distance: Math.hypot(...s.centroid.map((v, j) => v - coordinates[j])),
        index: i,
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(({ source_id, label, distance }) => ({ source_id, label, distance }));
    return { era, sources, fit, closest };
  });

  const bootstrap = opts.bootstrap ?? 24;
  const samplesByEra = new Map<string, Float64Array[]>();
  if (bootstrap > 0) {
    const chroms = new Map<number, number[]>();
    for (const i of obsRows) {
      const c = markerChroms[i];
      if (!chroms.has(c)) chroms.set(c, []);
      chroms.get(c)?.push(i);
    }
    const chromList = [...chroms.keys()];
    const rand = mulberry32(opts.seed ?? 20261105);
    for (let rep = 0; rep < bootstrap; rep++) {
      const rows: number[] = [];
      for (let k = 0; k < chromList.length; k++) {
        const picked = chromList[Math.floor(rand() * chromList.length)];
        rows.push(...(chroms.get(picked) ?? []));
      }
      const repCoords = projectRows(bundle, calls, Uint32Array.from(rows));
      for (const { era, sources } of eras) {
        const repFit = fitMixture(sources.map((s) => s.centroid), repCoords);
        if (!samplesByEra.has(era)) samplesByEra.set(era, []);
        samplesByEra.get(era)?.push(repFit.weights);
      }
    }
  }

  return {
    basisId: bundle.basisId,
    markers: bundle.markers,
    coordinates: [...coordinates],
    usableMarkers: obsRows.length,
    callRate: obsRows.length / bundle.markers,
    eras: eras.map(({ era, sources, fit, closest }) => ({
      era,
      residual: fit.residual,
      closest,
      shares: sources
        .map((s, i) => {
          const reps = samplesByEra.get(era) ?? [];
          const values = reps.map((w) => w[i]).sort((a, b) => a - b);
          const pct = (p: number): number =>
            values.length === 0 ? fit.weights[i] : values[Math.min(values.length - 1, Math.floor(p * values.length))];
          return { source_id: s.source_id, label: readableLabel(s), weight: fit.weights[i], low: pct(0.05), high: pct(0.95) };
        })
        .sort((a, b) => b.weight - a.weight),
    })),
    limitations: LIMITATIONS,
  };
}
