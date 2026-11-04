/** Engine tests: beat mapping, clamping, determinism, map interpolation. Run: node --experimental-strip-types --no-warnings src/reel/engine.test.ts (from app/). */
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { frameAt, pathPointAt, type Reel } from "./engine.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const reel = JSON.parse(readFileSync(join(root, "demo", "fixtures", "sample-reel.json"), "utf8")) as Reel;

assert.equal(frameAt(reel, -5).t, 0);
assert.equal(frameAt(reel, 999).t, reel.duration_s);
assert.equal(frameAt(reel, 0).beat.id, "b1");

const expected: Array<[number, string]> = [
  [2, "b1"],
  [7, "b2"],
  [20, "b3"],
  [50, "b4"],
  [80, "b5"],
  [100, "b6"],
  [115, "b7"],
];
for (const [t, id] of expected) {
  assert.equal(frameAt(reel, t).beat.id, id, `t=${t}`);
}

const a = frameAt(reel, 12.345);
const b = frameAt(reel, 12.345);
assert.deepEqual(a, b);

const mid = pathPointAt(
  [
    [38.0, 48.0],
    [20.0, 50.0],
    [0.0, 51.5],
  ],
  0.5,
);
assert.ok(mid !== null);
assert.ok(Math.abs(mid[0] - 19.03) < 0.05, `lon ${mid[0]}`);
assert.ok(Math.abs(mid[1] - 50.07) < 0.05, `lat ${mid[1]}`);

assert.equal(pathPointAt([], 0.5), null);
assert.equal(frameAt(reel, 7).mapPoint, null);
assert.ok(frameAt(reel, 20).mapPoint !== null);
assert.ok(frameAt(reel, 6.1).sceneAlpha < 1);
assert.equal(frameAt(reel, 15).sceneAlpha, 1);

console.log("PASS engine beat/clamp/determinism/map");
