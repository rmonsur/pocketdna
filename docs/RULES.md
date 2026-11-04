# Rules for building PocketDNA

Read with [ABOUT.md](ABOUT.md) for product scope, [STACK.md](STACK.md) for architecture and [AGENTS.md](../AGENTS.md) for accountable owners. These are project requirements. Statements about event eligibility, deadline and account credits must be checked against official terms/account settings by the builder before submission; this document is not independent verification of them.

## Hackathon and rights

1. Keep the repository public and verify logged-out access before submission.
2. Identify original work built during Oct 26–Nov 4, 2026. Do not reuse pre-event project code, prompts or creative assets as new hackathon work. Prior DNAless work and earlier scientific experiments are background only unless official rules explicitly permit their use and it is disclosed. Third-party dependencies and reference datasets require rights and attribution; distinguish them from original contributions.
3. Record the release, source, terms and permitted redistribution of every reference dataset, derived bundle, image, font, icon and reused library. Public access is not redistribution permission. Verify any HTML Reel code's pinned license before reuse and attribution. AADR references use DOI 10.7910/DVN/FFIDCW with the actual selected release recorded.
4. Use the builder's own DNA privately for the hero demo. Public screenshots or other shared inputs require explicit permission for public redistribution, plus redaction. Keep personal genotype files out of the public repository; synthetic parser fixtures must be labelled.
5. Solo Indie track: one submission; the builder is the Representative.
6. Deliver one documented Node bootstrap command, ready demo assets/video in `/demo`, and a clear README explaining operation, architecture, provenance and limitations. Until the target launcher passes fresh-clone tests, label existing prototype commands as such.
7. Supplied external deadline: Nov 4, 2026, 21:00 EST = Nov 5, 2026, 08:00 Asia/Dhaka. The current internal target is the 5–6 hour plan in [ABOUT.md](ABOUT.md); verify the official deadline and preserve submission buffer.

## Content firewall

ComplianceAuditorAgent gates every final plan before rendering. See [AGENTS.md](../AGENTS.md) for its inputs, outputs and independent review responsibility.

- Ancestry only. GatekeeperAgent rejects health panels. No health, trait, carrier, wellness or phenotype/selection stories, including lactase persistence or disease resistance.
- No personality/identity inference from DNA, ethnic essentialism, or appearance prediction from ancestry percentages.
- No political framing, battle imagery or conquest glorification. Documented movements may be discussed as qualified historical context; modern nations are not presented as heirs to ancient populations.
- Market the ancestry evidence and documentary experience. Screenshot parsing is a convenience input, not the entire product.
- Claims must preserve screenshot versus raw-data limits. Sources must support the exact claim; generated imagery and maps cannot imply a stronger claim than the approved evidence.

## Language and organization

Use strict TypeScript with explicit return types; no `any`, prefer `unknown` plus narrowing. Use interfaces for object shapes, types for unions, `const` by default and immutable inputs/state. Favor small readable functions (normally 50–100 lines) and files around 300 lines. Group by feature. One exported component per file; camelCase functions, PascalCase components/types and named constants.

Python research code uses type hints and Pydantic for I/O metadata. Python/native tooling is not part of normal judge startup. No committed `console.log`, commented-out code, secrets or emojis in code/comments/generated content. Use structured logging.

## Boundary validation

Use Zod for API requests/responses, worker messages, model structured output and reference/scene manifests. Retry invalid model structure once with the validation error, then return a typed failure. Binary image data is validated through its envelope and decoded dimensions separately.

Support PNG/JPEG screenshots up to 10 MB and official 23andMe/AncestryDNA `.txt`/`.zip` files up to 50 MB. Sniff content and headers. Raw ZIP extraction happens in the browser worker with entry, actual decompressed-byte and expansion limits; reject nested/encrypted/ambiguous archives and arbitrary paths. Decoded-image limits apply independently of compressed file size. No unsupported vendor/build is silently accepted.

## Privacy and storage

Raw genotypes remain only in ephemeral browser memory and are released on reset. Never send them to the local server, Muse, Modal or Baseten. Do not log raw calls, personal coordinates, filenames or genotype-derived hashes. Log opaque job IDs, counts, stage status and timings.

