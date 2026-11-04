/** Typed API client. Same-origin /api; the browser never calls model APIs. */

import { z } from "zod";

import {
  CreateJobResponseSchema,
  JobStatusSchema,
  ProgressEventSchema,
  type CreateJobResponse,
  type JobStatus,
  type ProgressEvent,
} from "../contracts/index.ts";

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

interface Envelope {
  ok: boolean;
  data?: unknown;
  code?: string;
  message?: string;
}

async function unwrap<T>(res: Response, parse: (data: unknown) => T): Promise<T> {
  const body = (await res.json()) as Envelope;
  if (!body.ok) throw new ApiError(body.code ?? "UNKNOWN", body.message ?? "request failed");
  return parse(body.data);
}

export interface ExtractedShares {
  vendor: string;
  shares: { id: string; label: string; weight: number }[];
  omitted: string[];
}

const ExtractedSharesSchema = z.object({
  vendor: z.string(),
  shares: z.array(z.object({ id: z.string(), label: z.string(), weight: z.number() })),
  omitted: z.array(z.string()).default([]),
});

export async function extractPreview(file: File): Promise<ExtractedShares> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/extract", { method: "POST", body: form });
  return unwrap(res, (d) => ExtractedSharesSchema.parse(d));
}

export async function createJob(file: File, corrected?: ExtractedShares): Promise<CreateJobResponse> {
  const form = new FormData();
  form.append("file", file);
  if (corrected !== undefined) {
    form.append("corrected", JSON.stringify({ vendor: corrected.vendor, shares: corrected.shares }));
  }
  const res = await fetch("/api/jobs", { method: "POST", body: form });
  return unwrap(res, (d) => CreateJobResponseSchema.parse(d));
}

export async function getJob(jobId: string): Promise<JobStatus> {
  const res = await fetch(`/api/jobs/${jobId}`);
  return unwrap(res, (d) => JobStatusSchema.parse(d));
}

export interface JobStream {
  close: () => void;
}

/** Subscribe to SSE progress; onDone fires once with the terminal state. */
export function subscribeJob(
  jobId: string,
  onEvent: (event: ProgressEvent) => void,
  onDone: (state: string) => void,
  onError: () => void,
): JobStream {
  const source = new EventSource(`/api/jobs/${jobId}/events`);
  let done = false;
  source.addEventListener("progress", (e) => {
    try {
      onEvent(ProgressEventSchema.parse(JSON.parse((e as MessageEvent).data as string)));
    } catch {
      /* malformed frame: ignore */
    }
  });
  source.addEventListener("done", (e) => {
    if (done) return;
    done = true;
    const state = (JSON.parse((e as MessageEvent).data as string) as { state: string }).state;
    source.close();
    onDone(state);
  });
  source.onerror = () => {
    if (!done) onError();
  };
  return {
    close: () => source.close(),
  };
}
