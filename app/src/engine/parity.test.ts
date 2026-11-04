/**
 * Python <-> TypeScript parity. Fixture from backend/pipeline/parity_fixture.py:
 * same raw file, same panel, same resample indices -> same numbers to four decimals.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { analyze, encode, fitWeights, project } from "./analyze";
import { panelFromFiles, parsePanelMeta, EPOCHS } from "./panel";
import { parseRaw } from "./parse";
import type { Resampler } from "./rng";

const FIXTURES = path.resolve(__dirname, "..", "src", "engine", "fixtures");
const TOL = 1e-4;
const U16_BYTES = 2;

interface EpochTruth {
  weights: number[];
  low: number[];
  high: number[];
  closest: { label: string; distance: number }[];
}

interface Parity {
  panel_id: string;
  parse: { vendor: string; n_calls: number; n_lines: number; n_skipped: number; n_nocall: number };
  n_markers_usable: number;
  pc_coords: number[];
  resample_u16_b64: string;
  n_boot: number;
  epochs: Record<(typeof EPOCHS)[number], EpochTruth>;
}

function loadFixture(): { truth: Parity; text: string; panel: ReturnType<typeof panelFromFiles> } {
  const truth = JSON.parse(readFileSync(path.join(FIXTURES, "parity.json"), "utf8")) as Parity;
  const text = readFileSync(path.join(FIXTURES, "mini-genome.txt"), "utf8");
  const meta = parsePanelMeta(JSON.parse(readFileSync(path.join(FIXTURES, "panel.meta.json"), "utf8")));
  const raw = readFileSync(path.join(FIXTURES, "panel.f32"));
  const buf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  return { truth, text, panel: panelFromFiles(meta, buf) };
}

function fixedResampler(b64: string, n: number): Resampler {
  const bytes = Buffer.from(b64, "base64");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return (boot, size) => {
    assert.equal(size, n);
    const out = new Uint32Array(n);
    for (let i = 0; i < n; i += 1) out[i] = view.getUint16((boot * n + i) * U16_BYTES, true);
    return out;
  };
}

function assertClose(actual: number, expected: number, what: string): void {
  assert.ok(Math.abs(actual - expected) <= TOL, `${what}: ${actual} vs ${expected}`);
}

test("parse counts match Python", () => {
  const { truth, text } = loadFixture();
  const parsed = parseRaw("23andme", text);
  assert.equal(parsed.vendor, truth.parse.vendor);
  assert.equal(parsed.calls.size, truth.parse.n_calls);
  assert.equal(parsed.nLines, truth.parse.n_lines);
  assert.equal(parsed.nSkipped, truth.parse.n_skipped);
  assert.equal(parsed.nNocall, truth.parse.n_nocall);
});

test("projection, weights, intervals and closest match Python to 1e-4", () => {
  const { truth, text, panel } = loadFixture();
  const parsed = parseRaw("23andme", text);
  const out = analyze(parsed.calls, panel, {
    nBoot: truth.n_boot,
    resampler: fixedResampler(truth.resample_u16_b64, truth.n_markers_usable),
  });
  assert.equal(out.panel_id, truth.panel_id);
  assert.equal(out.n_markers_usable, truth.n_markers_usable);
  out.pc_coords.forEach((c, i) => assertClose(c, truth.pc_coords[i], `pc[${i}]`));
  for (const epoch of EPOCHS) {
    const got = out.epochs[epoch];
    const want = truth.epochs[epoch];
    got.shares.forEach((s, i) => {
      assertClose(s.weight, want.weights[i], `${epoch} weight[${i}]`);
      assertClose(s.low, want.low[i], `${epoch} low[${i}]`);
      assertClose(s.high, want.high[i], `${epoch} high[${i}]`);
    });
    got.closest.forEach((c, i) => {
      assert.equal(c.label, want.closest[i].label, `${epoch} closest[${i}] label`);
      assertClose(c.distance, want.closest[i].distance, `${epoch} closest[${i}] distance`);
    });
  }
});

test("default seeded bootstrap is deterministic and brackets the point estimate", () => {
  const { text, panel } = loadFixture();
  const parsed = parseRaw("23andme", text);
  const a = analyze(parsed.calls, panel, { seed: 7, nBoot: 40 });
  const b = analyze(parsed.calls, panel, { seed: 7, nBoot: 40 });
  assert.deepEqual(a, b);
  for (const share of a.epochs.bronze.shares) {
    assert.ok(share.low <= share.weight + TOL && share.weight <= share.high + TOL, share.label);
  }
});


test("missing loci do not inflate a least-squares projection", () => {
  const { panel } = loadFixture();
  const toy = { ...panel, nSnps: 4, nPcs: 2, mean: new Float32Array(4),
    loadings: new Float32Array([1, 0, 0, 1, 1, 1, 1, -1]) };
  const coords = project([0.3, 1.0, -0.4], [0, 2, 3], toy);
  assertClose(coords[0], 0.3, "missing-data pc0");
  assertClose(coords[1], 0.7, "missing-data pc1");
});

test("incompatible calls are excluded and simplex constraints hold", () => {
  const calls = new Map([["rs1", "TT"], ["rs2", "AG"]]);
  const encoded = encode(calls, ["rs1:A:C", "rs2:A:G"]);
  assert.deepEqual([...encoded.rows], [1]);
  assert.deepEqual([...encoded.dosage], [1]);
  const weights = fitWeights([3, -1], [[1, 0], [0, 1]]);
  assertClose(weights[0], 1, "simplex vertex");
  assertClose(weights[1], 0, "simplex vertex");
  assertClose(weights.reduce((a, b) => a + b, 0), 1, "simplex sum");
});

test("simplex fit recovers independent interior and boundary solutions", () => {
  const vertices = [[0, 0], [1, 0], [0, 1]];
  fitWeights([0.25, 0.45], vertices).forEach((v, i) => assertClose(v, [0.30, 0.25, 0.45][i], `interior ${i}`));
  fitWeights([-0.2, 0.7], vertices).forEach((v, i) => assertClose(v, [0.30, 0, 0.7][i], `boundary ${i}`));
});
