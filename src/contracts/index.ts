/**
 * Versioned product contracts (STACK 5/6). EvidenceRecord discriminates provider
 * data from raw findings; only the raw branch carries measured results.
 * Times are seconds; the film is 90-150s (default 120).
 */

import { z } from "zod";

export const EraSchema = z.enum(["bronze", "middle", "modern"]);
export type Era = z.infer<typeof EraSchema>;

export const ProviderShareSchema = z.object({
  id: z.string(),
  label: z.string(),
  weight: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1).optional(),
});

export const FittedShareSchema = z.object({
  id: z.string(),
  label: z.string(),
  weight: z.number().min(0).max(1),
  low: z.number().min(0).max(1),
  high: z.number().min(0).max(1),
});

export const ClosestSampleSchema = z.object({
  label: z.string(),
  distance: z.number(),
});

export const EvidenceRecordSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("provider"),
    vendor: z.string(),
    shares: z.array(ProviderShareSchema),
    limitations: z.array(z.string()),
  }),
  z.object({
    kind: z.literal("raw"),
    basisId: z.string(),
    markerCount: z.number().int().nonnegative(),
    usableMarkers: z.number().int().nonnegative(),
    epochs: z.array(
      z.object({
        era: EraSchema,
        shares: z.array(FittedShareSchema),
        closest: z.array(ClosestSampleSchema),
      }),
    ),
    limitations: z.array(z.string()),
  }),
]);

export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

export const ReferenceBundleSchema = z.object({
  schemaVersion: z.literal(1),
  basisId: z.string(),
  releases: z.array(
    z.object({ name: z.string(), version: z.string(), doi: z.string().nullable() }),
  ),
  checksums: z.record(z.string(), z.string()),
});

export type ReferenceBundle = z.infer<typeof ReferenceBundleSchema>;

export const ClaimSchema = z.object({
  id: z.string(),
  text: z.string(),
  class: z.enum(["finding", "context"]),
  source: z.object({
    authors: z.string(),
    year: z.number().int(),
    venue: z.string(),
    doi: z.string().nullable(),
  }),
  detail: z.string().nullable(),
});

export type Claim = z.infer<typeof ClaimSchema>;

export const MapPathSchema = z.object({
  to: z.tuple([z.number(), z.number()]),
  label: z.string().nullable(),
});

/** One reference sampling location on the reel globe (ATLAS 6: provenance, never territory). */
export const AtlasMarkerSchema = z.object({
  id: z.string(),
  label: z.string(),
  place: z.string().nullable(),
  dateText: z.string().nullable(),
  lon: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  weight: z.number().min(0).max(1),
});

export type AtlasMarker = z.infer<typeof AtlasMarkerSchema>;

/** Deterministic globe scene attached to a beat by the server, from gazetteer records only. */
export const AtlasSceneSchema = z.object({
  preset: z.enum(["locate-region", "affinity-overview"]),
  focus: z.tuple([z.number(), z.number()]),
  markers: z.array(AtlasMarkerSchema).max(12),
  legend: z.string(),
});

export type AtlasScene = z.infer<typeof AtlasSceneSchema>;

export const BeatSchema = z.object({
  id: z.string(),
  kind: z.enum(["hook", "method", "era", "convergence", "stamp"]),
  era: EraSchema.optional(),
  tStart: z.number().nonnegative(),
  tEnd: z.number().nonnegative(),
  category: z.string(),
  headline: z.string(),
  subtext: z.string(),
  evidenceClass: z.enum(["personal", "context", "editorial"]),
  claimIds: z.array(z.string()),
  assetId: z.string(),
  coords: z.string().nullable(),
  mapPaths: z.array(MapPathSchema),
  atlas: AtlasSceneSchema.optional(),
});

export type Beat = z.infer<typeof BeatSchema>;

export const ReelPlanSchema = z
  .object({
    version: z.literal(1),
    duration_s: z.number().min(90).max(150),
    question: z.string(),
    answer: z.string(),
    beats: z.array(BeatSchema).min(7).max(9),
    audits: z.object({
      narrative: z.enum(["pass", "pending", "revise", "block"]),
      compliance: z.enum(["pass", "pending", "revise", "block"]),
    }),
  })
  .superRefine((plan, ctx) => {
    let cursor = 0;
    for (const beat of plan.beats) {
      if (Math.abs(beat.tStart - cursor) > 0.01) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `beat ${beat.id} must start at ${cursor}s (no gaps or overlaps)` });
      }
      if (beat.tEnd <= beat.tStart) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `beat ${beat.id} must have positive duration` });
      }
      cursor = beat.tEnd;
    }
    if (Math.abs(cursor - plan.duration_s) > 0.01) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "beats must tile the full duration" });
    }
  });

export type ReelPlan = z.infer<typeof ReelPlanSchema>;

export const ReplayBundleSchema = z.object({
  mode: z.literal("replay"),
  plan: ReelPlanSchema,
  evidence: EvidenceRecordSchema,
  claims: z.array(ClaimSchema),
});

export type ReplayBundle = z.infer<typeof ReplayBundleSchema>;

/** A reviewed scene image for one beat asset id; the URL is same-origin. */
export const SceneAssetSchema = z.object({
  url: z.string(),
  mode: z.enum(["live", "cache", "fallback", "replay"]),
  label: z.string(),
  audit: z.enum(["pass", "repaired", "fallback"]),
  place: z.string().nullable(),
  dateText: z.string().nullable(),
});

export type SceneAsset = z.infer<typeof SceneAssetSchema>;

export type SceneAssets = Record<string, SceneAsset>;

/** What the viewport renders, regardless of origin. */
export interface ViewingBundle {
  mode: "replay" | "live";
  plan: ReelPlan;
  evidence: EvidenceRecord;
  claims: Claim[];
  assets: SceneAssets;
}

export const ProgressEventSchema = z.object({
  job_id: z.string(),
  step: z.number().int().min(1).max(9),
  title: z.string(),
  model: z.string(),
  status: z.enum(["running", "done", "failed"]),
  artifact: z.string().default(""),
});

export type ProgressEvent = z.infer<typeof ProgressEventSchema>;

export const JobStatusSchema = z.object({
  job_id: z.string(),
  state: z.enum(["queued", "running", "done", "failed", "rejected"]),
  rejection: z.enum(["R1", "R2", "R3", "R4", "R5"]).nullable(),
  message: z.string().default(""),
  reel: ReelPlanSchema.nullable().default(null),
  evidence: EvidenceRecordSchema.nullable().default(null),
  claims: z.array(ClaimSchema).default([]),
  assets: z.record(z.string(), SceneAssetSchema).default({}),
  events: z.array(ProgressEventSchema).default([]),
});

export type JobStatus = z.infer<typeof JobStatusSchema>;

export const CreateJobResponseSchema = z.object({ job_id: z.string(), state: z.string() });
export type CreateJobResponse = z.infer<typeof CreateJobResponseSchema>;

/** Typed error envelope everywhere on the API. */
export const EnvelopeOkSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ ok: z.literal(true), data });
export const EnvelopeErrSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
});
