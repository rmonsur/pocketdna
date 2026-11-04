# PocketDNA general plan

PocketDNA turns ancestry evidence into a cited, cinematic micro documentary that explains what a result means and why. The hackathon deliverable is a local website with a **90–150 second, 16:9, silent-first film**; 120 seconds is the default. Kinetic text carries the story. Voiceover is an optional later enhancement.

Meta Global AI Developer Hackathon · Oct 26–Nov 4, 2026 · solo Indie Developer Track. The supplied submission deadline is **Nov 4, 2026, 21:00 EST = Nov 5, 2026, 08:00 Asia/Dhaka**. The builder must verify the official event terms and deadline before submission. The current delivery target is **5–6 hours from the next implementation kickoff**, within the remaining less-than-12-hour window. This replaces the earlier fixed internal submission target; leave the remaining time for submission and recovery.

## Status and shared decisions

These documents specify the agreed target, not a claim that it is already built. The existing `app/` and `backend/` contain an earlier Expo/FastAPI prototype. Migrating to the React/Vite + Node/Hono judge path is pending; do not advertise its planned bootstrap command as available until tested. The [root README](../README.md) retains the prototype instructions with that distinction.

| Topic | Agreed decision |
| --- | --- |
| Input support | 23andMe and AncestryDNA only at launch: official raw `.txt`/`.zip` exports up to 50 MB. MyHeritage is deferred. |
| Raw-DNA evidence | Deterministic browser-worker projection into **PocketDNA PCA-25**, followed by separately validated era fits. All targets/references share one versioned basis. This is not Global25. |
| Privacy | Raw genotypes stay in browser memory. Live interpretation sends minimal derived findings to the server/model. Image/atlas roles receive contextual briefs only. |
| Runtime | React/Vite, strict TypeScript, Node/Hono, one localhost origin. Python/PLINK/EIGENSOFT are offline research tools. No mandatory Modal, Baseten, GPU or hosted database. |
| Images | Muse Image generates historical illustrations in live mode: six initial images, up to two repairs total, at most one repair per scene; initial concurrency two. Reviewed packaged assets support replay and failures. |
| Geography | Deterministic Three.js globe with approved geographic data and an SVG fallback. Historical movement is context, never a reconstructed personal itinerary. SAM cutouts are optional. |
| Film | Hook, evidence/method beat, Bronze Age, Medieval and Modern chapters, convergence and source/share stamp. Use local period dates; context-only chapters are allowed when individual evidence is insufficient. |
| Evidence | Clicking a claim pauses playback and opens an accessible explanation/source drawer or mobile sheet. MP4 carries source cues and a companion evidence manifest. |
| Export | Local Playwright Chromium plus native FFmpeg, using the same absolute-time renderer as preview. Hosted export is deferred. |
| Models | Muse Spark for runtime research/direction/review; Muse Image for images; Wonder for development/research assistance. Confirm exact model access/settings before live integration. |
| Quality | TDD and at least 80% coverage for first-party runtime/research logic, plus targeted numerical, privacy, audit and export checks. Never present pending checks as passed. |

## Product and scientific boundaries

People often have a vendor ancestry report without an explanation of its historical context. PocketDNA pairs validated raw-file findings with a readable story, maps, illustrative historical scenes and inspectable sources. Marketing audience/cost estimates require evidence before appearing as factual submission claims.

The LLM never computes ancestry. Raw analysis uses fixed normalization/loadings, missing-aware projection and nonnegative mixture fitting with weights summing to one. Validate against the pinned Python/smartpca oracle before enabling personal raw-DNA results. Do not mix native coordinates with Global25 references. The optional G25 prediction adapter is outside the hackathon critical path.

Fit Bronze Age, Medieval and Modern models independently where references support them. Never add percentages across eras or imply a proven genealogical chain. A poor fit or missing coverage yields a limitation or contextual chapter, not invented precision. A strong hook must be supported; “rarest,” “oldest,” IBD and exact migration dates require evidence beyond a PCA fit.

Live historical research is bounded and attached to specific claims. Reviewed, versioned evidence packs support outages and replay. A URL alone is not verification. Generated people are fictional inhabitants of a documented setting, never portraits of the viewer's ancestors or appearance predictions.

