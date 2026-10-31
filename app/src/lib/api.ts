/** Typed HTTP client for the PocketDNA backend. Frontend never touches model APIs directly. */
import { JobStatusSchema, ReelSchema, type JobStatusDto, type ReelDto } from "./schemas";

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function envelope<T>(res: Response, parse: (data: unknown) => T): Promise<T> {
  const body: unknown = await res.json();
  if (typeof body !== "object" || body === null || !("ok" in body)) {
    throw new ApiError("BAD_ENVELOPE", "bad response envelope");
  }
  const env = body as { ok: boolean; data?: unknown; code?: string; message?: string };
  if (!env.ok) throw new ApiError(env.code ?? "UNKNOWN", env.message ?? "request failed");
  return parse(env.data);
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

export async function createJob(file: PickedFile): Promise<JobStatusDto> {
  const form = new FormData();
  form.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  const res = await fetch(`${BASE}/v1/jobs`, { method: "POST", body: form });
  return envelope(res, (d) => JobStatusSchema.parse(d));
}

export async function getJob(jobId: string): Promise<JobStatusDto> {
  const res = await fetch(`${BASE}/v1/jobs/${jobId}`);
  return envelope(res, (d) => JobStatusSchema.parse(d));
}

export async function getSampleReel(): Promise<ReelDto> {
  const res = await fetch(`${BASE}/v1/sample/reel`);
  return envelope(res, (d) => ReelSchema.parse(d));
}
