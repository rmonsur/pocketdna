/**
 * Live screenshot pipeline: gatekeep -> extract -> interpret -> direct -> audit.
 * Every paid call via the muse adapter; one audit repair inside budget; typed failures.
 * Raw files never enter here (app.ts rejects them before any bytes are read as text).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  ClaimSchema,
  EvidenceRecordSchema,
  ReelPlanSchema,
  type Claim,
  type EvidenceRecord,
  type ReelPlan,
} from "../contracts/index.ts";
import { callJson, readPrompt } from "../lib/muse/client.ts";
import { SPARK } from "../lib/muse/models.ts";
import { convergenceScene, eraScene, providerEraScene } from "./atlasScenes.ts";
import { loadGazetteer } from "./gazetteer.ts";
import { illustrateEpisode } from "./images.ts";
import { pushEvent, type Job } from "./jobs.ts";
import { disambiguate, displayName, profilePopulations, type PopulationProfile } from "./profiles.ts";

const ASSET_IDS = [
  "asset-steppe-horseman",
  "asset-method-panel",
  "asset-market-town",
  "asset-harbor",
  "asset-convergence-globe",
  "asset-stamp-dark",
];

const GatekeeperOut = z.object({
  vendor: z.string(),
  report_type: z.string(),
  route: z.enum(["tier1", "rejection"]),
  rejection: z.enum(["R1", "R2"]).nullable(),
  confidence: z.number().min(0).max(1),
});

const ParseOut = z.object({
  vendor: z.string(),
  shares: z.array(
    z.object({ id: z.string(), label: z.string(), weight: z.number().min(0).max(1), confidence: z.number().min(0).max(1) }),
  ),
  omitted: z.array(z.string()).default([]),
  error: z.enum(["R1", "R2"]).nullable().default(null),
});

const ExtractorOut = z.union([z.object({ error: z.enum(["R1", "R2"]) }), ParseOut]);

const InterpretOut = z.object({
  claims: z.array(
    z.object({
      claim: z.string(),
      explainer: z.string(),
      citation_ids: z.array(z.string()).min(1),
      epoch: z.enum(["bronze", "middle", "modern"]).nullable(),
    }),
  ),
});

const AuditOut = z.object({
  verdict: z.enum(["pass", "revise", "block"]),
  issues: z.array(z.object({ beat_id: z.string().nullable(), rule: z.string(), fix: z.string() })).default([]),
});

interface IndexEntry {
  id: string;
  claim: string;
  explainer: string;
  source: { authors: string; year: number; venue: string; doi: string | null };
  populations: string[];
  epochs: string[];
}

function loadIndex(): IndexEntry[] {
  const path = join(process.cwd(), "backend", "data", "citation-index.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as { entries: IndexEntry[] };
  return raw.entries;
}

function toClaims(raw: z.infer<typeof InterpretOut>, index: IndexEntry[]): Claim[] {
  const byId = new Map(index.map((e) => [e.id, e]));
  return raw.claims.map((c) => {
    const entry = byId.get(c.citation_ids[0]);
    if (entry === undefined) throw new Error(`unknown citation id ${c.citation_ids[0]}`);
    return ClaimSchema.parse({
      id: entry.id,
      text: c.claim,
      class: "context",
      source: entry.source,
      detail: c.explainer,
    });
  });
}

const OBJ = { type: "object" } as const;
const STR = { type: "string" } as const;
const NUM = { type: "number" } as const;

const OUTPUT_SCHEMAS: Record<string, Record<string, unknown>> = {
  gatekeeper: {
    ...OBJ,
    required: ["vendor", "report_type", "route", "rejection", "confidence"],
    properties: {
      vendor: STR,
      report_type: STR,
      route: { type: "string", enum: ["tier1", "rejection"] },
      rejection: { type: ["string", "null"], enum: ["R1", "R2", null] },
      confidence: NUM,
    },
  },
  extractor: {
    ...OBJ,
    required: ["vendor", "shares", "omitted", "error"],
    properties: {
      error: { type: ["string", "null"], enum: ["R1", "R2", null] },
      vendor: STR,
      shares: {
        type: "array",
        items: {
          ...OBJ,
          required: ["id", "label", "weight", "confidence"],
          properties: { id: STR, label: STR, weight: NUM, confidence: NUM },
        },
      },
      omitted: { type: "array", items: STR },
    },
  },
  interpretation: {
    ...OBJ,
    required: ["claims"],
    properties: {
      claims: {
        type: "array",
        items: {
          ...OBJ,
          required: ["claim", "explainer", "citation_ids", "epoch"],
          properties: {
            claim: STR,
            explainer: STR,
            citation_ids: { type: "array", items: STR },
            epoch: { type: ["string", "null"], enum: ["bronze", "middle", "modern", null] },
          },
        },
      },
    },
  },
  director: {
    ...OBJ,
    required: ["version", "duration_s", "question", "answer", "beats", "audits"],
    properties: {
      version: { type: "number", enum: [1] },
      duration_s: NUM,
      question: STR,
      answer: STR,
      beats: {
        type: "array",
        items: {
          ...OBJ,
          required: ["id", "kind", "era", "tStart", "tEnd", "category", "headline", "subtext", "evidenceClass", "claimIds", "assetId", "coords", "mapPaths"],
          properties: {
            id: STR,
            kind: { type: "string", enum: ["hook", "method", "era", "convergence", "stamp"] },
            era: { type: ["string", "null"], enum: ["bronze", "middle", "modern", null] },
            tStart: NUM,
            tEnd: NUM,
            category: STR,
            headline: STR,
            subtext: STR,
            evidenceClass: { type: "string", enum: ["personal", "context", "editorial"] },
            claimIds: { type: "array", items: STR },
            assetId: STR,
            coords: { type: ["string", "null"] },
            mapPaths: {
              type: "array",
              items: {
                ...OBJ,
                required: ["to", "label"],
                properties: {
                  to: { type: "array", prefixItems: [NUM, NUM], items: false, minItems: 2, maxItems: 2 },
                  label: { type: ["string", "null"] },
                },
              },
            },
          },
        },
      },
      audits: {
        ...OBJ,
        required: ["narrative", "compliance"],
        properties: {
          narrative: { type: "string", enum: ["pass", "pending", "revise", "block"] },
          compliance: { type: "string", enum: ["pass", "pending", "revise", "block"] },
        },
      },
    },
  },
  "narrative-auditor": {
    ...OBJ,
    required: ["verdict", "issues"],
    properties: {
      verdict: { type: "string", enum: ["pass", "revise", "block"] },
      issues: {
        type: "array",
        items: {
          ...OBJ,
          required: ["beat_id", "rule", "fix"],
          properties: { beat_id: { type: ["string", "null"] }, rule: STR, fix: STR },
        },
      },
    },
  },
  compliance: {
    ...OBJ,
    required: ["verdict", "issues"],
    properties: {
      verdict: { type: "string", enum: ["pass", "block"] },
      issues: {
        type: "array",
        items: {
          ...OBJ,
          required: ["beat_id", "rule", "fix"],
          properties: { beat_id: { type: ["string", "null"] }, rule: STR, fix: STR },
        },
      },
    },
  },
};

function schema(name: string): Record<string, unknown> {
  return { name: name.replace(/-/g, "_"), strict: true, schema: OUTPUT_SCHEMAS[name] ?? { type: "object" } };
}

export const CorrectedSharesSchema = z.object({
  vendor: z.string().min(1),
  shares: z
    .array(z.object({ id: z.string(), label: z.string().min(1), weight: z.number().min(0).max(1) }))
    .min(1),
});
export type CorrectedShares = z.infer<typeof CorrectedSharesSchema>;

export type ExtractResult =
  | { kind: "ok"; vendor: string; shares: CorrectedShares["shares"]; omitted: string[] }
  | { kind: "rejected"; code: "R1" | "R2"; message: string };

/** Gatekeeper + extractor only, for the user correction step (STACK 5). */
export async function extractComposition(b64: string, mediaType = "image/png"): Promise<ExtractResult> {
  const imagePart = { type: "image_url", image_url: { url: `data:${mediaType};base64,${b64}` } };
  const gate = await callJson({
    agent: "gatekeeper", model: SPARK, effort: "low",
    messages: [
      { role: "system", content: readPrompt("gatekeeper") },
      { role: "user", content: [imagePart] },
    ],
    jsonSchema: schema("gatekeeper"),
    validate: (d) => GatekeeperOut.parse(d),
  });
  if (gate.data.route === "rejection") {
    const code = gate.data.rejection ?? "R2";
    return {
      kind: "rejected",
      code,
      message: code === "R1" ? "PocketDNA reads ancestry only. We never interpret health data." : "Please upload the ancestry composition screen.",
    };
  }
  const parsed = await callJson({
    agent: "extractor", model: SPARK, effort: "medium",
    messages: [
      { role: "system", content: readPrompt("extractor") },
      { role: "user", content: [imagePart] },
    ],
    jsonSchema: schema("extractor"),
    validate: (d) => ExtractorOut.parse(d),
    runSpentUsd: gate.costUsd,
  });
  if (!("shares" in parsed.data) || parsed.data.error !== null) {
    const code = parsed.data.error ?? "R2";
    return {
      kind: "rejected",
      code,
      message: code === "R1" ? "PocketDNA reads ancestry only. We never interpret health data." : "That screenshot could not be read. Please upload the ancestry composition screen.",
    };
  }
  return { kind: "ok", vendor: parsed.data.vendor, shares: parsed.data.shares, omitted: parsed.data.omitted };
}

