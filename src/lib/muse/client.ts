/**
 * Server-only Muse adapter (RULES: every paid call goes through here).
 * Structured output via JSON schema, retry once with the validation error,
 * content-addressed cache, per-call cost log, kill switch. Never import from app code.
 */

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EFFORT, priceUsd } from "./models.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
/** Private diagnostics root; tests point this at a scratch directory. */
const LOCAL_DIR = process.env.POCKETDNA_LOCAL_DIR ?? join(ROOT, ".local");
const CACHE_DIR = join(LOCAL_DIR, "muse-cache");
const COST_LOG = join(LOCAL_DIR, "muse-cost.jsonl");
const API_BASE = process.env.META_API_URL ?? "https://api.meta.ai/v1";
const MAX_TOKENS_PER_CALL = 16384;
/** Recorded pricing snapshot (IMAGE.md): $0.01 per returned image, grounding included. */
export const IMAGE_USD_PER_IMAGE = 0.01;
const IMAGE_TIMEOUT_MS = 180_000;
/** Live-verified: the Responses API rejected "1080x1920" as an unknown value; 1024x1536 is the accepted portrait size. */
export const IMAGE_PORTRAIT_SIZE = "1024x1536";

export class KillSwitchEngaged extends Error {}
export class BudgetExceeded extends Error {}
export class ModelCallError extends Error {}

export interface ImageResult {
  bytes: Uint8Array;
  format: "webp" | "png" | "jpeg";
  model: string;
  costUsd: number;
  cached: boolean;
  responseId: string | null;
}

export interface CallResult<T> {
  data: T;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  cached: boolean;
}

let dotenvLoaded = false;

function loadDotEnv(): void {
  if (dotenvLoaded) return;
  dotenvLoaded = true;
  const path = join(ROOT, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] === undefined) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

function apiKey(): string {
  loadDotEnv();
  const key = process.env.META_API_KEY ?? "";
  if (key === "") throw new ModelCallError("META_API_KEY missing (server .env, never committed)");
  return key;
}

function killed(): boolean {
  return (process.env.KILL_PAID_CALLS ?? "") !== "";
}

function cacheKey(model: string, messages: unknown, schema: unknown): string {
  return createHash("sha256").update(JSON.stringify({ m: model, msg: messages, s: schema })).digest("hex");
}

/** Meta requires additionalProperties:false on every object (live-verified). */
export function strictifySchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strictifySchema);
  if (node !== null && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = strictifySchema(v);
    if (out.type === "object") out.additionalProperties = false;
    return out;
  }
  return node;
}

/** Tolerant completion parsing: strict, then first-object slice, then control-char repair. */
export function parseModelJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    /* fall through */
  }
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = content.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      return JSON.parse(escapeRawControls(slice));
    }
  }
  throw new Error("no JSON object in completion");
}

