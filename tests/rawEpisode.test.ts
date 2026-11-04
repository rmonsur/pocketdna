/** Raw-episode endpoint: strict derived-summary contract (STACK 105). */
import assert from "node:assert";

process.env.KILL_PAID_CALLS = "1";
const { app } = await import("../src/server/app.ts");

const summary = {
  basisId: "pocketdna-pca25-experimental-v1",
  markerCount: 99794,
  usableMarkers: 47115,
  epochs: [
    {
      era: "bronze",
      shares: [{ id: "S1", label: "S1", weight: 0.8, low: 0.7, high: 0.9 }],
      closest: [{ label: "S1", distance: 0.01 }],
    },
  ],
  limitations: ["experimental"],
};

const created = await app.request("http://x/api/raw-episodes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(summary),
});
assert.equal(created.status, 200);
const jobId = ((await created.json()) as { data: { job_id: string } }).data.job_id;

await new Promise((r) => setTimeout(r, 300));
const status = await app.request(`http://x/api/jobs/${jobId}`);
const body = (await status.json()) as { data: { state: string; rejection: string | null; evidence: { kind: string } | null } };
assert.equal(body.data.state, "failed", "kill switch fails the episode job typed, never hangs");
assert.equal(body.data.rejection, "R5");
assert.equal(body.data.evidence?.kind, "raw", "job carries the raw evidence record");

for (const [label, payload] of [
  ["coordinates are refused", { ...summary, coordinates: [0.1, 0.2] }],
  ["genotypes are refused", { ...summary, calls: [0, 1, 2] }],
  ["unknown era is refused", { ...summary, epochs: [{ era: "iron", shares: [], closest: [] }] }],
  ["weight above one is refused", { ...summary, epochs: [{ era: "bronze", shares: [{ id: "S", label: "S", weight: 1.4, low: 0, high: 1 }], closest: [] }] }],
] as const) {
  const res = await app.request("http://x/api/raw-episodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 400, label);
}

console.log("PASS rawEpisode");