/**
 * Raw-episode job: the browser already computed coordinates and era fits.
 * Only the derived summary (as an EvidenceRecord) reaches this server —
 * no genotypes, no personal coordinates (STACK 105). Interpretation,
 * direction and both audits are shared with the screenshot path.
 */
export async function runRawEpisodeJob(job: Job, evidence: EvidenceRecord): Promise<void> {
  job.state = "running";
  job.evidence = evidence;
  pushEvent(job, 1, "Analysed on your device", "browser-worker", "done", "PCA-25 projection (on-device)");
  pushEvent(job, 2, "Fitting era sources", "browser-worker", "done", "era mixtures with bootstrap ranges");
  await continueJob(job, loadIndex(), 0);
}

export async function runScreenshotJob(
  job: Job,
  b64: string,
  mediaType = "image/png",
  corrected?: CorrectedShares,
): Promise<void> {
  job.state = "running";
  let spent = 0;
  const imagePart = { type: "image_url", image_url: { url: `data:${mediaType};base64,${b64}` } };
  const index = loadIndex();

  if (corrected !== undefined) {
    /* User confirmed/corrected the extraction: skip both vision calls. */
    pushEvent(job, 1, "Reading your results", SPARK, "done", "confirmed by you");
    job.evidence = EvidenceRecordSchema.parse({
      kind: "provider",
      vendor: corrected.vendor,
      shares: corrected.shares,
      limitations: ["Screenshot findings only; no SNP analysis performed.", "Percentages confirmed or edited by you before generation."],
    });
    pushEvent(job, 2, "Extracting composition", SPARK, "done", `${corrected.shares.length} provider rows (user-confirmed)`);
    await continueJob(job, index, spent);
    return;
  }

  pushEvent(job, 1, "Reading your results", SPARK, "running");
  const gate = await callJson({
    agent: "gatekeeper", model: SPARK, effort: "low",
    messages: [
      { role: "system", content: readPrompt("gatekeeper") },
      { role: "user", content: [imagePart] },
    ],
    jsonSchema: schema("gatekeeper"),
    validate: (d) => GatekeeperOut.parse(d),
    runSpentUsd: spent,
  });
  spent += gate.costUsd;
  if (gate.data.route === "rejection") {
    job.state = "rejected";
    job.rejection = gate.data.rejection ?? "R2";
    job.message =
      job.rejection === "R1"
        ? "PocketDNA reads ancestry only. We never interpret health data."
        : "Please upload the ancestry composition screen.";
    pushEvent(job, 1, "Reading your results", SPARK, "done", `rejected ${job.rejection}`);
    return;
  }
  pushEvent(job, 1, "Reading your results", SPARK, "done", `vendor: ${gate.data.vendor}`);

  pushEvent(job, 2, "Extracting composition", SPARK, "running");
  const parsed = await callJson({
    agent: "extractor", model: SPARK, effort: "medium",
    messages: [
      { role: "system", content: readPrompt("extractor") },
      { role: "user", content: [imagePart] },
    ],
    jsonSchema: schema("extractor"),
    validate: (d) => ExtractorOut.parse(d),
    runSpentUsd: spent,
  });
  spent += parsed.costUsd;
  if (!("shares" in parsed.data) || parsed.data.error !== null) {
    const code = parsed.data.error ?? "R2";
    job.state = "rejected";
    job.rejection = code;
    job.message =
      code === "R1"
        ? "PocketDNA reads ancestry only. We never interpret health data."
        : "That screenshot could not be read. Please upload the ancestry composition screen.";
    pushEvent(job, 2, "Extracting composition", SPARK, "done", `rejected ${code}`);
    return;
  }
  const evidence: EvidenceRecord = EvidenceRecordSchema.parse({
    kind: "provider",
    vendor: parsed.data.vendor,
    shares: parsed.data.shares,
    limitations: ["Screenshot findings only; no SNP analysis performed."],
  });
  job.evidence = evidence;
  pushEvent(job, 2, "Extracting composition", SPARK, "done", `${parsed.data.shares.length} provider rows`);
  await continueJob(job, index, spent);
}

