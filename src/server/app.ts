/**
 * PocketDNA local server: one localhost origin (API + static dist).
 * Raw genotypes never reach this server (RULES) — raw jobs are rejected typed.
 */

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { EvidenceRecordSchema, JobStatusSchema } from "../contracts/index.ts";
import { REPLAY } from "../contracts/fixtures.ts";
import { KillSwitchEngaged, ModelCallError, traceStorage } from "../lib/muse/client.ts";
import { loadGazetteer } from "./gazetteer.ts";
import { EPISODE_DIR } from "./images.ts";
import { createJobRecord, jobs, type Job } from "./jobs.ts";
import { CorrectedSharesSchema, extractComposition, runRawEpisodeJob, runScreenshotJob } from "./pipeline.ts";

export const app = new Hono();

/* Security headers on every response (security-and-hardening: Always Do). */
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "no-referrer");
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: blob:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'",
  );
});

function ok(data: unknown): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    headers: { "Content-Type": "application/json" },
  });
}

function err(code: string, message: string, status = 400): Response {
  return new Response(JSON.stringify({ ok: false, code, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Terminal jobs are written to the private episode dir so a finished reel, its trace and export survive restarts. */
function persistJob(job: Job): void {
  try {
    const dir = join(EPISODE_DIR, job.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "job.json"), JSON.stringify(statusOf(job), null, 1));
  } catch {
    /* persistence is best effort */
  }
}

function statusOf(job: Job): unknown {
  return JobStatusSchema.parse({
    job_id: job.id,
    state: job.state,
    rejection: job.rejection,
    message: job.message,
    reel: job.reel,
    evidence: job.evidence,
    claims: job.claims,
    assets: job.assets,
    events: job.events.map((e) => ({ job_id: job.id, ...e })),
  });
}

function loadPersistedJob(jobId: string): unknown | null {
  if (!/^[a-z0-9-]+$/i.test(jobId)) return null;
  const path = join(EPISODE_DIR, jobId, "job.json");
  if (!existsSync(path)) return null;
  try {
    return JobStatusSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return null;
  }
}

/** Run a job inside its trace context and persist the terminal record whatever the outcome. */
function runTraced(job: Job, work: () => Promise<void>): void {
  const dir = join(EPISODE_DIR, job.id);
  void traceStorage.run({ jobId: job.id, dir }, () =>
    work()
      .catch((failure: unknown) => failJob(job, failure))
      .finally(() => persistJob(job)),
  );
}

function failJob(job: Job, failure: unknown): void {
  job.state = "failed";
  /* Structured server-side diagnostics: opaque job id, error class and message; never payloads or personal data. */
  const detail = failure instanceof Error ? { name: failure.name, message: failure.message.slice(0, 300) } : { name: "unknown", message: String(failure).slice(0, 300) };
  console.error(JSON.stringify({ event: "job_failed", job_id: job.id, ...detail }));
  if (failure instanceof KillSwitchEngaged) {
    job.rejection = "R5";
    job.message = "Paid calls are paused (KILL_PAID_CALLS). Replay and fixtures still run.";
  } else if (failure instanceof ModelCallError) {
    job.rejection = "R4";
    /* Generic body only: upstream error details stay server-side (.local diagnostics). */
    job.message = "The film pipeline could not finish. Please try again.";
  } else {
    job.rejection = "R4";
    job.message = "The film pipeline could not finish. Please try again.";
  }
}

app.get("/api/health", (c) => ok({ status: "ok", mode: "local" }));

/* PCA-25 bundle + era panels for the in-browser raw worker (public reference
 * arrays only; no user data). Allowlisted filenames, no path traversal. */
const BUNDLE_DIR = join(process.cwd(), "dataset", "interim", "reference-validation", "experimental-pca", "bundle-v1");
const BUNDLE_FILES: Record<string, string> = {
  "manifest.json": "application/json",
  "markers.tsv": "text/tab-separated-values",
  "weights.f64": "application/octet-stream",
  "means.f64": "application/octet-stream",
  "normalization.f64": "application/octet-stream",
  "coordinate-scales.f64": "application/octet-stream",
};

app.get("/api/bundle/:file", (c) => {
  const file = c.req.param("file");
  const type = BUNDLE_FILES[file];
  if (type === undefined) return err("NOT_FOUND", "unknown bundle file", 404);
  return new Response(readFileSync(join(BUNDLE_DIR, file)), { headers: { "Content-Type": type } });
});

app.get("/api/era-panels", (c) => {
  const path = join(process.cwd(), "dataset", "interim", "era-panels", "panels.json");
  return new Response(readFileSync(path), { headers: { "Content-Type": "application/json" } });
});

app.get("/api/replay", (c) => ok(REPLAY));

/* Paid-job rate limit: local single-user server, simple in-memory window. */
const jobAttempts: number[] = [];
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const JOBS_PER_MINUTE = 10;
/** Hosted deploys spend the owner's Meta credits: cap paid jobs per rolling day (DAILY_JOB_LIMIT, default 40). */
const DAILY_JOB_LIMIT = Number(process.env.DAILY_JOB_LIMIT ?? 40);
function rateLimited(): boolean {
  const now = Date.now();
  while (jobAttempts.length > 0 && now - jobAttempts[0] > DAY_MS) jobAttempts.shift();
  const lastMinute = jobAttempts.filter((at) => now - at <= MINUTE_MS).length;
  if (lastMinute >= JOBS_PER_MINUTE || jobAttempts.length >= DAILY_JOB_LIMIT) return true;
  jobAttempts.push(now);
  return false;
}

async function parseUpload(c: { req: { parseBody: () => Promise<Record<string, unknown>> } }): Promise<
  { bytes: Uint8Array; mediaType: string; body: Record<string, unknown> } | Response
> {
  const body = await c.req.parseBody();
  const upload = body["file"];
  if (!(upload instanceof File)) return err("R2", "multipart file field required");
  const name = upload.name.toLowerCase();
  if (upload.size > 10 * 1024 * 1024) return err("R2", "screenshot exceeds the 10 MB limit", 413);
  const bytes = new Uint8Array(await upload.arrayBuffer());
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const mediaType = isPng ? "image/png" : isJpeg ? "image/jpeg" : null;
  if (mediaType === null && (name.endsWith(".txt") || name.endsWith(".zip"))) {
    return err("R4", "Raw analysis runs in your browser; the server never receives genotypes.", 422);
  }
  if (mediaType === null) return err("R2", "unsupported file type: PNG or JPEG screenshot required");
  return { bytes, mediaType, body };
}

/* Correction step, phase 1: read the screenshot, return shares for the user
 * to confirm or edit before any film generation is paid for. */
app.post("/api/extract", async (c) => {
  const parsed = await parseUpload(c);
  if (parsed instanceof Response) return parsed;
  try {
    const result = await extractComposition(Buffer.from(parsed.bytes).toString("base64"), parsed.mediaType);
    if (result.kind === "rejected") return err(result.code, result.message, 422);
    return ok({ vendor: result.vendor, shares: result.shares, omitted: result.omitted });
  } catch (failure) {
    if (failure instanceof KillSwitchEngaged) return err("R5", "Paid calls are paused (KILL_PAID_CALLS).", 503);
    return err("R4", "Extraction could not finish. Please try again.", 502);
  }
});

app.post("/api/jobs", async (c) => {
  if (rateLimited()) return err("R5", "Too many episodes right now (paid-call protection). Try again later, or watch the saved episode.", 429);
  const parsed = await parseUpload(c);
  if (parsed instanceof Response) return parsed;
  const { bytes, mediaType, body } = parsed;

  let corrected = undefined;
  if (typeof body["corrected"] === "string") {
    let json: unknown;
    try {
      json = JSON.parse(body["corrected"]);
    } catch {
      return err("R2", "corrected shares must be valid JSON");
    }
    const valid = CorrectedSharesSchema.safeParse(json);
    if (!valid.success) return err("R2", "corrected shares failed validation");
    corrected = valid.data;
  }

  const jobId = randomUUID().slice(0, 12);
  const job = createJobRecord(jobId);
  runTraced(job, () => runScreenshotJob(job, Buffer.from(bytes).toString("base64"), mediaType, corrected));
  return ok({ job_id: jobId, state: job.state });
});

/**
 * Raw-episode creation from the browser's derived summary. Strict schema:
 * genotypes, calls and personal coordinates are not accepted fields at all
 * (STACK 105) — anything extra is a 400, never silently forwarded.
 */
const RawSummarySchema = z
  .object({
    basisId: z.string().min(1),
    markerCount: z.number().int().positive(),
    usableMarkers: z.number().int().nonnegative(),
    epochs: z
      .array(
        z
          .object({
            era: z.enum(["bronze", "middle", "modern"]),
            shares: z
              .array(
                z
                  .object({
                    id: z.string(),
                    label: z.string(),
                    weight: z.number().min(0).max(1),
                    low: z.number().min(0).max(1),
                    high: z.number().min(0).max(1),
                  })
                  .strict(),
              )
              .max(24),
            closest: z.array(z.object({ label: z.string(), distance: z.number().nonnegative() }).strict()).max(6),
          })
          .strict(),
      )
      .min(1)
      .max(3),
    limitations: z.array(z.string()).max(12),
  })
  .strict();

app.post("/api/raw-episodes", async (c) => {
  if (rateLimited()) return err("R5", "Too many episodes right now (paid-call protection). Try again later, or watch the saved episode.", 429);
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return err("R2", "JSON body required");
  }
  const parsed = RawSummarySchema.safeParse(body);
  if (!parsed.success) return err("R2", "derived summary failed validation");
  const evidence = EvidenceRecordSchema.parse({ kind: "raw", ...parsed.data });
  const jobId = randomUUID().slice(0, 12);
  const job = createJobRecord(jobId);
  runTraced(job, () => runRawEpisodeJob(job, evidence));
  return ok({ job_id: jobId, state: job.state });
});

app.get("/api/jobs/:id", (c) => {
  const job = jobs.get(c.req.param("id"));
  if (job !== undefined) return ok(statusOf(job));
  const persisted = loadPersistedJob(c.req.param("id"));
  return persisted === null ? err("NOT_FOUND", "unknown job", 404) : ok(persisted);
});

/* Model-call trace for one job: agents, models, tokens, cost, cache hits, timings. No prompts or payloads. */
app.get("/api/jobs/:id/trace", (c) => {
  const jobId = c.req.param("id");
  if (!/^[a-z0-9-]+$/i.test(jobId)) return err("NOT_FOUND", "unknown job", 404);
  const path = join(EPISODE_DIR, jobId, "trace.jsonl");
  if (!existsSync(path)) return err("NOT_FOUND", "no trace for this job", 404);
  const calls = readFileSync(path, "utf8").split("\n").filter((l) => l.length > 0).map((l) => JSON.parse(l) as unknown);
  return ok({ job_id: jobId, calls });
});

/* Reviewed scene images for one job: allowlisted file names only, served from the private episode dir. */
const ASSET_TYPES: Record<string, string> = { png: "image/png", webp: "image/webp", jpeg: "image/jpeg" };
app.get("/api/jobs/:id/assets/:file", (c) => {
  /* Files outlive the in-memory job so a reel already on screen keeps its images across a server restart. */
  const jobId = c.req.param("id");
  const file = c.req.param("file");
  const match = /^([a-z0-9_-]+)\.(png|webp|jpeg)$/i.exec(file);
  if (!/^[a-z0-9-]+$/i.test(jobId) || match === null) return err("NOT_FOUND", "unknown asset", 404);
  const path = join(EPISODE_DIR, jobId, file);
  if (!existsSync(path)) return err("NOT_FOUND", "unknown asset", 404);
  return new Response(readFileSync(path), { headers: { "Content-Type": ASSET_TYPES[match[2].toLowerCase()] ?? "application/octet-stream", "Cache-Control": "private, max-age=3600" } });
});

/* Public reference sampling metadata for the panel sources (labels, places, dates, DOIs). */
app.get("/api/gazetteer", () => ok(Object.fromEntries(loadGazetteer())));

app.get("/api/jobs/:id/events", (c) => {
  const job = jobs.get(c.req.param("id"));
  if (job === undefined) return err("NOT_FOUND", "unknown job", 404);
  return streamSSE(c, async (stream) => {
    let sent = 0;
    while (true) {
      while (sent < job.events.length) {
        await stream.writeSSE({ data: JSON.stringify({ job_id: job.id, ...job.events[sent] }), event: "progress" });
        sent += 1;
      }
      if (job.state === "done" || job.state === "failed" || job.state === "rejected") {
        await stream.writeSSE({ data: JSON.stringify({ state: job.state }), event: "done" });
        return;
      }
      await new Promise<void>((resolve) => {
        job.waiters.push(resolve);
        setTimeout(() => {
          const i = job.waiters.indexOf(resolve);
          if (i >= 0) job.waiters.splice(i, 1);
          resolve();
        }, 15000);
      });
    }
  });
});
