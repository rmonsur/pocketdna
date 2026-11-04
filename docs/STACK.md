# PocketDNA STACK.md

Architecture decision and build specification 

## 1. Product and architectural decision

PocketDNA turns ancestry evidence into a cinematic, interactive, 9:16 episode. The hackathon release targets **90–150 seconds**, with a silent, readable core, three historical chapters, a convergence map, and an evidence layer that explains the “why.” 

**Python belongs in the repository and the reproducible research workflow. It is not a prerequisite for judges to run the application.** Prepare and validate the ancestry model offline with Python and EIGENSOFT; ship a versioned reference bundle; execute user-file analysis in a TypeScript Web Worker. A small local Node server handles Muse calls and export orchestration.

The deliverable is a working local product plus inspectable scientific work. A hosted deployment, Modal account, Baseten account, GPU, Python installation, and full reference-panel download are unnecessary for the judge path.

This document specifies intended implementation, not completed functionality or measured performance. Exact package versions must be pinned after the first compatibility spike.

## 2. Shared decisions and document ownership

[ABOUT.md](ABOUT.md) owns the reconciled product scope and 5–6 hour delivery plan. [RULES.md](RULES.md) owns constraints and engineering gates; this document owns architecture. [AGENTS.md](../AGENTS.md) owns role names and handoffs. [BIOINFORMATICS.md](BIOINFORMATICS.md), [DESIGN.md](DESIGN.md), [DIRECTOR.md](DIRECTOR.md), [IMAGE.md](IMAGE.md), [AGENT.md](AGENT.md) and [ATLAS.md](ATLAS.md) define their specialist contracts.

The target uses silent-first 90–150 second films, default 120; 23andMe/AncestryDNA inputs; provider-only screenshot findings; native PocketDNA PCA-25 raw findings; browser-local genotypes; live images for both tiers; reviewed replay/fallback assets; and local export. No personal migration chain, IBD or unsupported confidence is inferred. Image limits are six initial scenes plus at most two repairs total, one per scene, initial concurrency two.

The existing Expo/FastAPI code is an earlier prototype. Paths and technologies below describe the target migration, not already available commands. The 5–6 hour plan prioritizes one defensible end-to-end path; extensive research experiments and optional enhancements are not all mandatory within that window. A raw-data feature without its validated bundle remains unavailable, as ABOUT specifies.

Treat supplied hackathon restrictions as project requirements pending official verification. Record rights and attribution for every dataset, derived bundle and reused asset. Deadline/timezone and credit expiry verification belong to release preparation under RULES.

## 3. Runtime stack

| Area | Selected technology | Responsibility and reason |
| --- | --- | --- |
| Runtime/package manager | Pinned supported Node LTS + npm lockfile | Familiar install; one package manager for judges |
| App | React, TypeScript strict, Vite | Single-page application; no SSR or Next.js requirement |
| API | Hono with Node adapter and tested Vite integration | One localhost origin and application server |
| Validation | Zod | API, worker messages, model responses, manifests, scene contracts |
| UI styling | Tailwind CSS + CSS custom properties | Shared visual tokens; cinematic composition |
| Accessible controls | shadcn/ui/Radix primitives | Dialog, sheet, tabs, slider, tooltip, progress and error states |
| Icons/font | Bundled Solar outline icons; local Inter files | Matches DESIGN; no runtime icon/font CDN |
| State | Zustand | Playback, input mode, project status and evidence selection |
| Numerical work | Dedicated module Web Worker; typed arrays | Keeps parsing and fitting off the UI thread |
| ZIP input | fflate streaming unzip | Bounded extraction in the worker, cancellation and size checks |
| Film engine | Small custom TypeScript timestamp-driven scene engine | HTML Reel clock pattern; one rendering contract for preview/export |
| Geography | Three.js, bundled textures/meshes; SVG for flat atlas fallback | Controlled globe and regional terrain without tile-server dependency |
| Model access | Typed server-only Muse adapter over documented API | Central budgets, schemas, retries, caching and provenance |
| Progress | Server-sent events plus typed job state | Visible progress, cancellation, reconnect and resume |
| Persistence | Local JSON manifests and content-addressed creative assets | No database service needed for one local user |
| Export | Playwright Chromium + native FFmpeg | Exact frame stepping and MP4 output |
| Tests | Vitest, Testing Library, Playwright | Unit, integration, accessibility and end-to-end coverage |
| Code quality | TypeScript checks, ESLint, formatter, secret scanner | Enforce RULES and clean public-repo delivery |

