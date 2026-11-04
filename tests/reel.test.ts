/** Reel engine tests: beat map, clamping, determinism, seek (DIRECTOR beat map). */

import assert from "node:assert";
import { REPLAY } from "../src/contracts/fixtures.ts";
import { frameAt } from "../src/reel/engine.ts";

const plan = REPLAY.plan;

assert.equal(frameAt(plan, -5).t, 0);
assert.equal(frameAt(plan, 999).t, plan.duration_s);
assert.equal(frameAt(plan, 2).beat.id, "b1");

const expected: Array<[number, string]> = [
  [2, "b1"],
  [7, "b2"],
  [20, "b3"],
  [50, "b4"],
  [80, "b5"],
  [100, "b6"],
  [115, "b7"],
];
for (const [t, id] of expected) assert.equal(frameAt(plan, t).beat.id, id, `t=${t}`);

const a = frameAt(plan, 12.345);
const b = frameAt(plan, 12.345);
assert.deepEqual(a, b);

assert.equal(frameAt(plan, 7).beat.id, "b2");
assert.ok(frameAt(plan, 6.1).sceneAlpha < 1);
assert.equal(frameAt(plan, 15).sceneAlpha, 1);
assert.ok(frameAt(plan, 20).push > 1 && frameAt(plan, 39).push > frameAt(plan, 15).push);

console.log("PASS reel engine");
