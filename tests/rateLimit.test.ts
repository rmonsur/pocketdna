/** Rate limit: the 11th job inside a minute is a typed 429 (own process). */
import assert from "node:assert";

process.env.KILL_PAID_CALLS = "1";
const { app } = await import("../src/server/app.ts");

let last = 0;
for (let i = 0; i < 11; i++) {
  const form = new FormData();
  form.append("file", new File(["rs1\t1\t1\tAA\n"], "g.txt", { type: "text/plain" }));
  const res = await app.request("http://x/api/jobs", { method: "POST", body: form });
  last = res.status;
  if (i < 10) assert.notEqual(last, 429, `attempt ${i + 1} must not be rate limited`);
}
assert.equal(last, 429, "11th job attempt inside a minute is rate limited");

console.log("PASS rateLimit");
