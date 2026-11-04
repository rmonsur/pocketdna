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
const fps = Number(flag("fps", "30"));
const width = Number(flag("width", "540"));
const height = Number(flag("height", "960"));

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

let replayRes;
try {
  replayRes = await fetch(`${url}/api/replay`);
} catch {
  console.error(`cannot reach ${url}/api/replay (start the app first)`);
  process.exit(2);
}
if (!replayRes.ok) {
  console.error(`cannot reach ${url}/api/replay (start the app first)`);
  process.exit(2);
}
const replay = (await replayRes.json()).data;
const duration = replay.plan.duration_s;
const frames = Math.floor(duration * fps);

const tmp = join(process.cwd(), ".local", "export-frames");
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
for (let i = 0; i < frames; i += 1) {
  const t = (i / fps).toFixed(3);
  await page.goto(`${url}/?static=1&t=${t}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(tmp, `f${String(i).padStart(5, "0")}.png`) });
  if (i % fps === 0) console.log(`frame ${i}/${frames} (t=${t}s)`);
}
await browser.close();

const encode = spawnSync(
  "ffmpeg",
  ["-y", "-framerate", String(fps), "-i", join(tmp, "f%05d.png"), "-vf", "scale=1080:1920",
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
  size: "1080x1920",
  sound: "silent",
  citations: replay.claims.map((c) => ({
    id: c.id, authors: c.source.authors, year: c.source.year, venue: c.source.venue, doi: c.source.doi,
  })),
  evidenceKind: replay.evidence.kind,
  limitations: replay.evidence.limitations,
};
const manifestPath = `${out}.manifest.json`;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`wrote ${out} (${frames} frames) + ${manifestPath}`);
if (!existsSync(out)) process.exit(1);
