/**
 * HistoricalImageAgent (AGENT.md / IMAGE.md): one reviewed scene image per era
 * beat, compiled from the gazetteer place and date of the chapter's leading
 * reference source. Bounded: MAX_IMAGES per episode, concurrency two, one
 * independent visual audit per candidate, no repairs in this version; any
 * failure leaves the beat on its deterministic plate. Personal percentages
 * never enter a prompt; bytes never enter logs.
 */

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { Beat, ReelPlan, SceneAsset, SceneAssets } from "../contracts/index.ts";
import { callImage, callJson, readPrompt, IMAGE_USD_PER_IMAGE } from "../lib/muse/client.ts";
import { IMAGE, SPARK } from "../lib/muse/models.ts";

export const MAX_IMAGES_PER_EPISODE = 6;
export const IMAGE_CONCURRENCY = 2;
export const EPISODE_DIR = join(process.cwd(), ".local", "episodes");
const PROMPT_TEMPLATE_ID = "HIST-IMAGE-01-v1";
const AUDIT_TEMPLATE_ID = "HIST-AUDIT-01-v1";

export interface SceneBrief {
  beatId: string;
  era: string;
  place: string;
  dateText: string;
  family: string;
  publication: string | null;
  doi: string | null;
  purpose: string;
}

const AuditOut = z.object({
  verdict: z.enum(["pass", "fallback"]),
  issues: z.array(z.object({ region: z.string(), severity: z.enum(["low", "medium", "high"]), note: z.string() })).default([]),
});

const AUDIT_SCHEMA = {
  name: "visual_audit",
  strict: true,
  schema: {
    type: "object",
    required: ["verdict", "issues"],
    properties: {
      verdict: { type: "string", enum: ["pass", "fallback"] },
      issues: {
        type: "array",
        items: {
          type: "object",
          required: ["region", "severity", "note"],
          properties: { region: { type: "string" }, severity: { type: "string", enum: ["low", "medium", "high"] }, note: { type: "string" } },
        },
      },
    },
  },
};

function actionFor(brief: SceneBrief): string {
  if (brief.dateText === "present-day") {
    return "an ordinary present-day moment in this locality: people at everyday work or travel in the actual landscape, with no costume or ethnic styling inferred from any label";
  }
  return "a small group engaged in one ordinary, period-plausible task of daily life (preparing food, tending animals, building, making or carrying goods), seen from a slight distance";
}

