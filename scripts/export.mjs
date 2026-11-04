/**
 * Local MP4 export: step t deterministically, screenshot, ffmpeg to 1080x1920.
 *
 * Usage (builder machine; deliberate local command only):
 *   npm run dev:api && npm run dev            # or serve dist/ statically
 *   npm run export -- --url http://localhost:5173 --out pocketdna.mp4
 * Prereqs: `npx playwright install chromium`, ffmpeg on PATH.
 * Writes <out>.manifest.json (evidence manifest) beside the MP4.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}
const url = flag("url", "http://localhost:5173");
const out = flag("out", "pocketdna.mp4");
/* --job <id>: export a finished live episode (persisted on the server) instead of the saved replay. */
const jobId = flag("job", null);
const fps = Number(flag("fps", "30"));
/* --aspect landscape (default): 1920x1080 film; --aspect portrait keeps the phone-preview framing. */
const aspect = flag("aspect", "landscape") === "portrait" ? "portrait" : "landscape";
const width = Number(flag("width", aspect === "landscape" ? "960" : "540"));
const height = Number(flag("height", aspect === "landscape" ? "540" : "960"));
const outputSize = aspect === "landscape" ? "1920x1080" : "1080x1920";

function need(cmd, hint) {
  const probe = spawnSync(cmd, ["-version"], { stdio: "ignore" });
  if (probe.status !== 0 && probe.error !== undefined) {
    console.error(`missing tool: ${cmd} (${hint})`);
    process.exit(2);
  }
}
need("ffmpeg", "install ffmpeg, e.g. brew install ffmpeg");

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("playwright not installed: npm i -D playwright && npx playwright install chromium");
  process.exit(2);
}

const sourcePath = jobId === null ? "/api/replay" : `/api/jobs/${jobId}`;
let replayRes;
try {
  replayRes = await fetch(`${url}${sourcePath}`);
} catch {
  console.error(`cannot reach ${url}${sourcePath} (start the app first)`);
  process.exit(2);
}
if (!replayRes.ok) {
  console.error(`cannot reach ${url}${sourcePath} (start the app first)`);
  process.exit(2);
}
const source = (await replayRes.json()).data;
const replay = jobId === null ? source : { mode: "live", plan: source.reel, evidence: source.evidence, claims: source.claims, assets: source.assets, events: source.events };
if (jobId !== null && (source.state !== "done" || source.reel === null)) {
  console.error(`job ${jobId} is ${source.state}; only finished episodes export`);
  process.exit(2);
}
let trace = null;
if (jobId !== null) {
  const traceRes = await fetch(`${url}/api/jobs/${jobId}/trace`);
  if (traceRes.ok) trace = (await traceRes.json()).data.calls;
}
const jobQuery = jobId === null ? "" : `&job=${encodeURIComponent(jobId)}`;
const duration = replay.plan.duration_s;
const frames = Math.floor(duration * fps);

const tmp = join(process.cwd(), ".local", "export-frames");
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
for (let i = 0; i < frames; i += 1) {
  const t = (i / fps).toFixed(3);
  await page.goto(`${url}/reel?static=1&t=${t}&aspect=${aspect}${jobQuery}`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-reel-ready="1"]', { timeout: 30000 });
  await page.evaluate(() => Promise.all([...document.images].filter((img) => !img.complete).map((img) => new Promise((r) => { img.onload = r; img.onerror = r; }))));
  await page.screenshot({ path: join(tmp, `f${String(i).padStart(5, "0")}.png`) });
  if (i % fps === 0) console.log(`frame ${i}/${frames} (t=${t}s)`);
}
await browser.close();

const encode = spawnSync(
  "ffmpeg",
  ["-y", "-framerate", String(fps), "-i", join(tmp, "f%05d.png"), "-vf", `scale=${outputSize.replace("x", ":")}`,
   "-c:v", "libx264", "-pix_fmt", "yuv420p", out],
  { stdio: "inherit" },
);
if (encode.status !== 0) {
  console.error("ffmpeg encode failed");
  process.exit(1);
}

const manifest = {
  version: 1,
  exportedAt: new Date().toISOString(),
  mode: replay.mode,
  duration_s: duration,
  fps,
  frames,
  size: outputSize,
  aspect,
  sound: "silent",
  citations: replay.claims.map((c) => ({
    id: c.id, authors: c.source.authors, year: c.source.year, venue: c.source.venue, doi: c.source.doi,
  })),
  evidenceKind: replay.evidence.kind,
  limitations: replay.evidence.limitations,
  job_id: jobId,
  beats: replay.plan.beats.map((b) => ({ id: b.id, kind: b.kind, era: b.era ?? null, tStart: b.tStart, tEnd: b.tEnd, headline: b.headline, subtext: b.subtext, claimIds: b.claimIds, globe: b.atlas ? b.atlas.markers.map((m) => ({ label: m.label, place: m.place, dateText: m.dateText })) : [], image: replay.assets && replay.assets[b.id] ? { mode: replay.assets[b.id].mode, audit: replay.assets[b.id].audit, place: replay.assets[b.id].place } : null })),
  pipeline: replay.events ? replay.events.map((e) => ({ step: e.step, title: e.title, model: e.model, status: e.status, artifact: e.artifact })) : [],
  modelCalls: trace,
  modelCostUsd: trace ? Number(trace.reduce((sum, c) => sum + (c.usd || 0), 0).toFixed(4)) : null,
};
const manifestPath = `${out}.manifest.json`;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`wrote ${out} (${frames} frames) + ${manifestPath}`);
if (!existsSync(out)) process.exit(1);
