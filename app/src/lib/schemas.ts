/** Zod mirrors of shared/*.schema.json. Every API payload validates here before render. */
import { z } from "zod";

export const BeatSchema = z.object({
  id: z.string(),
  kind: z.enum(["hook", "method", "era", "convergence", "stamp"]),
  epoch: z.enum(["bronze", "middle", "modern"]).optional(),
  t_start: z.number(),
  t_end: z.number(),
  copy: z.string().max(140),
  explainer: z.string().max(280).default(""),
  citation_ids: z.array(z.string()).default([]),
  scene_id: z.string().default(""),
  map_path: z.array(z.tuple([z.number(), z.number()])).default([]),
});

export const ReelSchema = z.object({
  version: z.literal(1),
  duration_s: z.number().min(90).max(150),
  beats: z.array(BeatSchema).length(7),
});

export const ProgressEventSchema = z.object({
  job_id: z.string(),
  step: z.number().min(1).max(7),
  title: z.string().default(""),
  model: z.string().default(""),
  status: z.enum(["running", "done", "failed"]),
  artifact: z.string().default(""),
});

export const JobStatusSchema = z.object({
  job_id: z.string(),
  tier: z.enum(["tier1", "tier2"]),
  state: z.enum(["queued", "running", "done", "failed", "rejected"]),
  rejection: z.enum(["R1", "R2", "R3", "R4", "R5"]).nullable().default(null),
  message: z.string().default(""),
  reel: ReelSchema.nullable().default(null),
  events: z.array(ProgressEventSchema).default([]),
});

export type ReelDto = z.infer<typeof ReelSchema>;
export type BeatDto = z.infer<typeof BeatSchema>;
export type JobStatusDto = z.infer<typeof JobStatusSchema>;
export type ProgressEventDto = z.infer<typeof ProgressEventSchema>;
