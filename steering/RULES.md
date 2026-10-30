# Rules for building this project

1. CRITICAL: hackathon compliance (non-negotiable, disqualification risk) 
2. engineering rules: Muse Code must read and follow these when writing any code in this project

## Part 1 — Hackathon compliance

1. Public repo from day one. Verify public access from a logged-out browser before submission.


2. New work only. Everything demoed was built Oct 26 - Nov 4. Do NOT reuse old code,
   prompts, or assets. If any pre-existing concept is referenced, the README states exactly
   what is new. The demo highlights only hackathon-built functionality.

3. Rights to all data and assets:
   - Builder's own DNA export: owned.
   - Facebook screenshots: sent directly to the builder by members of ancestry groups the
     builder is part of, used WITH PERMISSION; all personal information redacted before any use.
     Keep a record of each permission (screenshot of the message granting it). Never scrape
     or lift screenshots from group feeds.
   - Reference panels: AADR (Reich Lab, Harvard Dataverse, DOI 10.7910/DVN/FFIDCW); record
     version and cite properly. MengTo Skills repo (html-reel): MIT licensed, attribute.
   - No scraped vendor assets, logos, or copyrighted report designs in the app or demo.

4. Banned-category firewall (enforced structurally by the ComplianceAuditorAgent, see
   AGENTS_PIPELINE.MD, which gates every reel before render):
   - NO health, trait, carrier, or wellness interpretation, ever. The Gatekeeper rejects
     health panels; narratives and citations exclude phenotype/selection stories
     (e.g., lactase persistence, disease resistance). Ancestry only.
   - NO personality/identity inference from DNA ("adventurous like your steppe ancestors"
     is banned copy) — this drifts into the "Personality Analyzers" ban and ethnic essentialism.
   - NO political framing and NO war content: migration/expansion language only, never
     invasion/conquest glorification; era and population names, never modern nations as heirs;
     no battle imagery in generated scenes (DESIGN.md negative constraints).
   - Demo and submission copy never lead with or describe the product as screenshot analysis
     ("Simple Image Analyzer" ban) — the engine and the reel are the product; the screenshot
     is a convenience input.
5. Solo Indie track: one submission, builder is the Representative.
6. Deadline: November 4, 9:00 PM EST. Internal: submit by 2:00 PM EST.

## Part 2 — Engineering rules (for Muse Code)

### Language and types

- TypeScript strict mode everywhere (app and any TS services). Explicit return types.
- No `any`; use `unknown` and narrow. `const` by default.
- `interface` for object shapes, `type` for unions.
- strong bias for functional programming; clean composable calleable functions; each function limited to 50-100 LOC limit unless necessary. Functions are grouped by association
- optimize for human readablity avoiding spaghetti code
- Python (Modal jobs): type hints on all functions, pydantic models for all I/O.

### Validation at every boundary

- Zod schemas for: all API request/response bodies, all Muse model structured outputs, all Modal job results. A model response that fails schema validation is retried once with the validation error in the prompt, then surfaces a typed error — never rendered raw.

- File uploads: whitelist (PNG/JPEG screenshots; .txt OR .zip 23andMe and Ancestry export for raw, exactly as downloaded from the vendor), size caps (10MB images, 50MB raw), content sniffing not extension trust. Unzip server-side with a zip-bomb guard (entry count and decompressed-size limits), then confirm the inner file header matches the 23andMe or AncestryDNA export format. 

### Secrets and privacy (CRITICAL for this project)

- No hardcoded secrets. META_API_KEY and BASETEN_API_KEY live in Modal Secrets / EAS secrets.

- NEVER log genotype data, even truncated. Log counts and hashes only.

- Raw genotype files: processed in Modal, derived composition stored, raw file deleted after
  job completion. Document this in README. 

- Raw-file tier is ALWAYS PRIVATE (no toggle): genotype-derived content must only reach the
  open-weights endpoint (Glimmer on Modal, Spark Open on Baseten as backup). Add an assertion
  in the router that blocks hosted-API calls for any raw-file job, with a test.

- All storage on Modal Volumes, served via signed endpoints only; no PII in analytics.

### Budget caps (CRITICAL, before any code runs)

- Meta credits expire Nov 4 and usage after that bills the card. Set dashboard spending
  caps/alerts on Meta, Modal, and Baseten on Day 0.
- The muse/ client logs cost per call, enforces per-run caps (max images per episode, max
  tokens per agent call), and honors a global kill-switch env var that halts all paid calls.
- GPU containers use minimum scaledown_window; never leave a dev GPU warm overnight.
- Nov 4 end of day: tear down or cap everything that can still bill.

### Code organization

- Max ~300 lines per file; split by feature, not by type.
- One exported component per file. camelCase functions, PascalCase components/types,
  SCREAMING_SNAKE constants. No magic numbers.
- No console.log in committed code (structured logger only). No commented-out code.
- No emojis in code, comments, or generated content.
- Immutability first: never mutate props/state/inputs; return new objects.

### Model-call discipline

- Every Muse call goes through one typed client module (`src/lib/muse/`): centralizes model
  choice, retries, caching, and cost logging.
- Cache all model responses in dev keyed by (model, prompt hash) — protects the $150 credit.
- Every prompt lives in a versioned file (`prompts/`), not inline strings.
- Structured output always requested via JSON schema; temperature pinned per task.
- Reasoning effort tiers: low for routing/vendor detection, medium for parsing/extraction,
  high for narrative generation and citation grounding.

### Error handling

- Handler-level try/catch on every endpoint; typed error envelope
  `{ ok: false, code, message }` / `{ ok: true, data }` on all APIs.
- Every user-facing failure has a designed state (see DESIGN.md), never a spinner that hangs.
- Pipeline steps are idempotent and resumable; a failed Muse Image call degrades to a styled
  placeholder, never blocks the episode.

### Git

- Conventional commits: `feat|fix|chore|refactor|docs(scope): message`.
  Scopes: `app`, `pipeline`, `narrative`, `glimmer`, `infra`, `design`, `demo`.
- Commit working increments at least daily; tag `v1.0-demo` on the demo-ready commit.
- Pre-commit: tsc --noEmit clean, no console.log, no secrets (run a secret scan before push —
  repo is PUBLIC).

### Testing (hackathon-calibrated)

- Full TDD/80% coverage is suspended for the hackathon. Non-negotiable tests only:
  1. Schema validation of every Muse structured output against fixture responses.
  2. The privacy-mode router assertion (no hosted calls when enabled).
  3. Raw-file parser against 5+ openSNP fixtures (malformed lines, build 37 quirks).
  4. Health-panel rejection fixture test.
- Everything else is verified by the daily end-to-end demo run (see CHECKLIST.md QA section).

### Definition of done (every checklist item)

Built, runs on device (not just simulator), survives the error case, committed, and
checked off in CHECKLIST.md with date.
