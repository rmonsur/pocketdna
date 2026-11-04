/** Client API tests: fetch-stubbed envelopes, typed errors, job parsing. */

import assert from "node:assert";

const { ApiError, createJob, getJob } = await import("../src/lib/api.ts");
const { strictifySchema } = await import("../src/lib/muse/client.ts");

/* Meta strict mode: every object gains additionalProperties:false. */
{
  const out = strictifySchema({ type: "object", properties: { a: { type: "object", properties: {} } } }) as {
    additionalProperties: boolean;
    properties: { a: { additionalProperties: boolean } };
  };
  assert.equal(out.additionalProperties, false);
  assert.equal(out.properties.a.additionalProperties, false);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const realFetch = globalThis.fetch;

/* createJob happy path */
globalThis.fetch = (async () =>
  jsonResponse({ ok: true, data: { job_id: "j1", state: "queued" } })) as typeof fetch;
const created = await createJob(new File(["x"], "shot.png", { type: "image/png" }));
assert.equal(created.job_id, "j1");

/* typed error envelope surfaces code + message */
globalThis.fetch = (async () =>
  jsonResponse({ ok: false, code: "R4", message: "raw runs in browser" }, 422)) as typeof fetch;
try {
  await createJob(new File(["x"], "genome.txt", { type: "text/plain" }));
  assert.fail("expected ApiError");
} catch (err) {
  assert.ok(err instanceof ApiError);
  assert.equal(err.code, "R4");
  assert.match(err.message, /browser/);
}

/* getJob parses the shared contract */
globalThis.fetch = (async () =>
  jsonResponse({
    ok: true,
    data: {
      job_id: "j1",
      state: "done",
      rejection: null,
      message: "",
      reel: null,
      evidence: null,
      claims: [],
      events: [],
    },
  })) as typeof fetch;
const job = await getJob("j1");
assert.equal(job.state, "done");

globalThis.fetch = realFetch;
console.log("PASS client");