No runtime Pyodide, NumPy, smartpca, Redis, Celery, hosted database, generic agent platform, or generative-video service is required. These exclusions are scope decisions, not claims that those tools lack value.

A single server can launch Chromium/FFmpeg subprocesses. “One command and one port” is the requirement; one operating-system process is not.

## 4. Offline scientific stack and reproducibility

| Tool | Use |
| --- | --- |
| Python with uv-managed locked environment | Research scripts and reproducibility |
| NumPy and SciPy | Array processing, projection reference implementation and constrained fitting |
| Pydantic | Typed configuration and artifact metadata |
| PLINK and EIGENSOFT/smartpca, pinned versions | Genotype preparation and PCA/projection oracle |
| pandas where useful | Annotation tables; not needed in the browser |
| pytest and coverage, Ruff/type checks | Research verification and maintenance |
| Optional pinned Linux container | Reproduce native tools on unsupported host platforms |

Muse Wonder assists the builder with this workflow: scripts, diagnostics, documentation and review. It does not replace deterministic analysis, decide final numerical results, or become a judge runtime dependency.

### Scientific operations, in order

1. Record exact AADR, SGDP and EGDP releases, access terms, checksums and original study citations. Keep large source genotype files outside Git. Include retrieval instructions, not unlicensed mirrors.
2. Harmonize genome builds, alleles and sample identifiers. Deduplicate individuals across datasets. Document ancient pseudo-haploid calls and their treatment.
3. Establish a balanced reference set, filtering, LD pruning, missingness rules and SNP list. Decide which modern/ancient samples define axes and which are projected; do not let incidental sample counts determine the space.
4. Reserve held-out individuals before PCA fitting. Evaluate supported chip masks and no-call patterns across represented ancestry groups.
5. Fit the chosen PCA and export SNP-level loadings, centering, scaling and coordinate conventions. Sample `.evec` coordinates alone are not a projection model.
6. Build the projection procedure matching the selected smartpca settings. Missing-data least-squares projection and out-of-sample shrinkage are separate concerns. Use stable linear solves, not an unexplained scalar correction based only on overlap percentage.
7. Measure supported consumer-chip masks against the fixed basis; do not assume 200,000 overlapping markers. Start with missing-aware projection into the retained basis. A shared-chip basis or precomputed mask operator is a controlled alternative requiring validation, as BIOINFORMATICS specifies. Handle individual no-calls explicitly.
8. Build era-specific source models. Use nonnegative weights with a sum-to-one constraint, a documented distance metric and fixed PC weighting. Plain NNLS followed by normalization is not generally the same constrained optimum.
9. Compare held-out projected coordinates, population distances and component weights against the Python/smartpca oracle. Test sensitivity to masking and reference choices. Keep validation and calibration samples separate where feasible.
10. Export the compact bundle and reports. Verify a TypeScript implementation against numerical fixtures before enabling live genotype analysis.

Do not fit hundreds of highly correlated sources into 25 coordinates and present the output as uniquely identified history. Maintain a broad nearest-reference library, but use smaller curated component models. Report poor fits and insufficient coverage honestly. Missing regional or temporal coverage produces contextual chapters, not fabricated percentages.

### Reference bundle contract

The bundle contains a schema version, basis ID, source-release manifest, checksums, supported chip/build definitions, SNP index with allele orientation, normalization parameters, loading/projection arrays, PC conventions, era source coordinates, population metadata, QC thresholds and validation-summary links.