/** Evidence with readable population names in place of panel codes (ids unchanged). */
export function readableEvidence(evidence: EvidenceRecord, profiles: PopulationProfile[]): EvidenceRecord {
  if (evidence.kind !== "raw") return evidence;
  const gazetteer = loadGazetteer();
  return {
    ...evidence,
    epochs: evidence.epochs.map((epoch) => {
      const names = disambiguate(epoch.shares.map((s) => displayName(s.id, profiles, gazetteer, s.label)));
      return {
        ...epoch,
        shares: epoch.shares.map((s, i) => ({ ...s, label: names[i] })),
        closest: [...new Set(epoch.closest.map((c) => displayName(c.label, profiles, gazetteer, c.label)))].map((label) => ({
          label,
          distance: epoch.closest.find((c) => displayName(c.label, profiles, gazetteer, c.label) === label)?.distance ?? 0,
        })),
      };
    }),
  };
}

/** Deterministic globe scenes from gazetteer records (ATLAS): never model-chosen geometry. */
export function withAtlas(plan: ReelPlan, evidence: EvidenceRecord): ReelPlan {
  const gazetteer = loadGazetteer();
  const allClaimIds = [...new Set(plan.beats.flatMap((b) => b.claimIds))];
  return {
    ...plan,
    beats: plan.beats.map((beat) => {
      if (beat.kind === "era" && beat.era !== undefined) {
        const atlas =
          evidence.kind === "raw"
            ? eraScene(evidence, beat.era, gazetteer)
            : (providerEraScene(evidence, beat.era, beat.claimIds, gazetteer) ?? providerEraScene(evidence, beat.era, allClaimIds, gazetteer));
        return atlas === undefined ? beat : { ...beat, atlas };
      }
      if (beat.kind === "convergence") {
        const atlas = convergenceScene(evidence, allClaimIds, gazetteer);
        return atlas === undefined ? beat : { ...beat, atlas };
      }
      return beat;
    }),
  };
}

