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
const CACHE_DIR = join(ROOT, ".local", "muse-cache");
const COST_LOG = join(ROOT, ".local", "muse-cost.jsonl");
const API_BASE = process.env.META_API_URL ?? "https://api.meta.ai/v1";
const MAX_TOKENS_PER_CALL = 8192;

export class KillSwitchEngaged extends Error {}
export class BudgetExceeded extends Error {}
export class ModelCallError extends Error {}

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
    mkdirSync(join(ROOT, ".local"), { recursive: true });
    writeFileSync(
      join(ROOT, ".local", "last-model-failure.json"),
      JSON.stringify({ agent: opts.agent, error: lastError, preview: lastContent.slice(0, 1500), at: new Date().toISOString() }) + "\n",
    );
  } catch {
    /* diagnostics only */
  }
  throw new ModelCallError(`${opts.agent}: schema validation failed twice: ${lastError}`);
}