Use Float32 for loading storage initially and double-precision accumulation for computation. For scale only, 200,000 × 25 Float32 values occupy 20 MB before metadata. Quantize only after measuring downstream error. Store large arrays as binary, not JSON objects. All source/target coordinates must carry a matching basis ID.

Commit distributable compact artifacts to the repo where practical; otherwise provide a release bundle with checksums and an automatic download. The latter requires first-run networking and must be stated. Do not make judges rebuild the reference model.

### Show the work

Include methodology, exact commands and configurations, data lineage, validation plots/tables, measured errors, limitations, and a rebuild guide. Provide small redistribution-safe numerical fixtures. Show an actual preprocessing run and the resulting artifact hash in the submission video. Never imply that a cached result was recalculated live.

## 5. Input and ancestry pipeline

### Raw DNA

Accept official 23andMe/AncestryDNA `.txt` or `.zip` exports only, up to 50 MB. Do not add generic TSV support solely because the mockup mentions it. Check content and supported headers, not filenames alone.

Worker order: validate archive/file → bounded stream decompression → parse → identify format/build/chip where possible → harmonize → collect matched calls → QC → project → distances → separate era fits → evidence record.

Enforce archive entry count, actual decompressed-byte ceiling, expansion limits and cancellation during extraction. Reject nested/encrypted/ambiguous archives. Permit only the expected data file and harmless known metadata. Never unpack arbitrary paths. Avoid building an object per SNP; retain typed arrays and counts. Do not silently infer unknown builds or impute unsupported alleles.

QC includes matched SNP count, call rate, allele mismatch count, usable PC dimensions, fit residual and model sensitivity. Thresholds are determined offline and versioned. Reject unsupported or low-quality inputs with an explanation rather than a convincing-looking result.

Raw genotypes remain in browser memory and are released on reset. Neither raw calls nor projected personal coordinates need to reach Muse; send only the minimal derived findings required for the story. Derived ancestry summaries are still personal information. No genotype logging or analytics.

### Screenshot

Accept PNG/JPEG up to 10 MB with decoded-image checks. Scope launch support to 23andMe and AncestryDNA, consistent with the main product statement. MyHeritage is an extension after dedicated fixtures exist.

Muse Spark routes/rejects health panels, extracts provider labels, percentages, ranges and hierarchy, and returns a schema-validated draft. The user corrects it before generation. Preserve “unassigned,” rounding and parent-child categories without double-counting. Explain that screenshot content is sent to the model service and provide cropping/redaction before submission.

Screenshot evidence never claims SNP analysis, measured PCA coordinates, individual genetic distances or deep-time percentages. If an experimental population-proxy simulation is later added, label it throughout the interface and export as a model of provider categories, not an analysis of the person's genotype.

### Shared evidence contract

Both branches yield a discriminated evidence record: input type, provider or basis ID, supported findings, QC, limitations, historical context and provenance. Only the raw-data branch can contain measured projection/fit results. This distinction must survive every agent and render boundary.

## 6. Agent graph and model responsibilities

Implement a small explicit directed workflow in TypeScript. Preserve ABOUT's orchestrator/worker/auditor classes without deploying separate services for each role.

The complete canonical roster, responsibilities and graph are in [AGENTS.md](../AGENTS.md). PipelineOrchestrator owns routing and budgets; GatekeeperAgent/ScreenshotExtractor handle screenshots; deterministic browser code handles raw data; InterpretationAgent and the research roles prepare approved evidence; DocumentaryDirector writes the ReelPlan. HistoricalImageAgent and AtlasAgent supply reviewed assets through their respective auditors. AssetSelector resolves the manifest; NarrativeAuditor and ComplianceAuditorAgent gate final assembly by ReelAssembler. No role approves its own unsupported output.

