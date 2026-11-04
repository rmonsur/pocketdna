/** Viewport generation status derives from the latest pipeline event. */
import assert from "node:assert";
import { PIPELINE_STEP_COUNT, statusFromEvents } from "../src/lib/generationStatus.ts";

const base = { job_id: "j1", artifact: "" } as const;

const empty = statusFromEvents([]);
assert.equal(empty.step, null, "no events yet: no step");
assert.equal(empty.title, "Starting your episode");

const running = statusFromEvents([
  { ...base, step: 1, title: "Analysed on your device", model: "browser-worker", status: "done", artifact: "PCA-25 projection (on-device)" },
  { ...base, step: 3, title: "Selecting your citations", model: "muse-spark-1.3", status: "running" },
]);
assert.equal(running.step, 3);
assert.equal(running.title, "Selecting your citations");
assert.equal(running.detail, "muse-spark-1.3 working", "running step without artifact names the model");

const done = statusFromEvents([{ ...base, step: 8, title: "Film ready", model: "engine", status: "done", artifact: "7+ beats, cited" }]);
assert.equal(done.step, PIPELINE_STEP_COUNT);
assert.equal(done.detail, "7+ beats, cited", "artifact wins when present");

console.log("PASS generationStatus");
