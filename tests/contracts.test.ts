/** Contract tests: plan/evidence/replay validation. */

import assert from "node:assert";
import { EnvelopeErrSchema, ReelPlanSchema, ReplayBundleSchema } from "../src/contracts/index.ts";
import { REPLAY } from "../src/contracts/fixtures.ts";

const parsed = ReplayBundleSchema.parse(REPLAY);
assert.equal(parsed.mode, "replay");
assert.ok(parsed.plan.duration_s >= 90 && parsed.plan.duration_s <= 150);

const sum = parsed.plan.beats.reduce((acc, b) => acc + (b.tEnd - b.tStart), 0);
assert.ok(Math.abs(sum - parsed.plan.duration_s) < 0.01, "beats tile duration");

for (const beat of parsed.plan.beats) {
  assert.ok(beat.tEnd > beat.tStart, beat.id);
  assert.ok(beat.headline.length <= 140, beat.id);
}

assert.deepEqual(EnvelopeErrSchema.parse({ ok: false, code: "R1", message: "x" }), {
  ok: false,
  code: "R1",
  message: "x",
});

const bad = ReplayBundleSchema.safeParse({ ...REPLAY, plan: { ...REPLAY.plan, duration_s: 42 } });
assert.equal(bad.success, false);

const gappedBeats = REPLAY.plan.beats.map((b, i) => (i === 2 ? { ...b, tStart: b.tStart + 5 } : b));
assert.equal(
  ReplayBundleSchema.safeParse({ ...REPLAY, plan: { ...REPLAY.plan, beats: gappedBeats } }).success,
  false,
  "gapped beats must not validate",
);
const overlappedBeats = REPLAY.plan.beats.map((b, i) => (i === 2 ? { ...b, tStart: b.tStart - 5 } : b));
assert.equal(
  ReplayBundleSchema.safeParse({ ...REPLAY, plan: { ...REPLAY.plan, beats: overlappedBeats } }).success,
  false,
  "overlapping beats must not validate",
);

assert.ok(parsed.plan.audits.narrative === "pass" && parsed.plan.audits.compliance === "pass");
console.log("PASS contracts");