Use Muse Spark for runtime multimodal reasoning and structured planning, Muse Image for illustration production, and Wonder for development/research assistance. Configure concrete model IDs centrally and smoke-test account access. Do not assume a model supports every sampling parameter; send only supported settings.

The numerical engine is a deterministic tool, never an LLM calculation. Live search must attach evidence to specific claims; a real URL alone does not establish support. Prefer original papers/dataset documentation. Cache permitted source metadata, brief supporting passages and reviewer results. Bundle a reviewed evidence pack for demo replay and search outages.

The director may select approved templates and camera presets, not execute generated code. Coordinates/routes come from verified geographic metadata. Historical movement is context, not a traced personal genealogy. Region-specific era dates must come from sources rather than a single global chronology.

## 7. Film engine, timing and geography

Use a custom TypeScript scene engine inspired by HTML Reel. Audit and attribute any copied code under its actual pinned license. Reuse the authoring workflow and deterministic clock idea; the judge app must not require Fil, DreamCut, a coding-agent session or a skill installation.

A scene exposes deterministic rendering at time `t`. Image placement, text, map routes, camera movement and transitions derive from that value. Seed randomness offline; no wall-clock animation or uncontrolled physics in the film. UI hover transitions can remain normal CSS.

The ReelPlan carries duration, chapter boundaries, scene template IDs, text beats, claim IDs, asset IDs, geography IDs, camera presets and provenance. Validate duration, required chapters, readable text lengths and source references before rendering.

| Segment | Suggested allocation within a 120-second default |
| --- | --- |
| Hook | 6 seconds |
| Method/evidence credibility | 8 seconds |
| Bronze Age context/model | 26 seconds |
| Medieval context/model | 26 seconds |
| Modern reported/model affinity | 26 seconds |
| Convergence | 20 seconds |
| Share stamp and source cue | 8 seconds |

This is a starting composition, not fixed narration timing. Respect the 90–150 second bound and test silent reading on a phone. One central claim per beat; the long explanation lives in the evidence layer.

Scene primitives: full-bleed period illustration with slow push; kinetic title; component composition; globe route; regional terrain; convergence of population icons; closing stamp. Images are illustrative reconstructions, not literal portraits of a user's ancestors. Exclude battles, phenotype stories and essentialist personal claims under RULES.

Bundle Earth textures, modest elevation relief and a few regional meshes. Globe-wide relief is not high-resolution terrain everywhere. Provide a flat SVG atlas fallback for weak/no WebGL. Prefetch assets before playback/export. All routes and terrain must be derived from licensed geographic data, not invented model coordinates.

## 8. Tappable evidence and visual system

Retain the supplied mockup's landing-page composition: generous headline, upload card, bright generation action and large portrait film preview. On mobile, stack input and player. Avoid replacing this with a generic analytics dashboard or full video-editing studio.

Use black/warm-charcoal backgrounds, dark translucent surfaces, white principal text, #A3A3A3 secondary text, #EEB057 emphasis and #C8F45B primary action/status accents. Use Inter throughout. Main panels can use larger rounded corners consistent with the screenshot; small controls share a limited radius scale. These tokens match DESIGN.md.

Start body text around 16 px for readability, responsive display text around 48–88 px on desktop, and 12–14 px utility labels. Preserve the 4 px spacing rhythm, restrained glass blur and moderate motion. Use Solar outlines. Bundle fonts and icon assets locally.

Components, in dependency order:

1. App shell, design tokens, responsive hero and portrait viewport.
2. Input tabs, drag/drop area, validation messages and sample selection.
3. Extraction correction table and raw-analysis quality summary.
4. Generation stage list with cancel/retry and partial results.
5. Chapter tabs, progress segments, play/pause, scrub and fullscreen.
6. Clickable claim overlays and evidence drawer/sheet.
7. Export progress, download, source manifest and replay controls.

