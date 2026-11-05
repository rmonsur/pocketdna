/**
 * HistoricalImageAgent (AGENT.md / IMAGE.md): one reviewed scene image per era
 * beat, compiled from the gazetteer place and date of the chapter's leading
 * reference marker. Bounded: MAX_IMAGES per episode, concurrency two, one
 * independent visual audit per candidate, at most one HIST-REPAIR-01 edit
 * per scene and MAX_REPAIRS per episode; any failure leaves the beat on its
 * deterministic plate. Personal percentages never enter a prompt; bytes
 * never enter logs.
 */

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { Beat, ReelPlan, SceneAsset, SceneAssets } from "../contracts/index.ts";
import { callImage, callJson, readPrompt, IMAGE_LANDSCAPE_SIZE, IMAGE_USD_PER_IMAGE, type ImageResult } from "../lib/muse/client.ts";
import { IMAGE, SPARK } from "../lib/muse/models.ts";

export const MAX_IMAGES_PER_EPISODE = 6;
export const MAX_REPAIRS_PER_EPISODE = 2;
export const IMAGE_CONCURRENCY = 2;
/** Episode files live beside the muse cache; POCKETDNA_LOCAL_DIR points both at a persistent disk when hosted. */
export const EPISODE_DIR = join(process.env.POCKETDNA_LOCAL_DIR ?? join(process.cwd(), ".local"), "episodes");
const PROMPT_TEMPLATE_ID = "HIST-IMAGE-01-v2-landscape";
const REPAIR_TEMPLATE_ID = "HIST-REPAIR-01-v1";
const AUDIT_TEMPLATE_ID = "HIST-AUDIT-01-v2";

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

export const AuditOut = z.object({
  verdict: z.enum(["pass", "repair", "fallback"]),
  issues: z.array(z.object({ region: z.string(), severity: z.enum(["low", "medium", "high"]), note: z.string() })).default([]),
  repair: z.string().default(""),
});

export type AuditVerdict = z.infer<typeof AuditOut>;

const AUDIT_SCHEMA = {
  name: "visual_audit",
  strict: true,
  schema: {
    type: "object",
    required: ["verdict", "issues", "repair"],
    properties: {
      verdict: { type: "string", enum: ["pass", "repair", "fallback"] },
      issues: {
        type: "array",
        items: {
          type: "object",
          required: ["region", "severity", "note"],
          properties: { region: { type: "string" }, severity: { type: "string", enum: ["low", "medium", "high"] }, note: { type: "string" } },
        },
      },
      repair: { type: "string" },
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
    "Create one beautiful, cinematic, historically grounded reconstruction for PocketDNA. Landscape 16:9, like a frame of a documentary film.",
    "This is an illustrative reconstruction, not an archival photograph and not a portrait of anyone's actual ancestors.",
    "",
    `SETTING: ${brief.place}, ${brief.dateText} (reference family: ${brief.family}).`,
    `PURPOSE: ${brief.purpose} It accompanies a separately stated genetic-similarity finding and makes no claim about any person's family.`,
    `ACTION: ${actionFor(brief)}.`,
    "SUBJECTS: fictional inhabitants of this setting in roles appropriate to the action; appearance is not derived from any genetic result.",
    "",
    `Use your web and image search to verify period and regional visual details for ${brief.place} around ${brief.dateText}. Prioritize ${sources}. Do not substitute popular entertainment imagery. Where a detail is unknown, keep it visually nonspecific rather than inventing it. Search supports reconstruction; it does not establish provenance.`,
    "",
    "COMPOSITION: wide cinematic frame, low eye level, natural lens, focal subject in the right two thirds of the frame. One clear focal action. Layered foreground and distant terrain; tangible materials and credible scale. Keep crucial subjects inside the central 85% of frame height. Keep the left 45% of the frame visually quiet and uncluttered (open landscape, sky or soft background) because a caption card sits there.",
    "LIGHT: low warm sunlight from one side. Natural highlights, restrained earth palette, atmospheric depth, readable shadows and subtle cinematic grain.",
    "MOOD: dignified human agency through ordinary skilled work, travel or community. Beautiful without fantasy spectacle or idealized luxury.",
    "",
    "Exclude: battle, weapons as a subject, conquest imagery, political symbols, modern equipment in ancient scenes, fantasy armour, invented monuments, unsupported ornament, any text or lettering, logos, percentages, maps, charts and watermarks. Do not infer physical traits from genetics. Do not render citations into the image.",
  ].join("\n");
}

/** HIST-REPAIR-01: scoped correction of the attached candidate; nothing else changes. */
export function compileRepairPrompt(brief: SceneBrief, instruction: string): string {
  if (instruction.trim() === "") throw new Error("repair instruction missing");
  return [
    "Edit the attached image. The historical review identified this visible error:",
    instruction.trim(),
    `Follow the approved setting: ${brief.place}, ${brief.dateText}. If the replacement is uncertain, remove the object and preserve a plausible background instead.`,
    "Preserve the approved composition, lighting, faces, other objects and the quiet left 45% of the frame for captions. Add nothing else. No text, lettering or labels.",
  ].join("\n");
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function dataUrl(bytes: Uint8Array, format: string): string {
  return `data:image/${format};base64,${Buffer.from(bytes).toString("base64")}`;
}

async function auditImage(brief: SceneBrief, image: ImageResult, runSpentUsd: number): Promise<{ audit: AuditVerdict; costUsd: number }> {
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
          { type: "image_url", image_url: { url: dataUrl(image.bytes, image.format) } },
        ],
      },
    ],
    jsonSchema: AUDIT_SCHEMA,
    validate: (d) => AuditOut.parse(d),
    runSpentUsd,
  });
  return { audit: result.data, costUsd: result.costUsd };
}