function escapeRawControls(s: string): string {
  let out = "";
  let inStr = false;
  let esc = false;
  for (const ch of s) {
    if (inStr) {
      if (esc) {
        out += ch;
        esc = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        esc = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inStr = false;
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      if (ch === "\r") {
        out += "\\r";
        continue;
      }
      if (ch === "\t") {
        out += "\\t";
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') inStr = true;
    out += ch;
  }
  return out;
}

function cacheGet(key: string): { data: unknown } | null {
  const path = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as { data: unknown };
}

function cachePut(key: string, body: unknown): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(body));
}

export function readPrompt(name: string): string {
  return readFileSync(join(ROOT, "prompts", `${name}.md`), "utf8");
}

export interface CallJsonOpts<T> {
  agent: string;
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  jsonSchema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
  validate: (data: unknown) => T;
  runSpentUsd?: number;
  runSpendCapUsd?: number;
}

export async function callJson<T>(opts: CallJsonOpts<T>): Promise<CallResult<T>> {
  if (killed()) throw new KillSwitchEngaged("KILL_PAID_CALLS is set; refusing paid call");
  const cap = opts.runSpendCapUsd ?? 5.0;
  if ((opts.runSpentUsd ?? 0) >= cap) throw new BudgetExceeded(`run cap $${cap.toFixed(2)} reached`);

  const effort = EFFORT[opts.effort ?? "medium"];
  const maxTokens = Math.min(effort.maxTokens, MAX_TOKENS_PER_CALL);
  const jsonSchema = {
    ...opts.jsonSchema,
    schema: strictifySchema(opts.jsonSchema.schema ?? opts.jsonSchema),
  };
  const key = cacheKey(opts.model, opts.messages, jsonSchema);
  const hit = cacheGet(key);
  if (hit !== null) {
    return { data: opts.validate(hit.data), model: opts.model, inputTokens: 0, outputTokens: 0, costUsd: 0, cached: true };
  }

  let lastError = "";
  let lastContent = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const messages =
      attempt === 0
        ? opts.messages
        : [
            ...opts.messages,
            {
              role: "user",
              content: `Your previous output failed validation: ${lastError}. Fix it and return valid JSON only.`,
            },
          ];
    const payload = {
      model: opts.model,
      messages,
      temperature: effort.temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_schema", json_schema: jsonSchema },
    };
    let resp: Response;
    try {
      resp = await fetch(`${API_BASE}/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(120_000),
        headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new ModelCallError(`${opts.agent}: transport error: ${String(err).slice(0, 200)}`);
    }
    if (!resp.ok) throw new ModelCallError(`${opts.agent}: HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
    const raw = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    try {
      const content = raw.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim() === "") throw new Error("empty completion");
      lastContent = content;
      const validated = opts.validate(parseModelJson(content));
      const inTok = Number(raw.usage?.prompt_tokens ?? 0);
      const outTok = Number(raw.usage?.completion_tokens ?? 0);
      const cost = priceUsd(opts.model, inTok, outTok);
      cachePut(key, { data: validated });
      mkdirSync(dirname(COST_LOG), { recursive: true });
      appendFileSync(
        COST_LOG,
        JSON.stringify({ agent: opts.agent, model: opts.model, in: inTok, out: outTok, usd: Number(cost.toFixed(4)) }) + "\n",
      );
      return { data: validated, model: opts.model, inputTokens: inTok, outputTokens: outTok, costUsd: cost, cached: false };
    } catch (err) {
      lastError = String(err).slice(0, 500);
    }
  }
  try {
    mkdirSync(LOCAL_DIR, { recursive: true });
    writeFileSync(
      join(LOCAL_DIR, "last-model-failure.json"),
      JSON.stringify({ agent: opts.agent, error: lastError, preview: lastContent.slice(0, 1500), at: new Date().toISOString() }) + "\n",
    );
  } catch {
    /* diagnostics only */
  }
  throw new ModelCallError(`${opts.agent}: schema validation failed twice: ${lastError}`);
}

export interface CallImageOpts {
  agent: string;
  model: string;
  prompt: string;
  /** "WxH" aspect request from the provider's accepted set; a ratio hint, not guaranteed pixels. */
  size?: string;
  format?: "webp" | "png" | "jpeg";
  reasoningStrength?: "high" | "low";
  runSpentUsd?: number;
  runSpendCapUsd?: number;
}

interface ResponsesOutputItem {
  type?: string;
  id?: string;
  result?: string;
}

function imageCacheGet(key: string): { format: ImageResult["format"]; bytes: Uint8Array } | null {
  const meta = join(CACHE_DIR, `${key}.image.json`);
  const bin = join(CACHE_DIR, `${key}.image.bin`);
  if (!existsSync(meta) || !existsSync(bin)) return null;
  const parsed = JSON.parse(readFileSync(meta, "utf8")) as { format: ImageResult["format"] };
  return { format: parsed.format, bytes: new Uint8Array(readFileSync(bin)) };
}

function imageCachePut(key: string, format: string, bytes: Uint8Array): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(join(CACHE_DIR, `${key}.image.json`), JSON.stringify({ format }));
  writeFileSync(join(CACHE_DIR, `${key}.image.bin`), bytes);
}

/**
 * Muse Image through the Responses API (IMAGE.md): only the image_generation
 * tool, shell disabled, store:false. Bytes never enter logs; the cache keys on
 * the exact compiled prompt, model and settings.
 */
export async function callImage(opts: CallImageOpts): Promise<ImageResult> {
  if (killed()) throw new KillSwitchEngaged("KILL_PAID_CALLS is set; refusing paid call");
  const cap = opts.runSpendCapUsd ?? 5.0;
  if ((opts.runSpentUsd ?? 0) + IMAGE_USD_PER_IMAGE > cap) throw new BudgetExceeded(`run cap $${cap.toFixed(2)} reached`);
  const format = opts.format ?? "webp";
  const tool = {
    type: "image_generation",
    size: opts.size ?? IMAGE_PORTRAIT_SIZE,
    output_format: format,
    reasoning_strength: opts.reasoningStrength ?? "high",
    enable_web_search: true,
    enable_image_search: true,
    enable_shell: false,
  };
  const key = cacheKey(opts.model, opts.prompt, tool);
  const hit = imageCacheGet(key);
  if (hit !== null) {
    return { bytes: hit.bytes, format: hit.format, model: opts.model, costUsd: 0, cached: true, responseId: null };
  }
  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}/responses`, {
      method: "POST",
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: opts.model, input: opts.prompt, store: false, tools: [tool] }),
    });
  } catch (err) {
    throw new ModelCallError(`${opts.agent}: transport error: ${String(err).slice(0, 200)}`);
  }
  if (!resp.ok) throw new ModelCallError(`${opts.agent}: HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const raw = (await resp.json()) as { id?: string; output?: ResponsesOutputItem[] };
  const item = (raw.output ?? []).find((o) => o.type === "image_generation_call" && typeof o.result === "string");
  if (item === undefined || item.result === undefined) {
    throw new ModelCallError(`${opts.agent}: no image_generation_call item in response`);
  }
  const bytes = new Uint8Array(Buffer.from(item.result, "base64"));
  if (bytes.length < 1024) throw new ModelCallError(`${opts.agent}: image payload too small (${bytes.length} bytes)`);
  imageCachePut(key, format, bytes);
  mkdirSync(dirname(COST_LOG), { recursive: true });
  appendFileSync(
    COST_LOG,
    JSON.stringify({ agent: opts.agent, model: opts.model, in: 0, out: 0, usd: IMAGE_USD_PER_IMAGE }) + "\n",
  );
  return { bytes, format, model: opts.model, costUsd: IMAGE_USD_PER_IMAGE, cached: false, responseId: raw.id ?? null };
}
