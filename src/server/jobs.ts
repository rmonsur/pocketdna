/** Job records + event log (SSE source). In-memory; manifests persist with export. */

import type { Claim, EvidenceRecord, ReelPlan, SceneAssets } from "../contracts/index.ts";

export type JobState = "queued" | "running" | "done" | "failed" | "rejected";

export interface JobEvent {
  step: number;
  title: string;
  model: string;
  status: string;
  artifact: string;
}

export interface Job {
  id: string;
  state: JobState;
  rejection: string | null;
  message: string;
  reel: ReelPlan | null;
  evidence: EvidenceRecord | null;
  claims: Claim[];
  assets: SceneAssets;
  events: JobEvent[];
  waiters: Array<() => void>;
}

export const jobs = new Map<string, Job>();

export function createJobRecord(id: string): Job {
  const job: Job = {
    id,
    state: "queued",
    rejection: null,
    message: "",
    reel: null,
    evidence: null,
    claims: [],
    assets: {},
    events: [],
    waiters: [],
  };
  jobs.set(id, job);
  return job;
}

export function pushEvent(job: Job, step: number, title: string, model: string, status: string, artifact = ""): void {
  job.events.push({ step, title, model, status, artifact });
  for (const wake of job.waiters.splice(0)) wake();
}
