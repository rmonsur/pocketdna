/**
 * Harmonization + raw analysis tests. Genotypes are synthetic; expected calls
 * are worked out by hand from the bundle convention (copies of a1, 3=missing).
 */
import assert from "node:assert";
import { alignExport, harmonizeCall } from "../src/features/ancestry/harmonize.ts";
import { analyzeRaw, projectRows } from "../src/features/ancestry/analyzeRaw.ts";
import { experimentalProjection } from "../src/features/ancestry/experimentalProjection.ts";
import type { Pca25Bundle } from "../src/features/ancestry/pca25.ts";

assert.deepEqual(harmonizeCall("AG", "A", "G"), { call: 1, outcome: "direct" });
assert.deepEqual(harmonizeCall("AA", "A", "G"), { call: 2, outcome: "direct" });
assert.deepEqual(harmonizeCall("CT", "A", "G"), { call: 1, outcome: "complement" }); // CT complements to GA
assert.deepEqual(harmonizeCall("CC", "A", "G"), { call: 0, outcome: "complement" }); // CC -> GG
assert.deepEqual(harmonizeCall("--", "A", "G"), { call: 3, outcome: "missing" });
assert.deepEqual(harmonizeCall("AI", "A", "G"), { call: 3, outcome: "missing" });
assert.deepEqual(harmonizeCall("AC", "A", "G"), { call: 3, outcome: "missing" }); // strand-ambiguous pair, neither matches

const markers = [
  { id: "rs1", a1: "A", a2: "G" },
  { id: "rs2", a1: "C", a2: "T" },
  { id: "rs3", a1: "A", a2: "T" },
];
const text = "# synthetic\nrs1\t1\t100\tAG\nrs2\t1\t200\tGG\nrsX\t1\t300\tAA\n";
const aligned = alignExport(text, markers);
assert.deepEqual([...aligned.calls], [1, 2, 3]); // GG complements to CC = 2 copies of a1
assert.equal(aligned.stats.direct, 1);
assert.equal(aligned.stats.complement, 1);
assert.equal(aligned.stats.absent, 1);

/* projectRows (normal equations) must agree with the QR solver. */
const bundle: Pca25Bundle = {
  basisId: "test",
  dimensions: 2,
  markers: 4,
  weights: new Float64Array([1, 0, 0, 1, 1, 1, 4, 8]),
  means: new Float64Array([0, 0, 0, 0]),
  normalization: new Float64Array([1, 1, 1, 1]),
  coordinateScales: new Float64Array([1, 1]),
};
const calls = new Uint8Array([0, 1, 2, 3]);
const viaNE = projectRows(bundle, calls, new Uint32Array([0, 1, 2, 3]));
const viaQR = experimentalProjection({
  dimensions: 2, calls, weights: bundle.weights, means: bundle.means,
  normalization: bundle.normalization, coordinateScales: bundle.coordinateScales,
});
assert.ok(Math.abs(viaNE[0] - viaQR[0]) < 1e-9 && Math.abs(viaNE[1] - viaQR[1]) < 1e-9, "NE vs QR agreement");

assert.throws(
  () => analyzeRaw(bundle, new Uint16Array(4), calls, {}, { bootstrap: 0 }),
  /Insufficient usable markers/,
  "QC floor rejects sparse input",
);

console.log("PASS rawAnalysis");
