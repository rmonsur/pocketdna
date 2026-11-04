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
import { pushEvent, type Job } from "./jobs.ts";

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

export async function runScreenshotJob(job: Job, b64: string, mediaType = "image/png"): Promise<void> {
  job.state = "running";
  let spent = 0;
  const imagePart = { type: "image_url", image_url: { url: `data:${mediaType};base64,${b64}` } };
  const index = loadIndex();

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

  pushEvent(job, 3, "Selecting your citations", SPARK, "running");
  const cited = await callJson({
    agent: "interpretation", model: SPARK, effort: "high",
    messages: [
      { role: "system", content: readPrompt("interpretation") },
      {
        role: "user",
        content: [{ type: "text", text: JSON.stringify({ evidence, index }) }],
      },
    ],
    jsonSchema: schema("interpretation"),
    validate: (d) => InterpretOut.parse(d),
    runSpentUsd: spent,
  });
  spent += cited.costUsd;
  const claims = toClaims(cited.data, index);
  job.claims = claims;
  pushEvent(job, 3, "Selecting your citations", SPARK, "done", `${claims.length} claims grounded`);

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
              text: JSON.stringify({ evidence, claims, assetIds: ASSET_IDS, repairIssues }),
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

  pushEvent(job, 4, "Directing your film", SPARK, "running");
  let plan = await directOnce(null);
  pushEvent(job, 5, "Choosing your scenes", SPARK, "done", "plates assigned");
  pushEvent(job, 6, "Auditing", SPARK, "running");

  const auditOnce = async (audited: ReelPlan) => {
    const narrative = await callJson({
      agent: "narrative-auditor", model: SPARK, effort: "high",
      messages: [
        { role: "system", content: readPrompt("narrative-auditor") },
        { role: "user", content: [{ type: "text", text: JSON.stringify({ plan: audited, evidence }) }] },
      ],
      jsonSchema: schema("narrative-auditor"),
      validate: (d) => AuditOut.parse(d),
      runSpentUsd: spent,
    });
    spent += narrative.costUsd;
    const compliance = await callJson({
      agent: "compliance", model: SPARK, effort: "high",
      messages: [
        { role: "system", content: readPrompt("compliance") },
        { role: "user", content: [{ type: "text", text: JSON.stringify({ plan: audited }) }] },
      ],
      jsonSchema: schema("compliance"),
      validate: (d) => AuditOut.parse(d),
      runSpentUsd: spent,
    });
    spent += compliance.costUsd;
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

  job.reel = plan;
  job.state = "done";
  pushEvent(job, 6, "Auditing", SPARK, "done", "A5 pass");
  pushEvent(job, 7, "Film ready", "engine", "done", "7+ beats, cited");
}