export interface SceneOutcome {
  beatId: string;
  status: "approved" | "fallback" | "failed";
  asset: SceneAsset | null;
  reason: string | null;
  repaired: boolean;
  costUsd: number;
  manifest: Record<string, unknown>;
}

/** Shared episode-wide repair allowance (AGENT.md: one per scene, two per episode). */
export interface RepairBudget {
  remaining: number;
}

export interface SceneTarget {
  dir: string;
  urlBase: string;
  mode: SceneAsset["mode"] | null;
}

function issuesText(audit: AuditVerdict): string {
  return audit.issues.map((i) => `${i.severity}: ${i.region}: ${i.note}`).join("; ");
}

/** Generate, audit, optionally repair once and re-audit; write the approved file into the target dir. */
export async function produceScene(target: SceneTarget, brief: SceneBrief, runSpentUsd: number, repairs: RepairBudget): Promise<SceneOutcome> {
  const prompt = compileScenePrompt(brief);
  const base = { beatId: brief.beatId, template: PROMPT_TEMPLATE_ID, auditTemplate: AUDIT_TEMPLATE_ID, brief, prompt, model: IMAGE };
  const attempts: Array<Record<string, unknown>> = [];
  try {
    let image = await callImage({ agent: "historical-image", model: IMAGE, prompt, size: IMAGE_LANDSCAPE_SIZE, runSpentUsd });
    let cost = image.costUsd;
    let { audit, costUsd: auditCost } = await auditImage(brief, image, runSpentUsd + cost);
    cost += auditCost;
    attempts.push({ kind: "initial", hash: sha256(image.bytes), cached: image.cached, audit });
    let repaired = false;
    if (audit.verdict === "repair" && repairs.remaining > 0 && audit.repair.trim() !== "") {
      repairs.remaining -= 1;
      const repairPrompt = compileRepairPrompt(brief, audit.repair);
      const fixed = await callImage({
        agent: "historical-image-repair",
        model: IMAGE,
        prompt: repairPrompt,
        size: IMAGE_LANDSCAPE_SIZE,
        references: [{ dataUrl: dataUrl(image.bytes, image.format), caption: "Reference A: the candidate to edit. Change only what the instruction names." }],
        runSpentUsd: runSpentUsd + cost,
      });
      cost += fixed.costUsd;
      const second = await auditImage(brief, fixed, runSpentUsd + cost);
      cost += second.costUsd;
      attempts.push({ kind: "repair", template: REPAIR_TEMPLATE_ID, prompt: repairPrompt, hash: sha256(fixed.bytes), cached: fixed.cached, audit: second.audit });
      if (second.audit.verdict === "pass") {
        image = fixed;
        audit = second.audit;
        repaired = true;
      } else {
        audit = { ...second.audit, verdict: "fallback" };
      }
    } else if (audit.verdict === "repair") {
      audit = { ...audit, verdict: "fallback", issues: [...audit.issues, { region: "episode", severity: "medium", note: "repair allowance exhausted" }] };
    }
    const hash = sha256(image.bytes);
    if (audit.verdict !== "pass") {
      return {
        beatId: brief.beatId,
        status: "fallback",
        asset: null,
        reason: `visual audit: ${issuesText(audit) || audit.verdict}`,
        repaired,
        costUsd: cost,
        manifest: { ...base, hash, attempts, mode: image.cached ? "cache" : "live", status: "fallback" },
      };
    }
    mkdirSync(target.dir, { recursive: true });
    const file = `${brief.beatId}.${image.format}`;
    writeFileSync(join(target.dir, file), image.bytes);
    const mode = target.mode ?? (image.cached ? "cache" : "live");
    const asset: SceneAsset = {
      url: `${target.urlBase}/${file}`,
      mode,
      label: `Illustrative historical reconstruction · ${brief.place}, ${brief.dateText}`,
      audit: repaired ? "repaired" : "pass",
      place: brief.place,
      dateText: brief.dateText,
    };
    return { beatId: brief.beatId, status: "approved", asset, reason: null, repaired, costUsd: cost, manifest: { ...base, hash, attempts, file, mode, status: "approved" } };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "image step failed";
    return { beatId: brief.beatId, status: "failed", asset: null, reason, repaired: false, costUsd: 0, manifest: { ...base, attempts, status: "failed", reason } };
  }
}

