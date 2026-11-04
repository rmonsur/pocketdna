/**
 * Mixture solver tests. Expected weights are the known synthetic mixtures used
 * to build each target (independent of the solver), mirroring the Python
 * engine's contract: nonnegative weights summing exactly to one.
 */
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fitMixture } from "../src/features/ancestry/mixture.ts";

/* Deterministic pseudo-random sources (fixed seed LCG), 5 sources x 25 dims. */
let state = 42;
const rand = (): number => {
  state = (state * 1103515245 + 12345) % 2147483648;
  return state / 2147483648 - 0.5;
};
const sources = Array.from({ length: 5 }, () => Array.from({ length: 25 }, rand));

function mix(weights: number[]): number[] {
  return Array.from({ length: 25 }, (_, d) => weights.reduce((acc, w, i) => acc + w * sources[i][d], 0));
}

const truth = [0.5, 0.3, 0.2, 0, 0];
const fitted = fitMixture(sources, mix(truth));
truth.forEach((w, i) => assert.ok(Math.abs(fitted.weights[i] - w) < 1e-6, `weight ${i}: ${fitted.weights[i]} vs ${w}`));
assert.ok(Math.abs([...fitted.weights].reduce((a, b) => a + b, 0) - 1) < 1e-9, "weights sum to one");
assert.ok(fitted.residual < 1e-9, `exact mixture residual ${fitted.residual}`);

const vertex = fitMixture(sources, mix([0, 0, 0, 1, 0]));
assert.ok(vertex.weights[3] > 1 - 1e-6, "vertex mixture recovers the single source");

const noisy = mix(truth).map((v, i) => v + (i % 3 === 0 ? 0.001 : -0.0005));
const noisyFit = fitMixture(sources, noisy);
truth.forEach((w, i) => assert.ok(Math.abs(noisyFit.weights[i] - w) < 0.02, `noisy weight ${i}`));
assert.ok([...noisyFit.weights].every((w) => w >= 0), "noisy fit stays nonnegative");

/* Cross-language oracle: same problem solved by the Python engine (scipy SLSQP). */
const oracle = JSON.parse(
  readFileSync("dataset/interim/reference-validation/experimental-pca/mixture-oracle.json", "utf8"),
) as { centroids: number[][]; target: number[]; python_weights: number[]; tolerance: number };
const oracleFit = fitMixture(oracle.centroids, oracle.target);
oracle.python_weights.forEach((w, i) =>
  assert.ok(Math.abs(oracleFit.weights[i] - w) < oracle.tolerance, `oracle weight ${i}: TS ${oracleFit.weights[i]} vs Python ${w}`),
);

/* Many more sources than dimensions (modern panel regime: 226 sources, 25 PCs). */
const manySources = Array.from({ length: 60 }, () => Array.from({ length: 25 }, rand));
const manyTruth: number[] = Array.from({ length: 60 }, (_, i) => (i === 3 ? 0.6 : i === 17 ? 0.4 : 0));
const manyTarget = Array.from({ length: 25 }, (_, d) => manyTruth.reduce((acc, w, i) => acc + w * manySources[i][d], 0));
const manyFit = fitMixture(manySources, manyTarget);
assert.ok(Math.abs(manyFit.weights[3] - 0.6) < 1e-6 && Math.abs(manyFit.weights[17] - 0.4) < 1e-6, "k>>dims mixture recovers");

assert.throws(() => fitMixture([], [1, 2]), /invalid mixture dimensions/);
assert.throws(() => fitMixture([[1, 2]], [1]), /invalid mixture dimensions/);
assert.throws(() => fitMixture([[Number.NaN, 2]], [1, 2]), /non-finite mixture inputs/);

console.log("PASS mixture");
