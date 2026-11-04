/**
 * PocketDNA local server: one localhost origin (API + static dist).
 * Raw genotypes never reach this server (RULES) — raw jobs are rejected typed.
 */

import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { JobStatusSchema } from "../contracts/index.ts";
import { REPLAY } from "../contracts/fixtures.ts";
import { KillSwitchEngaged, ModelCallError } from "../lib/muse/client.ts";
import { createJobRecord, jobs, type Job } from "./jobs.ts";
import { runScreenshotJob } from "./pipeline.ts";

export const app = new Hono();

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

function failJob(job: Job, failure: unknown): void {
  job.state = "failed";
  if (failure instanceof KillSwitchEngaged) {
    job.rejection = "R5";
    job.message = "Paid calls are paused (KILL_PAID_CALLS). Replay and fixtures still run.";
  } else if (failure instanceof ModelCallError) {
    job.rejection = "R4";
    job.message = failure.message.slice(0, 200);
  } else {
    job.rejection = "R4";
    job.message = String(failure).slice(0, 200);
  }
}

app.get("/api/health", (c) => ok({ status: "ok", mode: "local" }));

app.get("/api/replay", (c) => ok(REPLAY));

app.post("/api/jobs", async (c) => {
  const body = await c.req.parseBody();
  const upload = body["file"];
  if (!(upload instanceof File)) return err("R2", "multipart file field required");
  const name = upload.name.toLowerCase();
  if (upload.size > 10 * 1024 * 1024) return err("R2", "screenshot exceeds the 10 MB limit", 413);
  const bytes = new Uint8Array(await upload.arrayBuffer());
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const mediaType = isPng ? "image/png" : isJpeg ? "image/jpeg" : null;
  const jobId = randomUUID().slice(0, 12);
  const job = createJobRecord(jobId);

  if (mediaType === null && (name.endsWith(".txt") || name.endsWith(".zip"))) {
    job.state = "failed";
    job.rejection = "R4";
    job.message =
      "Raw analysis runs in your browser (worker) once the validated science bundle ships; the server never receives genotypes.";
    return err(job.rejection, job.message, 422);
  }
  if (mediaType === null) return err("R2", "unsupported file type: PNG or JPEG screenshot required");

  void runScreenshotJob(job, Buffer.from(bytes).toString("base64"), mediaType).catch((failure: unknown) => {
    failJob(job, failure);
  });
  return ok({ job_id: jobId, state: job.state });
});

app.get("/api/jobs/:id", (c) => {
  const job = jobs.get(c.req.param("id"));
  if (job === undefined) return err("NOT_FOUND", "unknown job", 404);
  const status = JobStatusSchema.parse({
    job_id: job.id,
    state: job.state,
    rejection: job.rejection,
    message: job.message,
    reel: job.reel,
    evidence: job.evidence,
    claims: job.claims,
    events: job.events.map((e) => ({ job_id: job.id, ...e })),
  });
  return ok(status);
});

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