/** Briefs for era beats whose atlas names a located leading marker; one per era, max MAX_IMAGES. */
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

/** Run the briefs with the shared budget and attach the first approved image to the hook beat. */
export async function illustrateBriefs(target: SceneTarget, briefs: SceneBrief[], hookBeatId: string | null, runSpentUsd: number): Promise<IllustrationResult> {
  const repairs: RepairBudget = { remaining: MAX_REPAIRS_PER_EPISODE };
  const reserved = runSpentUsd + briefs.length * IMAGE_USD_PER_IMAGE;
  const outcomes = await pool(briefs, IMAGE_CONCURRENCY, (brief) => produceScene(target, brief, reserved, repairs));
  const assets: SceneAssets = {};
  for (const outcome of outcomes) if (outcome.asset !== null) assets[outcome.beatId] = outcome.asset;
  const anchor = outcomes.find((o) => o.asset !== null);
  if (hookBeatId !== null && anchor !== undefined && anchor.asset !== null) assets[hookBeatId] = anchor.asset;
  const costUsd = outcomes.reduce((sum, o) => sum + o.costUsd, 0);
  return { assets, outcomes, costUsd };
}

export async function illustrateEpisode(jobId: string, plan: ReelPlan, runSpentUsd: number): Promise<IllustrationResult> {
  const target: SceneTarget = { dir: join(EPISODE_DIR, jobId), urlBase: `/api/jobs/${jobId}/assets`, mode: null };
  const hook = plan.beats.find((b: Beat) => b.kind === "hook");
  const result = await illustrateBriefs(target, sceneBriefs(plan), hook?.id ?? null, runSpentUsd);
  try {
    mkdirSync(target.dir, { recursive: true });
    writeFileSync(join(target.dir, "image-manifest.json"), JSON.stringify({ jobId, scenes: result.outcomes.map((o) => o.manifest), costUsd: result.costUsd }, null, 1));
  } catch {
    /* manifest is diagnostics; the episode still renders */
  }
  return result;
}
