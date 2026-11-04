/** Offline comparison with smartpca reference outputs; input contains no consumer genotypes. */
import { readFileSync, writeFileSync } from "node:fs";
import { endianness } from "node:os";
import { experimentalProjection } from "../src/features/ancestry/experimentalProjection.ts";

const dir = process.argv[2] ?? "dataset/interim/reference-validation/experimental-pca/ts-parity";
const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, "utf8")) as {
  markers: number; dimensions: number; samples: number; expected_smartpca: number[][];
};
if (endianness() !== "LE") throw new Error("Fixture requires a little-endian host");
function doubles(name: string): Float64Array {
  const bytes = readFileSync(`${dir}/${name}.f64`);
  if (bytes.byteLength % 8 !== 0) throw new Error(`Invalid ${name} length`);
  return new Float64Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
const weights = doubles("weights");
const means = doubles("means");
const normalization = doubles("normalization");
const coordinateScales = doubles("coordinate-scales");
const allCalls = readFileSync(`${dir}/calls.u8`);
if (allCalls.length !== manifest.samples * manifest.markers || manifest.expected_smartpca.length !== manifest.samples) {
  throw new Error("Invalid parity fixture dimensions");
}
let maxAbsError = 0;
let sumSquaredError = 0;
for (let i = 0; i < manifest.samples; i++) {
  const calls = allCalls.subarray(i * manifest.markers, (i + 1) * manifest.markers);
  const predicted = experimentalProjection({ dimensions: manifest.dimensions, calls, weights, means, normalization, coordinateScales });
  if (manifest.expected_smartpca[i].length !== manifest.dimensions) throw new Error("Invalid expected coordinate length");
  for (let j = 0; j < predicted.length; j++) {
    const error = Math.abs(predicted[j] - manifest.expected_smartpca[i][j]);
    maxAbsError = Math.max(maxAbsError, error);
    sumSquaredError += error * error;
  }
}
const tolerance = 0.000002; // Set before comparison; smartpca writes six decimal places.
const result = {
  samples: manifest.samples, markers: manifest.markers, dimensions: manifest.dimensions,
  maxAbsError, rmse: Math.sqrt(sumSquaredError / (manifest.samples * manifest.dimensions)),
  tolerance, passed: maxAbsError <= tolerance,
  scope: "Experimental reference samples; basis-fitted coordinate scales; not production validation.",
};
writeFileSync(`${dir}/result.json`, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result)}\n`);
if (!result.passed) process.exitCode = 1;
