/** Atlas tests: approved sites validate; verifier catches bad data. */

import assert from "node:assert";
import { APPROVED_SITES, AtlasSiteSchema, verifyAtlasSites } from "../src/contracts/atlas.ts";
import { REPLAY } from "../src/contracts/fixtures.ts";

const known = new Set(REPLAY.claims.map((c) => c.id));
assert.deepEqual(verifyAtlasSites(APPROVED_SITES, known), []);
for (const site of APPROVED_SITES) AtlasSiteSchema.parse(site);

const bad = verifyAtlasSites(
  [{ ...APPROVED_SITES[0], lon: 999, claimIds: ["nope"] }, APPROVED_SITES[0]],
  known,
);
assert.ok(bad.length >= 2, bad.join("; "));

assert.ok(APPROVED_SITES.some((s) => s.era === "bronze"));
assert.ok(APPROVED_SITES.some((s) => s.era === "middle"));
assert.ok(APPROVED_SITES.some((s) => s.era === "modern"));

console.log("PASS atlas");
