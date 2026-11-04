/** Server tests: offline (KILL_PAID_CALLS=1). Hono app.request, no listener. */

import assert from "node:assert";

process.env.KILL_PAID_CALLS = "1";

const { app } = await import("../src/server/app.ts");

const health = await app.request("/api/health");
assert.equal(health.status, 200);
const healthBody = (await health.json()) as { ok: boolean };
assert.equal(healthBody.ok, true);

const replay = await app.request("/api/replay");
assert.equal(replay.status, 200);
const replayBody = (await replay.json()) as { ok: boolean; data: { plan: { duration_s: number } } };
assert.equal(replayBody.data.plan.duration_s, 120);

const raw = await app.request("http://x/api/jobs", {
  method: "POST",
  body: (() => {
    const form = new FormData();
    form.append("file", new File(["rs1\t1\t100\tAA\n"], "genome.txt", { type: "text/plain" }));
    return form;
  })(),
});
assert.equal(raw.status, 422);
const rawBody = (await raw.json()) as { ok: boolean; code: string };
assert.equal(rawBody.code, "R4");

const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "shot.png", { type: "image/png" });
const form = new FormData();
form.append("file", png);
const shot = await app.request("http://x/api/jobs", { method: "POST", body: form });
assert.equal(shot.status, 200);
const shotBody = (await shot.json()) as { data: { job_id: string } };
const jobId = shotBody.data.job_id;

/* Kill switch makes the screenshot pipeline fail typed (R5), never hang. */
await new Promise((r) => setTimeout(r, 300));
const status = await app.request(`http://x/api/jobs/${jobId}`);
const statusBody = (await status.json()) as {
  data: { state: string; rejection: string | null; reel: unknown };
};
assert.equal(statusBody.data.state, "failed");
assert.equal(statusBody.data.rejection, "R5");
assert.equal(statusBody.data.reel, null);

/* SSE endpoint serves the terminal event for a finished job. */
const sse = await app.request(`http://x/api/jobs/${jobId}/events`);
assert.equal(sse.status, 200);
assert.match(sse.headers.get("content-type") ?? "", /text\/event-stream/);

const missing = await app.request("/api/jobs/nope");
assert.equal(missing.status, 404);

const missingEvents = await app.request("/api/jobs/nope/events");
assert.equal(missingEvents.status, 404);

const noFile = await app.request("http://x/api/jobs", { method: "POST", body: new FormData() });
assert.equal(noFile.status, 400);

const fakeImage = new FormData();
fakeImage.append("file", new File(["not an image"], "shot.png", { type: "image/png" }));
const fakeRes = await app.request("http://x/api/jobs", { method: "POST", body: fakeImage });
assert.equal(fakeRes.status, 400, "content sniffing rejects non-image bytes named .png");

const bigForm = new FormData();
bigForm.append("file", new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.png", { type: "image/png" }));
const bigRes = await app.request("http://x/api/jobs", { method: "POST", body: bigForm });
assert.equal(bigRes.status, 413, "screenshots over 10 MB are rejected");

console.log("PASS server");
