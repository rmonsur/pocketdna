/** Derive what the viewport should say about an in-flight episode from pipeline events. */

import type { ProgressEvent } from "../contracts/index.ts";

export const PIPELINE_STEP_COUNT = 8;

export interface GenerationStatusProps {
  title: string;
  detail: string;
  step: number | null;
}

export function statusFromEvents(events: ProgressEvent[]): GenerationStatusProps {
  const latest = events[events.length - 1];
  if (latest === undefined) return { title: "Starting your episode", detail: "Contacting the film agents", step: null };
  const detail = latest.artifact !== "" ? latest.artifact : latest.status === "running" ? `${latest.model} working` : latest.model;
  return { title: latest.title, detail, step: latest.step };
}
