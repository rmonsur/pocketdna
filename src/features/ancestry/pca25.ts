/**
 * PocketDNA PCA-25 runtime projection (native coordinates; NOT Global25).
 * Consumes the portable bundle exported by research/export_pca25_bundle.py.
 * Status: experimental basis — personal raw-DNA results stay disabled until the
 * docs/BIOINFORMATICS.md gates close. Calls use the bundle convention:
 * copies of allele a1 in {0,1,2}, 3 = missing.
 */

import { experimentalProjection } from "./experimentalProjection.ts";

export interface Pca25Bundle {
  basisId: string;
  dimensions: number;
  markers: number;
  weights: Float64Array;
  means: Float64Array;
  normalization: Float64Array;
  coordinateScales: Float64Array;
}

export interface ProjectionResult {
  coordinates: Float64Array;
  usableMarkers: number;
  callRate: number;
}

export class QcError extends Error {}

/**
 * QC floor selected from research/validate_consumer_masks.py (2026-11-05):
 * under the real consumer chip mask (~47k bundle markers), coordinate shift
 * vs full-data smartpca is p95 0.32 training SD at ~46k usable markers and
 * degrades to 0.41 at ~33k and 0.52 at ~23k. The floor keeps runtime inputs
 * in the measured regime; it does not make masked coordinates exact, and the
 * prespecified 0.25 SD acceptance was NOT met (see validation report).
 */
export const MIN_USABLE_MARKERS = 40000;

export function validateBundle(bundle: Pca25Bundle): void {
  const { dimensions: n, markers: m } = bundle;
  if (!Number.isInteger(n) || n < 1 || n > 128) throw new QcError("Invalid bundle dimensions");
  if (bundle.weights.length !== m * n) throw new QcError("Bundle weights shape mismatch");
  if (bundle.means.length !== m || bundle.normalization.length !== m) throw new QcError("Bundle vector shape mismatch");
  if (bundle.coordinateScales.length !== n) throw new QcError("Bundle scales shape mismatch");
}

export function projectSample(bundle: Pca25Bundle, calls: Uint8Array): ProjectionResult {
  validateBundle(bundle);
  if (calls.length !== bundle.markers) throw new QcError("Call vector length does not match bundle markers");
  let usable = 0;
  for (const c of calls) if (c !== 3) usable += 1;
  if (usable < MIN_USABLE_MARKERS) {
    throw new QcError(`Insufficient usable markers: ${usable} < ${MIN_USABLE_MARKERS}`);
  }
  const coordinates = experimentalProjection({
    dimensions: bundle.dimensions,
    calls,
    weights: bundle.weights,
    means: bundle.means,
    normalization: bundle.normalization,
    coordinateScales: bundle.coordinateScales,
  });
  return { coordinates, usableMarkers: usable, callRate: usable / bundle.markers };
}