Clicking a claim pauses playback and opens an accessible evidence drawer. Include: what the result says; why this model/provider reports it; how the historical context relates; source links; what cannot be inferred. Statistical similarity and historical causation must be distinguished. A tooltip alone is inadequate for the core “why” experience. Provide keyboard access, focus restoration and a mobile sheet.

Remove the mockup's unearned “99.8% confidence,” “Identity-by-Descent Phase,” and precise convergence dates. Show actual matched markers, model/version, residual and documented sensitivity where available. Fix the misleading sample filename suggesting an unsupported vendor chip version. Credibility counts refer to samples actually used, not the entire size of a source database.

MP4 exports cannot retain clickable overlays. Export a readable source cue/end card and offer a companion evidence document/manifest. The local interactive player remains the full evidence experience; a localhost link is not a public sharing destination.

## 9. Playback and export

Browser preview is immediate once a valid plan and assets exist. Reuse the same scene engine for export in a dedicated render route. Default draft output: 720 × 1280 at 30 fps; final: 1080 × 1920 at 30 fps. Step exact timestamps in Chromium and pipe frames to native FFmpeg with bounded buffering. Encode H.264 MP4 with a broadly compatible pixel format; add AAC only if an optional audio track exists.

Do not retain an entire film's decoded frames. Do not use live screen recording as the correctness path. Wait for fonts, textures and images; disable interaction during frame capture; check first/last frames, chapter boundaries, duration and text safe areas in the actual output.

Provide cancel, timeout, cleanup and retry. Render one job at a time initially. If WebGL fails, rerender with the atlas fallback. Browser WebCodecs export is a later optimization requiring its own renderer/codec validation; HTML Reel pages do not automatically export through Remotion.

Local export is the primary judge path. Hosted export is deferred; any later Modal option may take only the scene plan and creative assets, never raw DNA. Baseten is not required. Neither provider may be necessary to finish an episode locally.

## 10. Installation, modes, storage and operational controls

### Judge contract

After cloning, one documented Node bootstrap command should verify the Node version, install locked dependencies, prepare platform-specific Chromium/FFmpeg assets, verify bundled checksums, start the app and open localhost. Implement this as a small cross-platform Node launcher. Avoid shell-specific install chains. Exact command names are implementation deliverables, not currently available commands.

First install requires network access for dependencies unless a complete offline release is distributed. After installation, bundled demo playback, browser analysis and local export work offline. Live Muse generation requires a key/network. Do not promise universal installation success; test supported OS/architecture combinations and publish that matrix. Docker is a fallback, not the primary prerequisite.

| Mode | Behavior |
| --- | --- |
| Demo replay | Bundled plan, images, citations and MP4; clearly labeled saved generation; no keys |
| Analysis demo | Safe fixture processed through real browser math; deterministic curated film path |
| Live | User input, actual Muse research/direction and supported image requests |
| Research | Separate Python/native tooling to rebuild/validate artifacts; optional for judges |

Never substitute the builder's results for a new uploaded person's results. On API failure preserve analysis and show a retry or explicitly selected saved example.

Store original raw input only in ephemeral browser memory. Persist plans and creative assets locally with a delete-project action; do not persist screenshots or personal summaries by default without clear user choice. Server caches containing derived ancestry are private local files excluded from Git. Log opaque job IDs, stages, timings and counts; avoid raw input hashes as analytics identifiers.

Bind the server to localhost. Keep API keys server-only, outside Vite public environment variables. Restrict browser origins and local render/file routes; never expose arbitrary filesystem reads. Use typed success/error envelopes, timeouts and idempotent stage IDs.

Cache keys include model/version, complete inputs/settings, prompt version, evidence version and asset/basis IDs where relevant. Cache reuse must not cross users accidentally. Validate structured responses; retry schema failures once, then surface a typed error. All paid calls go through one adapter with spend reservations, bounded concurrency, caps and a global kill switch.

