/**
 * PCA-25 bundle parity + QC tests. Loads the exported bundle and the smartpca
 * parity fixtures from the (gitignored) dataset directory; projects the 16
 * held-out reference samples (full and demo-masked) and compares coordinates.
 * Expected values come from smartpca output, not from the implementation.
 */
import assert from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { projectSample, QcError, type Pca25Bundle } from "../src/features/ancestry/pca25.ts";

const BASE = "dataset/interim/reference-validation/experimental-pca";
const manifest = JSON.parse(readFileSync(`${BASE}/bundle-v1/manifest.json`, "utf8")) as {
  basisId: string;
  dimensions: number;
  markers: number;
  files: Record<string, string>;
};

function doubles(path: string): Float64Array {
  const bytes = readFileSync(path);
  assert.equal(bytes.byteLength % 8, 0, path);
  return new Float64Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

for (const [name, expected] of Object.entries(manifest.files)) {
  const actual = createHash("sha256").update(readFileSync(`${BASE}/bundle-v1/${name}`)).digest("hex");
  assert.equal(actual, expected, `bundle checksum: ${name}`);
}

const bundle: Pca25Bundle = {
  basisId: manifest.basisId,
  dimensions: manifest.dimensions,
  markers: manifest.markers,
  weights: doubles(`${BASE}/bundle-v1/weights.f64`),
  means: doubles(`${BASE}/bundle-v1/means.f64`),
  normalization: doubles(`${BASE}/bundle-v1/normalization.f64`),
  coordinateScales: doubles(`${BASE}/bundle-v1/coordinate-scales.f64`),
};
assert.equal(bundle.dimensions, 25);
assert.equal(bundle.markers, 99794);

function checkParity(fixtureDir: string, label: string): void {
  const meta = JSON.parse(readFileSync(`${fixtureDir}/manifest.json`, "utf8")) as {
    samples: number;
    expected_smartpca: number[][];
  };
  const allCalls = readFileSync(`${fixtureDir}/calls.u8`);
  let maxError = 0;
  for (let i = 0; i < meta.samples; i++) {
    const calls = allCalls.subarray(i * bundle.markers, (i + 1) * bundle.markers);
    const result = projectSample(bundle, new Uint8Array(calls));
    assert.equal(result.coordinates.length, 25);
    assert.ok(result.usableMarkers > 20000, `${label} sample ${i} usable markers: ${result.usableMarkers}`);
    for (let j = 0; j < 25; j++) {
      maxError = Math.max(maxError, Math.abs(result.coordinates[j] - meta.expected_smartpca[i][j]));
    }
  }
  assert.ok(maxError <= 0.000002, `${label} max error ${maxError} exceeds smartpca tolerance`);
  console.log(`${label}: max abs error vs smartpca = ${maxError.toExponential(2)}`);
}

checkParity(`${BASE}/ts-parity`, "full parity");
checkParity(`${BASE}/demo-marker-mask/ts-parity`, "masked parity");

const empty = new Uint8Array(bundle.markers).fill(3);
assert.throws(() => projectSample(bundle, empty), QcError, "all-missing input must fail QC");
const sparse = new Uint8Array(bundle.markers).fill(3);
sparse.fill(0, 0, 100);
assert.throws(() => projectSample(bundle, sparse), QcError, "sparse input must fail QC");
assert.throws(() => projectSample(bundle, new Uint8Array(10)), QcError, "wrong-length input must fail QC");

console.log("PASS pca25");
