/**
 * Regression: extractor {"error":"R1"|"R2"} must reject the job typed, not fail it R4.
 * Seam: public HTTP API with the model transport stubbed at fetch (offline, no spend).
 */
import assert from "node:assert";

process.env.META_API_KEY = "test-key-redacted";
delete process.env.KILL_PAID_CALLS;

const replies: unknown[] = [
  { vendor: "23andMe", report_type: "ancestry composition", route: "tier1", rejection: null, confidence: 0.9 },
  { error: "R1" },
  { vendor: "23andMe", report_type: "ancestry composition", route: "tier1", rejection: null, confidence: 0.9 },
  { error: "R2" },
];
let call = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL) => {
  const url = String(input);
  if (!url.includes("/chat/completions")) return realFetch(input);
  const payload = replies[Math.min(call, replies.length - 1)];
  call += 1;
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(payload) } }],
      usage: { prompt_tokens: 10, completion_tokens: 10 },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};

const { app } = await import("../src/server/app.ts");

async function runJob(tag: number): Promise<{ state: string; rejection: string | null }> {
  const form = new FormData();
  /* Distinct bytes per job so the adapter response cache cannot replay job 1. */
  form.append("file", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, tag])], "shot.png", { type: "image/png" }));
  const res = await app.request("http://x/api/jobs", { method: "POST", body: form });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { data: { job_id: string } };
  for (let i = 0; i < 50; i++) {
    const st = await app.request(`http://x/api/jobs/${body.data.job_id}`);
    const sb = (await st.json()) as { data: { state: string; rejection: string | null } };
    if (sb.data.state === "rejected" || sb.data.state === "failed" || sb.data.state === "done") return sb.data;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("job did not reach a terminal state");
}

const r1 = await runJob(1);
assert.equal(r1.state, "rejected", `extractor R1 must reject, got ${r1.state}`);
assert.equal(r1.rejection, "R1");

const r2 = await runJob(2);
assert.equal(r2.state, "rejected", `extractor R2 must reject, got ${r2.state}`);
assert.equal(r2.rejection, "R2");

globalThis.fetch = realFetch;
console.log("PASS extractor-rejection");