For live interpretation, send only the minimal derived ancestry findings. Explain that these remain personal information. Disclose screenshot transmission for extraction and offer cropping/redaction first. Image/atlas roles receive minimal contextual briefs, not raw screenshots, genotypes or personal percentages.

Keep model credentials server-only in ignored local configuration, never in public Vite variables. Bind the Node server to localhost; restrict origins and file/render routes. Store private caches/projects under ignored `.local/`, with explicit opt-in persistence for personal summaries/screenshots and a delete-project action. Optional explicitly requested exports may be saved locally. Do not require a cloud volume or database.

Keep research inputs in the ignored [dataset workspace](../dataset/README.md) or external storage. Only deliberately reviewed, redistribution-safe bundles/fixtures belong in public reference and demo paths.

## Models, budget and reliability

Every paid call goes through `src/lib/muse/`, the target server-only adapter. Keep versioned prompts in `prompts/`; request schema-constrained output when supported. Configure model IDs centrally and smoke-test actual interfaces. Pin supported sampling settings per task; do not assume parameter support.

Use adequate reasoning for research, interpretation and review, and lighter settings for simple routing when supported. Ample credits do not remove session limits: verify actual pricing/expiry, configure per-run/global caps and alerts, reserve spend before concurrent requests, track known/uncertain billing and honor a global paid-call kill switch. Cap or tear down billable resources after submission; never assume post-event usage is free.

Cache by complete input, model/settings, prompt/evidence/basis versions and asset IDs. Keep personal caches private and distinguish cache hits from live generation. Initial image budget for either tier: six initial images, at most two repairs per episode and one repair per scene, concurrency two. See [IMAGE.md](IMAGE.md) and [AGENT.md](AGENT.md) for review and timeout behavior.

Use typed API envelopes `{ ok: false, code, message }` / `{ ok: true, data }`, handler-level error handling, deadlines and cancellation. Stages are resumable and idempotent locally; external exactly-once billing is not assumed. One bounded repair pass per failed structured stage; image repair shares the episode cap. An uncertain provider timeout must not trigger blind duplicate paid calls. Failures use reviewed imagery, deterministic scenes or explicit typed errors. Never substitute someone else's results for an upload.

## Testing and completion

Use TDD and at least 80% coverage for first-party runtime and research logic, excluding generated/vendored assets. Documentation-only maintenance uses link, consistency and diff checks; it does not require application test runs. Critical behavior needs meaningful tests regardless of aggregate coverage:

- Parser, build/allele/no-call handling, ZIP limits, duplicate sample/variant identity, low overlap and basis mismatch.
- Python/smartpca/browser numerical parity, fit constraints, unstable/poor fits and scientific release gates in [BIOINFORMATICS.md](BIOINFORMATICS.md).
- Screenshot hierarchy/correction and health rejection; schemas, citations, auditor blocking and reviewed fallback.
- Budget concurrency, timeout/cancel/resume and no raw-genotype network transmission.
- Deterministic seeking, local MP4 duration/dimensions/boundary frames, phone readability and evidence access.

Run integrated raw-fixture, screenshot and no-key replay checks at integration milestones and before submission. A synthetic fixture is not validation of personal ancestry. Inspect desktop and a real phone browser; native mobile binaries are not required. Publish measured timings and supported platforms, not untested speed claims.

A build task is complete only when its acceptance gate passes, errors are handled, required tests pass, and the handoff records changed paths, checks/results and remaining limitations. Track phase status in the implementation handoff against [ABOUT.md](ABOUT.md)'s plan; no separate missing checklist file is assumed. Research-gated features stay disabled or explicitly incomplete when their evidence is unavailable.

## Git and release

Use conventional commits (`feat|fix|chore|refactor|docs(scope): message`) and working increments when committing is authorized. Run type checks and a secret scan before public pushes; record licenses and public demo rights. Tag the validated demo commit `v1.0-demo` during authorized release work. Do not mark unimplemented plans as complete or publish private datasets.