async function continueJob(job: Job, index: IndexEntry[], spentAtStart: number): Promise<void> {
  const original = job.evidence;
  if (original === null) throw new Error("continueJob requires evidence");
  let spent = spentAtStart;

  /* Citations first: the profiler needs the cited studies to pick context sites for provider episodes. */
  pushEvent(job, 3, "Selecting your citations", SPARK, "running");
  const labelled = readableEvidence(original, []);
  const cited = await callJson({
    agent: "interpretation", model: SPARK, effort: "high",
    messages: [
      { role: "system", content: readPrompt("interpretation") },
      {
        role: "user",
        content: [{ type: "text", text: JSON.stringify({ evidence: labelled, index }) }],
      },
    ],
    jsonSchema: schema("interpretation"),
    validate: (d) => InterpretOut.parse(d),
    runSpentUsd: spent,
  });
  spent += cited.costUsd;
  const citedClaims = toClaims(cited.data, index);
  pushEvent(job, 3, "Selecting your citations", SPARK, "done", `${citedClaims.length} citations grounded`);

  pushEvent(job, 4, "Profiling reference populations", SPARK, "running");
  const profiled = await profilePopulations(original, citedClaims.map((c) => c.id), spent);
  spent += profiled.costUsd;
  const evidence = readableEvidence(original, profiled.profiles);
  job.evidence = evidence;
  const claims = [...profiled.claims, ...citedClaims];
  job.claims = claims;
  pushEvent(job, 4, "Profiling reference populations", SPARK, "done", `${profiled.profiles.length} populations explained`);

  const directOnce = async (repairIssues: unknown): Promise<ReelPlan> => {
    const reel = await callJson({
      agent: "director", model: SPARK, effort: "high",
      messages: [
        { role: "system", content: readPrompt("director") },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify({ evidence, profiles: profiled.profiles, claims, assetIds: ASSET_IDS, repairIssues }),
            },
          ],
        },
      ],
      jsonSchema: schema("director"),
      validate: (d) => {
        const raw = d as { beats: Array<Record<string, unknown>> };
        for (const beat of raw.beats) if (beat.era === null) delete beat.era;
        return ReelPlanSchema.parse(raw);
      },
      runSpentUsd: spent,
    });
    spent += reel.costUsd;
    return reel.data;
  };

  pushEvent(job, 5, "Directing your film", SPARK, "running");
  let plan = await directOnce(null);
  pushEvent(job, 5, "Directing your film", SPARK, "done", `${plan.beats.length} beats, ${plan.duration_s}s`);
  pushEvent(job, 6, "Auditing", SPARK, "running");

  /* The two audits are independent reviews of the same frozen plan; run them concurrently (RULES: reserve budget first). */
  const auditOnce = async (audited: ReelPlan) => {
    const reservedSpent = spent;
    const [narrative, compliance] = await Promise.all([
      callJson({
        agent: "narrative-auditor", model: SPARK, effort: "high",
        messages: [
          { role: "system", content: readPrompt("narrative-auditor") },
          { role: "user", content: [{ type: "text", text: JSON.stringify({ plan: audited, evidence, claims }) }] },
        ],
        jsonSchema: schema("narrative-auditor"),
        validate: (d) => AuditOut.parse(d),
        runSpentUsd: reservedSpent,
      }),
      callJson({
        agent: "compliance", model: SPARK, effort: "high",
        messages: [
          { role: "system", content: readPrompt("compliance") },
          { role: "user", content: [{ type: "text", text: JSON.stringify({ plan: audited }) }] },
        ],
        jsonSchema: schema("compliance"),
        validate: (d) => AuditOut.parse(d),
        runSpentUsd: reservedSpent,
      }),
    ]);
    spent += narrative.costUsd + compliance.costUsd;
    return { narrative: narrative.data, compliance: compliance.data };
  };

  let audits = await auditOnce(plan);
  const blocked = audits.narrative.verdict !== "pass" || audits.compliance.verdict !== "pass";
  if (blocked) {
    const issues = [...audits.narrative.issues, ...audits.compliance.issues];
    plan = await directOnce(issues);
    audits = await auditOnce(plan);
  }
  if (audits.narrative.verdict !== "pass" || audits.compliance.verdict !== "pass") {
    job.state = "failed";
    job.rejection = "R4";
    job.message = "Film failed audit (narrative/compliance). No reel renders without a pass.";
    pushEvent(job, 6, "Auditing", SPARK, "failed", "audit blocked");
    return;
  }
  pushEvent(job, 6, "Auditing", SPARK, "done", "narrative + compliance pass");

  /* Approved copy is frozen here; atlas scenes and images add no claims. */
  plan = withAtlas(plan, evidence);
  const atlasBeats = plan.beats.filter((b) => b.atlas !== undefined).length;
  pushEvent(job, 7, "Illustrating scenes", "muse-image-1.0", "running", `${atlasBeats} globe scenes from reference records`);
  try {
    const illustrated = await illustrateEpisode(job.id, plan, spent);
    spent += illustrated.costUsd;
    job.assets = illustrated.assets;
    const approved = illustrated.outcomes.filter((o) => o.status === "approved").length;
    const repaired = illustrated.outcomes.filter((o) => o.repaired).length;
    const fallback = illustrated.outcomes.length - approved;
    pushEvent(job, 7, "Illustrating scenes", "muse-image-1.0", "done", `${approved} reviewed images (${repaired} repaired), ${fallback} on fallback plates`);
  } catch (err) {
    pushEvent(job, 7, "Illustrating scenes", "muse-image-1.0", "failed", err instanceof Error ? err.message.slice(0, 80) : "image step failed");
  }

  job.reel = plan;
  job.state = "done";
  pushEvent(job, 8, "Film ready", "engine", "done", `${plan.beats.length} beats, cited, $${spent.toFixed(2)} this run`);
}
