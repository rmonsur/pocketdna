/**
 * Reference panel for the browser engine. Two static files, exported by
 * backend/pipeline/export_web_panel.py:
 *   panel.meta.json  snps, sources, centroids (JSON)
 *   panel.f32        mean (M) then V (M*K row-major), little-endian float32
 */

export const EPOCHS = ["bronze", "middle", "modern"] as const;
export type Epoch = (typeof EPOCHS)[number];

export interface EpochSources {
  ids: readonly string[];
  labels: readonly string[];
  centroids: readonly (readonly number[])[];
}

export interface PanelMeta {
  panel_id: string;
  n_snps: number;
  n_pcs: number;
  snps: readonly string[];
  epochs: Record<Epoch, EpochSources>;
}

export interface Panel {
  panelId: string;
  nSnps: number;
  nPcs: number;
  snps: readonly string[];
  mean: Float32Array;
  /** Row-major M x K loadings. */
  loadings: Float32Array;
  epochs: Record<Epoch, EpochSources>;
}

const FLOAT32_BYTES = 4;

export class PanelFormatError extends Error {}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isNumberMatrix(v: unknown): v is number[][] {
  return Array.isArray(v) && v.every((r) => Array.isArray(r) && r.every((x) => typeof x === "number"));
}

function parseEpoch(v: unknown, nPcs: number, name: string): EpochSources {
  if (!isRecord(v) || !isStringArray(v.ids) || !isStringArray(v.labels) || !isNumberMatrix(v.centroids)) {
    throw new PanelFormatError(`panel meta: bad epoch ${name}`);
  }
  const n = v.ids.length;
  if (v.labels.length !== n || v.centroids.length !== n || v.centroids.some((r) => r.length !== nPcs)) {
    throw new PanelFormatError(`panel meta: epoch ${name} sizes disagree`);
  }
  return { ids: v.ids, labels: v.labels, centroids: v.centroids };
}

/** Validate untrusted JSON into PanelMeta. Fails fast with the offending field. */
export function parsePanelMeta(raw: unknown): PanelMeta {
  if (!isRecord(raw)) throw new PanelFormatError("panel meta: not an object");
  const { panel_id, n_snps, n_pcs, snps, epochs } = raw;
  if (typeof panel_id !== "string" || typeof n_snps !== "number" || typeof n_pcs !== "number") {
    throw new PanelFormatError("panel meta: missing panel_id / n_snps / n_pcs");
  }
  if (!isStringArray(snps) || snps.length !== n_snps) throw new PanelFormatError("panel meta: snps");
  if (!isRecord(epochs)) throw new PanelFormatError("panel meta: epochs");
  return {
    panel_id,
    n_snps,
    n_pcs,
    snps,
    epochs: {
      bronze: parseEpoch(epochs.bronze, n_pcs, "bronze"),
      middle: parseEpoch(epochs.middle, n_pcs, "middle"),
      modern: parseEpoch(epochs.modern, n_pcs, "modern"),
    },
  };
}

/** Attach the float32 vectors to validated meta. Copies into aligned arrays. */
export function panelFromFiles(meta: PanelMeta, vectors: ArrayBuffer): Panel {
  const expected = meta.n_snps * (1 + meta.n_pcs);
  if (vectors.byteLength !== expected * FLOAT32_BYTES) {
    throw new PanelFormatError(`panel.f32: expected ${expected} floats, got ${vectors.byteLength / FLOAT32_BYTES}`);
  }
  const view = new DataView(vectors);
  const all = new Float32Array(expected);
  for (let i = 0; i < expected; i += 1) all[i] = view.getFloat32(i * FLOAT32_BYTES, true);
  return {
    panelId: meta.panel_id,
    nSnps: meta.n_snps,
    nPcs: meta.n_pcs,
    snps: meta.snps,
    mean: all.subarray(0, meta.n_snps),
    loadings: all.subarray(meta.n_snps),
    epochs: meta.epochs,
  };
}