Initial configurable policy for both input tiers: six initial image calls, at most two repair images per episode and one repair per scene, initial image concurrency two; bounded research queries and model outputs; one repair pass per failed structured stage. IMAGE.md and AGENT.md define image auditing and retry behavior. Set per-run/global dollar limits using account pricing; reserve budget before parallel calls. Treat credit expiry in RULES as an account fact to verify, not an assumption about free post-event calls.

## 11. Repository organization

| Path | Contents |
| --- | --- |
| `src/app/` | React routes, landing/upload/player UI |
| `src/features/ancestry/` | Parser, harmonization, QC, worker, projection and fitting |
| `src/features/reel/` | Scene engine, templates, timeline and evidence interaction |
| `src/server/` | Hono endpoints, orchestration, SSE, local export jobs |
| `src/lib/muse/` | Server-only model adapter, validation, budgets and caching |
| `src/contracts/` | Shared schemas and versioned data contracts |
| `prompts/` | Versioned task prompts |
| `public/reference/` | Distributable compact projection bundle |
| `public/assets/` | Licensed/generated image library, maps, textures, fonts |
| `research/` | Python project, lockfile, configurations, rebuild and validation scripts |
| `dataset/` | Ignored local reference-data staging; see its README for provenance and promotion policy |
| `research/reports/` | Methodology, numerical comparison, plots and reproducibility record |
| `tests/fixtures/` | Safe vendor-format and model/worker fixtures |
| `demo/` | Ready MP4, saved plan, cited evidence and approved demo inputs |
| `docs/` | Architecture, attribution, data provenance, limitations and walkthrough |
| `.local/` | Ignored caches and project files; never committed |

Large original datasets stay outside Git, in ignored `dataset/` staging or external storage. Public demo data requires explicit permission for public redistribution, not merely permission to show it privately. Use synthetic parser fixtures for public tests; the builder's genuine DNA demo can remain a local supplied file. Label synthetic scientific fixtures clearly.

## 12. Build order and completion gates

These are dependency and acceptance gates, not separate time allocations. Use ABOUT's 5–6 hour schedule to overlap independent work. Scientific gates apply to the raw-analysis branch; a missing bundle does not block the eligible screenshot/context or labelled replay paths. Do not mark scientific phases complete when taking that fallback.

### Phase 0 — freeze contracts and prove the riskiest assumptions

Use the reconciled RULES/ABOUT/DESIGN contracts; pin runtime dependencies; define EvidenceRecord, ReferenceBundle and ReelPlan; confirm Muse model access and costs. Prove one deterministic HTML/Three.js scene exports locally. Confirm a reference-data path and one supported raw-file format. Establish TDD/coverage infrastructure immediately.

Exit: tiny end-to-end render works, scientific inputs are available, and no architecture dependency is hidden behind an unavailable service.

### Phase 1 — research pipeline and public evidence of the work

Prepare data, fit PCA, validate masks/projection and produce a small versioned bundle. Export oracle fixtures and a readable report. This phase uses Python in the repo. Record limitations before narrative generation begins.

Exit: independently checked projected coordinates and fit results with reproducible configuration, checksums and attribution.

### Phase 2 — browser numerical implementation

Port deterministic operations to TypeScript; run fixtures against the reference oracle; implement file/ZIP limits, QC, cancellation and typed errors. Benchmark complete cold and warm analysis.

Exit: supported raw files analyze without Python/server upload, and parity tolerances pass. Unsupported inputs fail clearly.

### Phase 3 — complete silent film from a fixed evidence record

Build the six scene types, chapter structure, typography, geography and evidence drawer using real reviewed content. Complete local export before adding open-ended agent generation.

Exit: a polished 90–150 second film plays, explains “why,” and exports correctly on the judge baseline machine.

### Phase 4 — live agents and screenshot branch

Add extraction/correction, bounded research, interpretation, director planning, live historical image generation for both tiers, reviewed asset selection and auditors. Show real stage progress and cache provenance. Test a failed image call, invalid JSON, unsupported health panel and missing citation.

Exit: a new input produces a genuinely new reviewed film; failed services leave a usable project.

