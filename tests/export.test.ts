/** Export tests: frame times + evidence manifest (no browser needed). */

import assert from "node:assert";
import { REPLAY } from "../src/contracts/fixtures.ts";
import { buildManifest, frameTimes } from "../src/reel/exportPlan.ts";

const times = frameTimes(120, 30);
assert.equal(times.length, 3600);
assert.equal(times[0], 0);
assert.equal(times[30], 1);
assert.equal(times[times.length - 1], 119.967);

assert.deepEqual(frameTimes(2, 2), [0, 0.5, 1, 1.5]);

const manifest = buildManifest(REPLAY.plan, REPLAY.evidence, REPLAY.claims, 30, "replay", "2026-11-05T00:00:00.000Z");
assert.equal(manifest.frames, 3600);
assert.equal(manifest.size, "1080x1920");
assert.equal(manifest.sound, "silent");
assert.equal(manifest.evidenceKind, "raw");
assert.equal(manifest.citations.length, REPLAY.claims.length);
assert.ok(manifest.citations.every((c) => c.doi === null || c.doi.startsWith("10.")));
assert.ok(manifest.limitations.some((l) => l.toLowerCase().includes("replay")));

console.log("PASS export");
