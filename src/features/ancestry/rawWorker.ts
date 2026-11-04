/** Raw-DNA Web Worker: parse -> harmonize -> project -> era fits, on-device. */

import { analyzeRaw, type EraPanels } from "./analyzeRaw.ts";
import { alignExport, type MarkerRef } from "./harmonize.ts";
import type { Pca25Bundle } from "./pca25.ts";

interface WorkerRequest {
  text: string;
  bundleBase: string;
  panelsUrl: string;
}

async function fetchDoubles(base: string, name: string): Promise<Float64Array> {
  const res = await fetch(`${base}/${name}`);
  if (!res.ok) throw new Error(`bundle fetch failed: ${name}`);
  const buf = await res.arrayBuffer();
  return new Float64Array(buf);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const post = (step: string): void => self.postMessage({ type: "progress", step });
  try {
    const { text, bundleBase, panelsUrl } = event.data;
    post("Loading PCA-25 reference bundle");
    const manifestRes = await fetch(`${bundleBase}/manifest.json`);
    if (!manifestRes.ok) throw new Error("bundle manifest unavailable");
    const manifest = (await manifestRes.json()) as { basisId: string; dimensions: number; markers: number };
    const markersRes = await fetch(`${bundleBase}/markers.tsv`);
    if (!markersRes.ok) throw new Error("bundle markers unavailable");
    const markerLines = (await markersRes.text()).split("\n").slice(1).filter((l) => l.length > 0);
    const markers: MarkerRef[] = [];
    const chroms = new Uint16Array(manifest.markers);
    markerLines.forEach((line, i) => {
      const [id, chrom, , a1, a2] = line.split("\t");
      markers.push({ id, a1, a2 });
      chroms[i] = Number(chrom) || 0;
    });
    const [weights, means, normalization, coordinateScales, panelsRes] = await Promise.all([
      fetchDoubles(bundleBase, "weights.f64"),
      fetchDoubles(bundleBase, "means.f64"),
      fetchDoubles(bundleBase, "normalization.f64"),
      fetchDoubles(bundleBase, "coordinate-scales.f64"),
      fetch(panelsUrl),
    ]);
    if (!panelsRes.ok) throw new Error("era panels unavailable");
    const panelsDoc = (await panelsRes.json()) as { panels: EraPanels };
    const bundle: Pca25Bundle = {
      basisId: manifest.basisId,
      dimensions: manifest.dimensions,
      markers: manifest.markers,
      weights,
      means,
      normalization,
      coordinateScales,
    };

    post("Aligning your file to 99,794 markers (on-device)");
    const aligned = alignExport(text, markers);
    post(`Projecting onto PCA-25 (${aligned.stats.direct + aligned.stats.complement} calls harmonized)`);
    const result = analyzeRaw(bundle, chroms, aligned.calls, panelsDoc.panels, { bootstrap: 24 });
    self.postMessage({
      type: "result",
      result: { ...result, harmonization: aligned.stats },
    });
  } catch (err) {
    self.postMessage({ type: "error", message: err instanceof Error ? err.message : "raw analysis failed" });
  }
};