Ancestry only: no health, traits, personality, ethnic essentialism, political framing or battle imagery. Raw DNA stays out of logs. The builder explicitly requested that their own demo DNA file be eligible for Git tracking; other private DNA and personal episode manifests stay out of Git. Public demo inputs require redistribution permission.

## Five-to-six-hour implementation plan

This is the next work allocation, not authorization to start it during the documentation pass. Owners are defined in [AGENTS.md](../AGENTS.md). Time windows are elapsed from kickoff; independent work can overlap when assigned. Extensive research experiments remain a backlog, not a claim that every experiment fits six hours.

| Window | Accountable build owner(s) | Deliverable and gate |
| --- | --- | --- |
| 0:00–0:30 | IntegrationLead, RuntimeEngineer, ScientificEngineer | Inspect prototype reuse, freeze EvidenceRecord/ReferenceBundle/ReelPlan, verify model access and dataset availability; prove one local scene export. |
| 0:30–2:00 | ScientificEngineer, RuntimeEngineer, ExperienceEngineer | Freeze one defensible reference/evidence path; build worker contracts, server adapter, upload flow, film shell and source drawer. Raw results remain gated on scientific validation. |
| 2:00–3:30 | NarrativeEngineer, VisualEngineer, ExperienceEngineer | Connect Spark interpretation/direction, live image generation, reviewed globe scenes and independent auditors; complete one coherent 120-second film. |
| 3:30–4:30 | IntegrationLead, RuntimeEngineer, QAReleaseEngineer | Integrate playback/export, replay, cancellation, bounded repairs and error recovery; verify supported inputs and privacy boundaries. |
| 4:30–6:00 | QAReleaseEngineer, IntegrationLead | Fresh-clone judge setup, required tests/coverage, phone review, demo video, provenance and submission package. Freeze scope and leave submission buffer. |

If the validated reference bundle is unavailable at the scientific gate, ship the labelled replay path; clearly mark personal raw analysis unavailable. Synthetic fixtures demonstrate software behavior only. Do not claim the full raw-DNA target is complete. If image generation fails, use reviewed fallback scenes. Cut voiceover, SAM transitions, extra terrain detail, hosted services and new research experiments before weakening evidence or privacy gates.

## Document ownership and precedence

The user's current instructions govern scope. [RULES.md](RULES.md) owns safety, rights and engineering gates; this page owns product scope and delivery priorities; [STACK.md](STACK.md) owns architecture; specialist documents own their detailed contracts. [AGENTS.md](../AGENTS.md) owns role names and handoffs. Any future decision must update all affected documents in the same change. A newer date alone does not silently override another contract.

Historical measurements and catalog rows are evidence to review, not current production approval. External provider capabilities, pricing, event rules and source-data claims still require their stated verification; this documentation reconciliation does not certify them.

## Related documents

| Document | Purpose |
| --- | --- |
| [RULES.md](RULES.md) | Hackathon constraints, ancestry/privacy boundaries, code quality, budgets and completion gates. |
| [STACK.md](STACK.md) | Target runtime/research architecture, contracts, installation, storage, export and acceptance requirements. |
| [DESIGN.md](DESIGN.md) | Canonical dark visual tokens, responsive layout, controls, evidence interaction and error states. |
| [BIOINFORMATICS.md](BIOINFORMATICS.md) | PCA-25 methodology, historical audit findings, identity/QC checks, projection, fitting and validation gates. |
| [POPLIST.md](POPLIST.md) | Candidate population/sample catalog, exact IDs, warnings and provenance; not an approved production panel. |
| [AGENTS.md](../AGENTS.md) | Repository build responsibilities and complete runtime agent roster, outputs, boundaries and handoffs. |
| [AGENT.md](AGENT.md) | Detailed HistoricalImageAgent state machine, input/output contract, tools and acceptance checks. |
| [DIRECTOR.md](DIRECTOR.md) | DocumentaryDirector script method, timed ReelPlan, readable captions and editorial review. |
| [IMAGE.md](IMAGE.md) | Historical image briefs, reusable prompts, generation/repair budget, provenance and visual audit. |
| [ATLAS.md](ATLAS.md) | Geographic research, globe/terrain rendering, map semantics, optional segmentation and atlas review. |
| [Dataset guide](../dataset/README.md) | Local dataset staging, provenance requirements and promotion of reviewed reference assets. |
| [Repository README](../README.md) | Existing prototype startup and implementation-status caveat; future judge entry point after validation. |
