/**
 * Round two (tdd skill): behavior tests at public seams.
 * Contracts negatives, film-engine boundaries, export planning, atlas
 * verification, harmonization edge cases, bootstrap determinism.
 * Expected values are derived from the docs/spec, not recomputed from code.
 */
import assert from "node:assert";
import {
  EvidenceRecordSchema,
  JobStatusSchema,
  ReelPlanSchema,
} from "../src/contracts/index.ts";
import { APPROVED_SITES, verifyAtlasSites } from "../src/contracts/atlas.ts";
import { REPLAY } from "../src/contracts/fixtures.ts";
import { frameAt, clampT } from "../src/reel/engine.ts";
import { buildManifest, frameTimes } from "../src/reel/exportPlan.ts";
import { alignExport } from "../src/features/ancestry/harmonize.ts";
import { analyzeRaw } from "../src/features/ancestry/analyzeRaw.ts";
import { validateBundle, QcError, type Pca25Bundle } from "../src/features/ancestry/pca25.ts";

let n = 0;
const ok = (cond: boolean, msg: string) => {
  assert.ok(cond, msg);
  n++;
};

/* --- Contracts: the 90-150s bound and evidence discrimination are spec rules. */
for (const bad of [89, 151]) {
  const plan = { ...REPLAY.plan, duration_s: bad };
  ok(!ReelPlanSchema.safeParse(plan).success, `duration ${bad}s must not validate`);
}
ok(
  !EvidenceRecordSchema.safeParse({ kind: "alien", vendor: "X", shares: [], limitations: [] }).success,
  "unknown evidence kind must not validate",
);
ok(
  !EvidenceRecordSchema.safeParse({ kind: "provider", shares: [], limitations: [] }).success,
  "provider evidence without vendor must not validate",
);
const rawEvidence = {
  kind: "raw", basisId: "b1", markerCount: 100, usableMarkers: 90,
  epochs: [], limitations: ["x"],
};
ok(EvidenceRecordSchema.safeParse(rawEvidence).success, "raw evidence validates");
const status = JobStatusSchema.parse({ job_id: "j1", state: "queued", rejection: null });
ok(status.reel === null && status.events.length === 0 && status.claims.length === 0, "job status defaults are empty, not undefined");

/* --- Film engine: clamping, beat boundaries, deterministic push/alpha. */
const plan = REPLAY.plan;
ok(clampT(plan, -5) === 0 && clampT(plan, 9999) === plan.duration_s, "time clamps to the film");
ok(frameAt(plan, -1).beatIndex === 0 && frameAt(plan, -1).beatProgress === 0, "before zero is the first beat at 0");
const endFrame = frameAt(plan, 9999);
ok(endFrame.beatIndex === plan.beats.length - 1 && endFrame.beatProgress === 1, "past the end is the last beat complete");
ok(frameAt(plan, plan.beats[0].tEnd).beatIndex === 1, "a beat boundary starts the next beat");
ok(frameAt(plan, 30).sceneAlpha === 1, "mid-beat scene is fully opaque");
ok(frameAt(plan, plan.beats[2].tStart).sceneAlpha === 0, "scene fades in from zero at beat start");
const midPush = frameAt(plan, plan.beats[2].tStart + (plan.beats[2].tEnd - plan.beats[2].tStart) / 2);
ok(Math.abs(midPush.push - 1.09) < 1e-9, "camera push is 1.09 halfway through a beat");

/* --- Export planning: frame counts and manifest evidence. */
const times = frameTimes(120, 10);
ok(times.length === 1200 && times[0] === 0 && Math.abs(times[1199] - 119.9) < 1e-9, "120s at 10fps is 1200 frames from zero");
ok(frameTimes(90, 24).length === 2160, "90s at 24fps is 2160 frames");
const manifest = buildManifest(plan, REPLAY.evidence, REPLAY.claims, 10, "replay", "2026-11-05T00:00:00.000Z");
ok(manifest.frames === 1200 && manifest.size === "1080x1920" && manifest.sound === "silent", "manifest carries the silent 1080x1920 spec");
ok(manifest.citations.length === REPLAY.claims.length && manifest.citations[0].doi === REPLAY.claims[0].source.doi, "manifest citations mirror the claims");
ok(manifest.evidenceKind === REPLAY.evidence.kind, "manifest records the evidence kind");

