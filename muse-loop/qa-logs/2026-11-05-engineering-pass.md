# Engineering pass — 2026-11-05

Skills installed (`muse skills install <subskill> --scope user`) from
[mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering):
`code-review`, `tdd`, `diagnosing-bugs`. The engineering folder is a pack of sub-skills,
not one SKILL.md, so it cannot be installed as a single package. There is no dedicated
security skill in the pack; the Security Review below applies the code-review Standards
axis with a security lens.

Scope of all four tasks: target runtime (`src/`, `tests/`, `scripts/`, `prompts/`, root
configs) at HEAD `d2dd040` + uncommitted working tree. `app/` (Expo) and `backend/`
(Python) are superseded prototypes, out of scope. SmartPCA and the G25 engine untouched.

## 1. Code Review (two axes, parallel sub-agents)

### Standards
Hard violations:
- `src/server/pipeline.ts` (377 lines) and `runScreenshotJob` (~170 lines) exceed
  RULES.md file/function size guidance; `useDropzone()` lacks an explicit return type.
- `console.log` in `src/server/main.ts` and all `tests/*.ts` / `scripts/*.mjs`
  (RULES.md: structured logging; test PASS lines judged acceptable, server log open).
- Boundary validation gaps (now fixed, see Security): first-byte image sniff, no 10 MB
  cap, client-side casts instead of Zod parsing in `src/lib/api.ts`.
- `src/server/main.ts` bound all interfaces (fixed: `127.0.0.1`); Muse `fetch` had no
  timeout (fixed: 120s `AbortSignal`); unknown-model cost silently falls back to $0.
- Layout drift vs STACK §11 (`src/features/...` not used); `pipeline.ts` reads
  `backend/data/citation-index.json` at runtime, coupling runtime to the legacy tree.
- DESIGN token drift in `tailwind.config.ts`; `index.html` said "30-second"
  (fixed: "two-minute"); EvidenceTooltip is not the accessible drawer STACK §8 requires.
- No 80% coverage gate in `package.json`.

Judgement calls (Fowler smells): Duplicated Code (hand-written `OUTPUT_SCHEMAS` mirrors
Zod schemas; `scripts/export.mjs` rebuilds what `buildManifest` owns); Divergent Change /
Primitive Obsession (`pipeline.ts` mixes all agents; rejection codes are bare strings);
Mysterious Name / Speculative Generality (`OBJ/STR/NUM`, unused model constants);
Repeated Switches (era→label logic in ReelViewport vs AtlasPage).

### Spec
Missing/partial: raw-DNA browser worker absent (server typed-rejects, honestly labelled);
live image generation absent (asset IDs rendered as gradients); no user correction step;
evidence UX is a tooltip, not a drawer; no one-command judge bootstrap; AGENT.md roster
collapsed (no HistoricalResearchReviewer / AtlasAgent gates).
Scope creep: `/atlas` and `/library` routes not in ABOUT's film structure; Waveform and
`navigator.share` imply deferred audio/sharing surfaces.
Implemented but wrong: REPLAY fixture hook ("Your oldest signal is 5,000 years old",
fabricated 612,409-marker `kind:"raw"` record) breaches ABOUT superlative-evidence rule;
MapOverlay/AtlasGlobe draw routes despite the no-personal-itinerary rule; plan schema
checked only the last beat (fixed: full tiling); citation index lives in legacy tree.

## 2. Write tests (tdd skill — public seams only)

Seams agreed upfront: contract schemas, Muse adapter JSON tolerance, public HTTP API
(model transport stubbed at `fetch`; no internals mocked).
- `tests/modelJson.test.ts` (new): 10 assertions — strict/fenced/prose-wrapped parsing,
  raw control chars, unrecoverable input throws for caller retry. Caught one wrong
  assumption of mine (it throws, it does not return null); test fixed, code unchanged.
