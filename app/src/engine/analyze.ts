/**
 * Deep-time engine: project genotypes onto the panel eigenspace, then per-epoch
 * constrained mixture fits with a marker bootstrap. Port of backend/pipeline/engine.py.
 * Runs in a Web Worker; nothing here touches the network.
 */

import { simplexLeastSquares, solve } from "./linalg";
import { EPOCHS, type Epoch, type EpochSources, type Panel } from "./panel";
import { type Resampler, seededResampler } from "./rng";

export interface Encoded {
  dosage: Float64Array;
  rows: Uint32Array;
}

export interface Share {
  id: string;
  label: string;
  weight: number;
  low: number;
  high: number;
}

export interface Closest {
  label: string;
  distance: number;
}

export interface EpochResult {
  shares: Share[];
  closest: Closest[];
}

export interface Analysis {
  panel_id: string;
  n_markers_total: number;
  n_markers_usable: number;
  pc_coords: number[];
  epochs: Record<Epoch, EpochResult>;
}

export interface AnalyzeOptions {
  seed?: number;
  nBoot?: number;
  resampler?: Resampler;
}

export const MIN_USABLE_MARKERS = 50;
export const DEFAULT_N_BOOT = 200;
export const DEFAULT_SEED = 0;
const CLOSEST_K = 3;
const LOW_PCT = 5;
const HIGH_PCT = 95;
const PCT_DENOM = 100;
const ROUND_PLACES = 4;
const ROUND_SCALE = 10 ** ROUND_PLACES;
const SNP_SPEC_SEP = ":";
const SNP_SPEC_ALT_INDEX = 2;

export class TooFewMarkersError extends Error {}

export function round4(x: number): number {
  return Math.round(x * ROUND_SCALE) / ROUND_SCALE;
}

/** Alt-allele dosage over panel SNPs present in calls, with panel row indices. */
export function encode(calls: ReadonlyMap<string, string>, snps: readonly string[]): Encoded {
  const dosage: number[] = [];
  const rows: number[] = [];
  snps.forEach((spec, i) => {
    const parts = spec.split(SNP_SPEC_SEP);
    const geno = calls.get(parts[0]);
    const ref = parts[1];
    const alt = parts[SNP_SPEC_ALT_INDEX];
    if (geno === undefined || geno.length !== 2 || [...geno].some((base) => base !== ref && base !== alt)) return;
    let count = 0;
    for (const base of geno) if (base === alt) count += 1;
    dosage.push(count);
    rows.push(i);
  });
  return { dosage: Float64Array.from(dosage), rows: Uint32Array.from(rows) };
}

/** Least-squares projection over observed loci; no unvalidated coverage multiplier. */
export function project(dosage: ArrayLike<number>, rows: ArrayLike<number>, panel: Panel): number[] {
  const k = panel.nPcs;
  const n = rows.length;
  // Accumulate the normal equations straight off the flat loadings: no per-marker
  // views, which is what makes 200 bootstraps affordable in a Web Worker.
  const ata: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const atb = new Array<number>(k).fill(0);
  const loadings = panel.loadings;
  for (let i = 0; i < n; i += 1) {
    const r = rows[i];
    const base = r * k;
    const y = dosage[i] - panel.mean[r];
    for (let a = 0; a < k; a += 1) {
      const va = loadings[base + a];
      atb[a] += va * y;
      const rowA = ata[a];
      for (let b = a; b < k; b += 1) rowA[b] += va * loadings[base + b];
    }
  }
  for (let a = 0; a < k; a += 1) {
    for (let b = 0; b < a; b += 1) ata[a][b] = ata[b][a];
  }
  return solve(ata, atb);
}

/** Fit nonnegative weights with an exact sum-to-one constraint. */
export function fitWeights(coords: readonly number[], centroids: readonly (readonly number[])[]): number[] {
  return simplexLeastSquares(centroids, coords);
}

export function closest(coords: readonly number[], sources: EpochSources, k = CLOSEST_K): Closest[] {
  const dists = sources.centroids.map((c, i) => ({
    label: sources.labels[i],
    distance: Math.hypot(...c.map((v, j) => v - coords[j])),
  }));
  return [...dists]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k)
    .map((d) => ({ label: d.label, distance: round4(d.distance) }));
}

/** numpy.percentile default: linear interpolation between order statistics. */
export function percentile(values: readonly number[], pct: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const pos = ((sorted.length - 1) * pct) / PCT_DENOM;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function gather(src: ArrayLike<number>, idx: ArrayLike<number>): Float64Array {
  const out = new Float64Array(idx.length);
  for (let i = 0; i < idx.length; i += 1) out[i] = src[idx[i]];
  return out;
}

function epochResult(coords: readonly number[], boots: readonly (readonly number[])[], sources: EpochSources): EpochResult {
  const weights = fitWeights(coords, sources.centroids);
  const bootWeights = boots.map((bc) => fitWeights(bc, sources.centroids));
  const shares = weights.map((w, i) => ({
    id: sources.ids[i],
    label: sources.labels[i],
    weight: round4(w),
    low: round4(percentile(bootWeights.map((bw) => bw[i]), LOW_PCT)),
    high: round4(percentile(bootWeights.map((bw) => bw[i]), HIGH_PCT)),
  }));
  return { shares, closest: closest(coords, sources) };
}

export function analyze(calls: ReadonlyMap<string, string>, panel: Panel, opts: AnalyzeOptions = {}): Analysis {
  const { dosage, rows } = encode(calls, panel.snps);
  if (rows.length < MIN_USABLE_MARKERS) {
    throw new TooFewMarkersError(`only ${rows.length} usable markers; need >= ${MIN_USABLE_MARKERS}`);
  }
  const nBoot = opts.nBoot ?? DEFAULT_N_BOOT;
  const resample = opts.resampler ?? seededResampler(opts.seed ?? DEFAULT_SEED);
  const coords = project(dosage, rows, panel);
  // Resample markers once: the projection is epoch-independent, so all epochs share
  // the same resamples and their intervals are directly comparable.
  const boots: number[][] = [];
  for (let b = 0; b < nBoot; b += 1) {
    const pick = resample(b, rows.length);
    boots.push(project(gather(dosage, pick), gather(rows, pick), panel));
  }
  const epochs = Object.fromEntries(
    EPOCHS.map((e) => [e, epochResult(coords, boots, panel.epochs[e])]),
  ) as Record<Epoch, EpochResult>;
  return {
    panel_id: panel.panelId,
    n_markers_total: calls.size,
    n_markers_usable: rows.length,
    pc_coords: coords.map(round4),
    epochs,
  };
}
