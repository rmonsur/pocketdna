import { strict as assert } from "node:assert";
import { test } from "node:test";
import { experimentalProjection } from "../src/features/ancestry/experimentalProjection.ts";

const data = {
  dimensions: 2,
  calls: new Uint8Array([0, 1, 2, 3]),
  weights: new Float64Array([1, 0, 0, 1, 1, 1, 4, 8]),
  means: new Float64Array([0, 0, 0, 0]),
  normalization: new Float64Array([1, 1, 1, 1]),
  coordinateScales: new Float64Array([1, 1]),
};

test("QR projection solves over observed calls and ignores missing markers", () => {
  const result = experimentalProjection(data);
  assert.ok(Math.abs(result[0] - 1 / 3) < 1e-12);
  assert.ok(Math.abs(result[1] - 4 / 3) < 1e-12);
});

test("QR projection rejects rank-deficient and invalid input", () => {
  assert.throws(() => experimentalProjection({ ...data, weights: new Float64Array([1, 1, 2, 2, 3, 3, 0, 0]) }), /Rank deficient/);
  assert.throws(() => experimentalProjection({ ...data, calls: new Uint8Array([0, 1, 2, 4]) }), /Invalid genotype/);
});