/* --- Atlas: approved sites verify; duplicates and unknown claims are caught. */
const known = new Set(APPROVED_SITES.flatMap((s) => s.claimIds));
ok(verifyAtlasSites(APPROVED_SITES, known).length === 0, "approved sites verify against their own claim set");
const dup = verifyAtlasSites([APPROVED_SITES[0], APPROVED_SITES[0]], known);
ok(dup.some((i) => i.includes("duplicate")), "duplicate site ids are reported");
const ghost = verifyAtlasSites([{ ...APPROVED_SITES[0], id: "ghost", claimIds: ["nope-1900"] }], known);
ok(ghost.some((i) => i.includes("unknown claim")), "unknown claim references are reported");

/* --- Harmonization: duplicates keep the first call; CRLF and comments parse. */
const markers = [
  { id: "rs1", a1: "A", a2: "G" },
  { id: "rs2", a1: "C", a2: "T" },
];
const messy = "# comment\r\nrs1\t1\t1\tAA\r\nrs1\t1\t1\tGG\r\nrs2 1 2 CT\r\n";
const aligned = alignExport(messy, markers);
ok(aligned.calls[0] === 2, "first occurrence of a duplicated rsid wins");
ok(aligned.calls[1] === 1, "space-separated rows parse (CT = one C)");

/* --- Bundle validation and bootstrap determinism. */
const badBundle: Pca25Bundle = {
  basisId: "x", dimensions: 2, markers: 4,
  weights: new Float64Array(4), means: new Float64Array(4),
  normalization: new Float64Array(4), coordinateScales: new Float64Array(2),
};
assert.throws(() => validateBundle(badBundle), QcError);
n++;

const m = 40001;
const weights = new Float64Array(m * 2);
const chroms = new Uint16Array(m);
for (let i = 0; i < m; i++) {
  weights[i * 2] = i % 2 === 0 ? 1 : 0;
  weights[i * 2 + 1] = i % 2 === 0 ? 0 : 1;
  chroms[i] = (i % 22) + 1;
}
const synthBundle: Pca25Bundle = {
  basisId: "synth", dimensions: 2, markers: m, weights,
  means: new Float64Array(m), normalization: new Float64Array(m).fill(1),
  coordinateScales: new Float64Array([1, 1]),
};
const calls = new Uint8Array(m);
for (let i = 0; i < m; i++) calls[i] = i % 2 === 0 ? 2 : 1;
const panels = { bronze: [
  { source_id: "A", era_group: "g", n_individuals: 3, centroid: [2, 1] },
  { source_id: "B", era_group: "g", n_individuals: 3, centroid: [0, 0] },
] };
const run1 = analyzeRaw(synthBundle, chroms, calls, panels, { bootstrap: 8, seed: 7 });
const run2 = analyzeRaw(synthBundle, chroms, calls, panels, { bootstrap: 8, seed: 7 });
const shareA1 = run1.eras[0].shares.find((s) => s.source_id === "A");
const shareA2 = run2.eras[0].shares.find((s) => s.source_id === "A");
ok(shareA1 !== undefined && Math.abs(shareA1.weight - 1) < 1e-9, "target on a centroid fits that source fully");
ok(JSON.stringify(run1.eras) === JSON.stringify(run2.eras), "same seed produces identical era fits");
ok(shareA1 !== undefined && shareA1.low <= shareA1.weight && shareA1.weight <= shareA1.high, "bootstrap range brackets the fit");

console.log(`round-two: ${n} assertions`);
console.log("PASS round-two");