/** HIST-IMAGE-01 with every placeholder resolved from the brief; throws on a missing required field. */
export function compileScenePrompt(brief: SceneBrief): string {
  for (const [key, value] of Object.entries(brief)) {
    if (value === "" && key !== "publication" && key !== "doi") throw new Error(`scene brief missing ${key}`);
  }
  const sources =
    brief.publication !== null
      ? `the publication ${brief.publication}${brief.doi !== null ? ` (doi ${brief.doi})` : ""}, excavation reports and museum object records for this place and period`
      : "excavation reports and museum object records for this place and period";
  return [
    "Create one beautiful, cinematic, historically grounded reconstruction for PocketDNA. Portrait 9:16.",
    "This is an illustrative reconstruction, not an archival photograph and not a portrait of anyone's actual ancestors.",
    "",
    `SETTING: ${brief.place}, ${brief.dateText} (reference family: ${brief.family}).`,
    `PURPOSE: ${brief.purpose} It accompanies a separately stated genetic-similarity finding and makes no claim about any person's family.`,
    `ACTION: ${actionFor(brief)}.`,
    "SUBJECTS: fictional inhabitants of this setting in roles appropriate to the action; appearance is not derived from any genetic result.",
    "",
    `Use your web and image search to verify period and regional visual details for ${brief.place} around ${brief.dateText}. Prioritize ${sources}. Do not substitute popular entertainment imagery. Where a detail is unknown, keep it visually nonspecific rather than inventing it. Search supports reconstruction; it does not establish provenance.`,
    "",
    "COMPOSITION: medium-wide, low eye level, natural lens, focal subject slightly off centre. One clear focal action. Layered foreground and distant terrain; tangible materials and credible scale. Keep crucial subjects inside the central 80% of frame width and between 12% and 72% of frame height. Keep the lower 22% visually quiet for captions.",
    "LIGHT: low warm sunlight from one side. Natural highlights, restrained earth palette, atmospheric depth, readable shadows and subtle cinematic grain.",
    "MOOD: dignified human agency through ordinary skilled work, travel or community. Beautiful without fantasy spectacle or idealized luxury.",
    "",
    "Exclude: battle, weapons as a subject, conquest imagery, political symbols, modern equipment in ancient scenes, fantasy armour, invented monuments, unsupported ornament, any text or lettering, logos, percentages, maps, charts and watermarks. Do not infer physical traits from genetics. Do not render citations into the image.",
  ].join("\n");
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function auditImage(brief: SceneBrief, bytes: Uint8Array, format: string, runSpentUsd: number): Promise<{ verdict: "pass" | "fallback"; issues: string[]; costUsd: number }> {
  const dataUrl = `data:image/${format};base64,${Buffer.from(bytes).toString("base64")}`;
  const result = await callJson({
    agent: "visual-auditor",
    model: SPARK,
    effort: "medium",
    messages: [
      { role: "system", content: readPrompt("visual-auditor") },
      {
        role: "user",
        content: [
          { type: "text", text: JSON.stringify({ brief: { place: brief.place, date: brief.dateText, family: brief.family, purpose: brief.purpose } }) },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    jsonSchema: AUDIT_SCHEMA,
    validate: (d) => AuditOut.parse(d),
    runSpentUsd,
  });
  return { verdict: result.data.verdict, issues: result.data.issues.map((i) => `${i.severity}: ${i.region}: ${i.note}`), costUsd: result.costUsd };
}

export interface SceneOutcome {
  beatId: string;
  status: "approved" | "fallback" | "failed";
  asset: SceneAsset | null;
  reason: string | null;
  costUsd: number;
  manifest: Record<string, unknown>;
}

async function produceScene(jobId: string, brief: SceneBrief, runSpentUsd: number): Promise<SceneOutcome> {
  const prompt = compileScenePrompt(brief);
  const base = { beatId: brief.beatId, template: PROMPT_TEMPLATE_ID, auditTemplate: AUDIT_TEMPLATE_ID, brief, prompt, model: IMAGE };
  try {
    const image = await callImage({ agent: "historical-image", model: IMAGE, prompt, format: "png", runSpentUsd });
    let cost = image.costUsd;
    const audit = await auditImage(brief, image.bytes, image.format, runSpentUsd + cost);
    cost += audit.costUsd;
    const hash = sha256(image.bytes);
    if (audit.verdict !== "pass") {
      return {
        beatId: brief.beatId,
        status: "fallback",
        asset: null,
        reason: `visual audit: ${audit.issues.join("; ") || "fallback"}`,
        costUsd: cost,
        manifest: { ...base, hash, audit, mode: image.cached ? "cache" : "live", status: "fallback" },
      };
    }
    const dir = join(EPISODE_DIR, jobId);
    mkdirSync(dir, { recursive: true });
    const file = `${brief.beatId}.${image.format}`;
    writeFileSync(join(dir, file), image.bytes);
    const asset: SceneAsset = {
      url: `/api/jobs/${jobId}/assets/${file}`,
      mode: image.cached ? "cache" : "live",
      label: `Illustrative historical reconstruction · ${brief.place}, ${brief.dateText}`,
      audit: "pass",
      place: brief.place,
      dateText: brief.dateText,
    };
    return { beatId: brief.beatId, status: "approved", asset, reason: null, costUsd: cost, manifest: { ...base, hash, audit, file, mode: asset.mode, status: "approved" } };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "image step failed";
    return { beatId: brief.beatId, status: "failed", asset: null, reason, costUsd: 0, manifest: { ...base, status: "failed", reason } };
  }
}

/** Briefs for era beats whose atlas names a located leading source; one per era, max MAX_IMAGES. */
export function sceneBriefs(plan: ReelPlan): SceneBrief[] {
  const seen = new Set<string>();
  const briefs: SceneBrief[] = [];
  for (const beat of plan.beats) {
    if (beat.kind !== "era" || beat.era === undefined || seen.has(beat.era) || beat.atlas === undefined) continue;
    const lead = beat.atlas.markers[0];
    if (lead === undefined || lead.place === null || lead.dateText === null) continue;
    seen.add(beat.era);
    briefs.push({
      beatId: beat.id,
      era: beat.era,
      place: lead.place,
      dateText: lead.dateText,
      family: lead.label,
      publication: null,
      doi: null,
      purpose: `Contextual illustration for the ${beat.era} chapter of an ancestry documentary: ${beat.category}.`,
    });
  }
  return briefs.slice(0, MAX_IMAGES_PER_EPISODE);
}

async function pool<T, R>(items: T[], size: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await run(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

export interface IllustrationResult {
  assets: SceneAssets;
  outcomes: SceneOutcome[];
  costUsd: number;
}

export async function illustrateEpisode(jobId: string, plan: ReelPlan, runSpentUsd: number): Promise<IllustrationResult> {
  const briefs = sceneBriefs(plan);
  const reserved = runSpentUsd + briefs.length * IMAGE_USD_PER_IMAGE;
  const outcomes = await pool(briefs, IMAGE_CONCURRENCY, (brief) => produceScene(jobId, brief, reserved));
  const assets: SceneAssets = {};
  for (const outcome of outcomes) if (outcome.asset !== null) assets[outcome.beatId] = outcome.asset;
  const hook = plan.beats.find((b: Beat) => b.kind === "hook");
  const anchor = outcomes.find((o) => o.asset !== null);
  if (hook !== undefined && anchor !== null && anchor !== undefined && anchor.asset !== null) assets[hook.id] = anchor.asset;
  const costUsd = outcomes.reduce((sum, o) => sum + o.costUsd, 0);
  try {
    const dir = join(EPISODE_DIR, jobId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "image-manifest.json"), JSON.stringify({ jobId, scenes: outcomes.map((o) => o.manifest), costUsd }, null, 1));
  } catch {
    /* manifest is diagnostics; the episode still renders */
  }
  return { assets, outcomes, costUsd };
}
