/**
 * Hardening tests for the Muse adapter's JSON tolerance layer (public seam: parseModelJson).
 * Behavior-level assertions only; expected values are independent literals.
 */
import assert from "node:assert";
import { parseModelJson } from "../src/lib/muse/client.ts";

let n = 0;
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepStrictEqual(a, b, m);
  n++;
};

is(parseModelJson('{"a":1}'), { a: 1 }, "plain object parses");
is(parseModelJson('```json\n{"a":2}\n```'), { a: 2 }, "fenced object parses");
is(parseModelJson('Here you go: {"a":3} hope that helps'), { a: 3 }, "prose-wrapped object is sliced");
is(parseModelJson('{"text":"line one\nline two"}'), { text: "line one\nline two" }, "raw control chars inside strings survive");
is(parseModelJson('{"text":"tab\there"}'), { text: "tab\there" }, "raw tab inside string survives");
for (const bad of ["not json at all", "", '{"a":']) {
  assert.throws(() => parseModelJson(bad), /no JSON object/, `unrecoverable input throws for caller retry: ${JSON.stringify(bad)}`);
  n++;
}
is(parseModelJson('{"a":[1,2,{"b":"x"}]}'), { a: [1, 2, { b: "x" }] }, "nested structures parse");
is(parseModelJson('```\n{"k":1}\n```'), { k: 1 }, "bare fenced object parses");

console.log(`modelJson tests: ${n} assertions`);
console.log("MODELJSON TESTS PASS");