### Phase 5 — package, test and submit

Run fresh-clone installation on supported systems, with and without a key. Include ready `/demo` files, README diagrams, methodology evidence and a short recorded walkthrough. Verify repo public access, licenses, secrets, all required tests and the v1.0-demo tag. Confirm official submission timezone and credit expiry.

Scope cuts if time runs short: optional voiceover, G25 prediction, experimental screenshot proxy modeling, SAM transitions, extra terrain detail, hosted export and hosted deployment. Live imagery remains the keyed target; reviewed assets handle failures. Keep numerical correctness, film quality, evidence access, local installation and truthful demo labeling. If scientific gates cannot pass within the delivery window, disable personal raw analysis and explicitly report that limitation under ABOUT.

## 13. Testing and acceptance

Honor RULES: TDD and at least 80% coverage. Apply explicit thresholds to first-party TS source and Python research logic; exclude generated/vendored assets, not inconvenient application code. Critical numerical and privacy behavior requires targeted tests regardless of aggregate coverage.

Required tests: malformed vendor files; no-calls, strand/build errors and duplicate SNPs; ZIP bounds; low overlap; projection parity; constrained-fit invariants; unstable/poor-fit handling; basis mismatch; screenshot hierarchy; health rejection; schema repair; evidence references; auditor blocking; cancellation/resume; budget concurrency; no raw genotype network requests; deterministic scene seeks; export duration/dimensions and boundary frames.

Integration-milestone and pre-submission end-to-end run: safe raw fixture → verified findings → director plan → audit → interactive playback → evidence drawer → local MP4. Repeat screenshot path and saved-demo mode. Review on a real phone/browser as well as desktop. Check keyboard access and reduced-motion UI.

Publish measured hardware/browser versions, cold/warm timings, peak memory, render times and failure cases. The earlier 1–2 second parsing and sub-100 ms projection numbers are hypotheses, not acceptance promises. Prioritize responsive UI and visible progress over unsupported benchmark claims.

## 14. Documentation handoff and supporting references

README must explain: the one-command judge path; demo versus live behavior; key setup; supported platforms; no-Python runtime; Python rebuild route; local genotype privacy and cloud summary processing; limitations; evidence interaction; export; attribution; and what was newly built during the event.

Keep [ABOUT.md](ABOUT.md), [RULES.md](RULES.md), [DESIGN.md](DESIGN.md) and [AGENTS.md](../AGENTS.md) synchronized with architecture changes. Record completion against ABOUT's phase gates and the owning role's handoff; document pending work explicitly.

Primary technical references consulted for this architecture:

- [EIGENSOFT PCA, SNP loadings, lsqproject and shrinkmode](https://github.com/DReichLab/EIG/blob/master/POPGEN/README)
- [Projection shrinkage and population-genetic PCA practices](https://pmc.ncbi.nlm.nih.gov/articles/PMC7750941/)
- [Missing-data projection uncertainty](https://doi.org/10.1186/s12864-025-11728-1)
- [AADR dataset/version citation](https://doi.org/10.7910/DVN/FFIDCW)
- [Vahaduo JavaScript reference](https://github.com/vahaduo/vahaduo)
- [23andMe reference genome and strand documentation](https://customercare.23andme.com/hc/en-us/articles/212883767-Which-Reference-Genome-and-Strand-Does-23andMe-Use)
- [HTML Reel clock and local rendering workflow](https://fil.design/skills/html-reel)
- [Meta model capabilities](https://dev.meta.ai/docs/models) and [pricing](https://dev.meta.ai/docs/pricing-rate-limits)
- [Hono on Node](https://hono.dev/docs/getting-started/nodejs)
- [fflate streaming archive handling](https://github.com/101arrowz/fflate)
- [Vitest coverage configuration](https://vitest.dev/config/coverage)

Account access, package compatibility, asset rights and event rules still require project-specific verification. Record those checks alongside the pinned versions before submission.
