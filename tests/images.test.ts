/** HistoricalImageAgent: prompt compilation, brief selection, adapter parsing, bounded budget. */
import "./helpers/scratchLocalDir.ts";
import assert from "node:assert";
import { ReelPlanSchema, type ReelPlan } from "../src/contracts/index.ts";
import { REPLAY } from "../src/contracts/fixtures.ts";
import { compileScenePrompt, MAX_IMAGES_PER_EPISODE, sceneBriefs, type SceneBrief } from "../src/server/images.ts";
import { claimId, profileToClaim, splitPublication } from "../src/server/profiles.ts";

const brief: SceneBrief = {
  beatId: "b3",
  era: "bronze",
  place: "Shahr-i Sokhta, Iran",
  dateText: "about 2742 BCE",
  family: "Indus Valley Civilization (3100–2000 BC)",
  publication: "LazaridisReichScience2022",
  doi: "10.1126/science.abm4247",
  purpose: "Contextual illustration for the bronze chapter.",
};

const prompt = compileScenePrompt(brief);
assert.ok(!/\{\{/.test(prompt), "no unresolved placeholders");
assert.ok(prompt.includes("Shahr-i Sokhta, Iran") && prompt.includes("about 2742 BCE"));
assert.ok(prompt.includes("doi 10.1126/science.abm4247"));
assert.ok(/not a portrait of anyone's actual ancestors/.test(prompt));
assert.ok(/Exclude: battle/.test(prompt));
assert.ok(!/weight|share|0\.8/.test(prompt), "no personal fit values in an image prompt");
assert.throws(() => compileScenePrompt({ ...brief, place: "" }), /missing place/);
assert.ok(compileScenePrompt({ ...brief, dateText: "present-day" }).includes("present-day moment"), "modern preset avoids costume inference");

/* Briefs come only from era beats whose atlas names a located leading source. */
const atlas = {
  preset: "locate-region" as const,
  focus: [61.4, 30.65] as [number, number],
  markers: [{ id: "x", label: "Family", place: "Shahr-i Sokhta, Iran", dateText: "about 2742 BCE", lon: 61.4, lat: 30.65, weight: 0.8 }],
  legend: "legend",
};
const plan: ReelPlan = ReelPlanSchema.parse({
  ...REPLAY.plan,
  beats: REPLAY.plan.beats.map((b) => (b.kind === "era" ? { ...b, atlas } : b)),
});
const briefs = sceneBriefs(plan);
assert.equal(briefs.length, 3, "one brief per era beat");
assert.ok(briefs.length <= MAX_IMAGES_PER_EPISODE);
assert.equal(sceneBriefs(REPLAY.plan).length, 3, "replay fixture carries one atlas-backed brief per era");
const noAtlas = ReelPlanSchema.parse({ ...plan, beats: plan.beats.map((b) => ({ ...b, atlas: undefined })) });
assert.equal(sceneBriefs(noAtlas).length, 0, "no atlas, no image brief");
const unlocated = { ...atlas, markers: [{ ...atlas.markers[0], place: null }] };
assert.equal(sceneBriefs(ReelPlanSchema.parse({ ...plan, beats: plan.beats.map((b) => (b.kind === "era" ? { ...b, atlas: unlocated } : b)) })).length, 0);

/* Population profile claims carry the AADR publication as their source. */
assert.deepEqual(splitPublication("KumarFuMolBiolEvol2021"), { authors: "Kumar, Fu et al.", venue: "Mol Biol Evol" });
assert.equal(claimId("San (Khomani)"), "pop-san-khomani-");
const claim = profileToClaim(
  { source_id: "L8630", name: "People near Rabat", who: "Lived around 50 BCE.", where: "Rabat.", why_similar: "Similar to.", caution: "Two samples.", story: "They farmed an oasis. Traders passed through. Their town grew." },
  {
    id: "L8630", label: "x", eras: ["middle"], groupId: "Uzbekistan_Antiquity", locality: "Rabat", country: "Uzbekistan",
    lat: 38.1, lon: 67.3, dateText: "about 50 BCE", publication: "KumarFuMolBiolEvol2021", doi: "10.1093/molbev/msab216", individuals: 2, match: "sample",
  },
);
assert.equal(claim.id, "pop-l8630");
assert.equal(claim.source.year, 2021);
assert.equal(claim.source.doi, "10.1093/molbev/msab216");
assert.equal(claim.class, "context");
assert.equal(claim.story, "They farmed an oasis. Traders passed through. Their town grew.", "profile story travels on the claim");
const orphan = profileToClaim({ source_id: "Q", name: "Q", who: "w", where: "", why_similar: "y", caution: "", story: "  " }, undefined);
assert.equal(orphan.story, null, "blank story becomes null");
assert.equal(orphan.source.doi, "10.7910/DVN/FFIDCW", "unmatched sources cite the AADR dataset");

/* Adapter: parses the Responses API image item; kill switch and budget stop before any network call. */
process.env.META_API_KEY = "test-key";
process.env.KILL_PAID_CALLS = "";
const { callImage, KillSwitchEngaged, BudgetExceeded } = await import("../src/lib/muse/client.ts");
const originalFetch = globalThis.fetch;
let calls = 0;
const fakeBytes = new Uint8Array(2048).map((_, i) => i % 251);
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  calls += 1;
  const body = JSON.parse(String(init?.body)) as { model: string; tools: Array<Record<string, unknown>>; store: boolean };
  assert.equal(body.model, "muse-image-1.0");
  assert.equal(body.store, false);
  assert.equal(body.tools[0].type, "image_generation");
  assert.equal(body.tools[0].enable_shell, false);
  assert.ok(String(input).endsWith("/responses"));
  return new Response(
    JSON.stringify({ id: "resp_1", output: [{ type: "message" }, { type: "image_generation_call", id: "ig_1", result: Buffer.from(fakeBytes).toString("base64") }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}) as typeof fetch;
try {
  const salt = `test-${Date.now()}`;
  const first = await callImage({ agent: "test", model: "muse-image-1.0", prompt: `${prompt}\n${salt}`, format: "png" });
  assert.equal(first.cached, false);
  assert.equal(first.bytes.length, fakeBytes.length);
  assert.equal(first.costUsd, 0.01);
  const second = await callImage({ agent: "test", model: "muse-image-1.0", prompt: `${prompt}\n${salt}`, format: "png" });
  assert.equal(second.cached, true, "identical prompt is a cache hit");
  assert.equal(calls, 1, "cache hit makes no network call");
  await assert.rejects(callImage({ agent: "test", model: "muse-image-1.0", prompt: "x", runSpentUsd: 5, runSpendCapUsd: 5 }), BudgetExceeded);
  process.env.KILL_PAID_CALLS = "1";
  await assert.rejects(callImage({ agent: "test", model: "muse-image-1.0", prompt: "y" }), KillSwitchEngaged);
  assert.equal(calls, 1, "neither guard reached the network");
} finally {
  globalThis.fetch = originalFetch;
  process.env.KILL_PAID_CALLS = "";
}

console.log("PASS images");