- `tests/extractor-rejection.test.ts` (new): extractor R1/R2 regression (see §4).
- `tests/server.test.ts`: unknown-job events 404, missing file 400, fake-image sniff 400,
  >10 MB upload 413.
- `tests/contracts.test.ts`: gapped and overlapping beat plans must not validate.

## 3. Security Review

Findings and disposition:
1. **CRITICAL (fixed):** personal genome `.txt` in `dataset/` was explicitly un-ignored
   by `dataset/.gitignore` and untracked — one `git add -A` from committing a full
   genome. Exception removed; `git check-ignore` now confirms it is ignored. The file
   stays on disk.
2. **HIGH (fixed):** upload had no size cap and one-byte sniffing, and JPEGs were
   forwarded as `image/png`. Now: 10 MB cap (413 R2), full PNG/JPEG magic sniffing,
   correct media type passed to the model.
3. **MEDIUM (fixed):** API bound all interfaces. Now `hostname: "127.0.0.1"`.
4. **MEDIUM (fixed):** Muse API `fetch` had no timeout. Now 120s `AbortSignal.timeout`.
5. **LOW (fixed):** SSE waiters leaked after their 15s timeout; timed-out waiters are
   now spliced out.
6. **Dependency:** `npm audit --omit=dev`: 4 vulnerabilities (3 moderate, 1 high —
   zod <4.6.6 memory exhaustion, GHSA-mrhx-c7xc-m3w5). Fix is the breaking zod 3→4
   upgrade; NOT applied mid-hackathon. Inputs to Zod here are size-bounded by the new
   upload cap and JSON schemas. Schedule the upgrade with a full test pass.
7. Clean: no secrets in `src/`/`tests/`/`scripts/`/`prompts/` (key is env-only);
   `.env` and `.local/` ignored and untracked; raw genotypes rejected server-side (422);
   no hosted fallback for raw data.

## 4. Diagnose bugs (diagnosing-bugs skill)

Bug: a health screenshot slipping past the gatekeeper failed the job as generic R4
instead of rejecting R1 (privacy rule: health panels get an explicit ancestry-only
refusal). Loop: `tests/extractor-rejection.test.ts` stubs `fetch`, returns gatekeeper
tier1 then extractor `{"error":"R1"}` — red (`failed` != `rejected`) before the fix,
green after, for both R1 and R2. Root cause: `prompts/extractor.md` instructs
`{"error": "R1"|"R2"}` but the extractor JSON schema and `ParseOut` Zod schema had no
error shape, so validation failed twice and `failJob` mapped it to R4. Fix: `error`
added to the model-facing schema, prompt now shows `"error": null` on success,
`ExtractorOut` union accepts the error-only shape, and the pipeline rejects typed R1/R2
with the standard messages. The test also exposed that the adapter response cache
replays identical images across jobs (by design); fixture bytes are now varied per job.

Second diagnosed defect (from Spec axis): `ReelPlanSchema` only checked the last beat's
end, so gapped/overlapping plans validated. Fixed with full tiling refinement
(first beat at 0, contiguous, positive durations, exact total); negative tests added.

## Verification (all run this session)

- `npx tsx tests/{extractor-rejection,modelJson,server,contracts,reel,client,atlas,export}.test.ts` — all PASS
- `npx tsc --noEmit` — PASS; `npx vite build` — PASS
- `python3 -m pytest backend -q` — 30 passed
- MP4 export (fps 10): `pocketdna.mp4` 1080×1920, 1200 frames, 120.000s, silent;
  `pocketdna.mp4.manifest.json` carries citations/DOIs. ffprobe-verified.
- Live servers from earlier sessions still healthy (`/api/health` ok, Vite 200);
  restart `npm run dev:api` to pick up today's server fixes.

Self-score: 7.5/10. Fixes are verified, but the review's structural findings
(pipeline.ts size, citation index in the legacy tree, evidence drawer, coverage gate,
zod 4 upgrade, REPLAY superlative hook) remain open and are listed honestly above.
