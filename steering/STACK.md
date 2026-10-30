# PocketDNA — Stack

## Architecture at a glance

```
SECONDARY (IF TIMELINE ALLOWS) iPhone (Expo React Native app, TestFlight)        PRIMARY: Web (Expo web build/REACT, custom domain)
        |                                         |
        +----------------- HTTPS -----------------+
                           |
                 Modal (Python, FastAPI endpoints)
                 "the orchestrator service"
                   |          |           |
       Meta Model API      Modal CPU    Modal GPU (Glimmer)  <-> Baseten fallback
       (Muse Spark,        jobs:        open-weights          (muse-spark-open-1026)
        Muse Image,        smartpca     inference for
        SAM 3.1,           projections    privacy mode
        )                  pipeline
                           |
                 Modal for hosting
```

Decision: Modal IS the cloud. No AWS/GCP. Modal serves the web endpoints, the bioinformatics
CPU jobs, and the Glimmer GPU endpoint. One deploy target, one secrets store, credits cover it.

## Frontend

| Choice | What | Why |
|--------|------|-----|
| Expo (React Native) + TypeScript strict | iOS app, TestFlight distribution | Meta's own framework — full-Meta-stack story; EAS handles builds/signing fast |
| Expo Router | Navigation + web build from same codebase | Web companion nearly free |
| NativeWind (Tailwind for RN) | Styling | Fast iteration, consistent tokens across iOS/web |
| Zustand | Client state | Tiny, no boilerplate |
| TanStack Query | Server state, polling job status | Built-in retry/caching for pipeline polling |
| Zod | All boundary validation | Shared schemas with API contracts |
| react-native-reanimated | Reel UI transitions, atlas slider | The polish that sells the demo |
| Victory Native or custom SVG | Composition charts, timeline atlas | Load dataviz skill guidance at build time |

TestFlight: first EAS build submitted Day 5 (Nov 2) to absorb review latency. Web build deployed
to custom domain (buy Day 0; set favicon + OG tags — cheap judge points).

Surface roles (updated Oct 30): web = primary judge-facing surface (one-click sample reel,
drag/paste-anywhere intake); iOS = demo-video hero (TestFlight if timeline allows).
NO browser extension (decision Oct 30: killed, do not build). No Graph API / FB platform code
anywhere in the repo. Sharing is the user posting their own reel to their own
Facebook/Instagram/Threads account via the OS share sheet (NGL/BeReal-style loop).

## Backend (Modal, Python 3.12)

| Component | What |
|-----------|------|
| `api/` FastAPI on Modal web endpoints | Upload intake, job orchestration, episode assembly, share-card render |
| `pipeline/` Modal CPU functions | Container image with plink2 + EIGENSOFT (oracle) + our NumPy engine; AADR 1240k reference baked into a Modal volume; input: 23andMe TSV/ AncestryDNA text files; output: era composition JSON + PC coordinates + QC stats. Idempotent, cached by file hash |
| `reel/` Modal function | MP4 export: headless Chromium (Playwright) steps the t-driven reel frame-by-frame -> ffmpeg -> 1080x1920 MP4 stored on a Modal Volume, served via a signed endpoint |
| `glimmer/` Modal GPU function | Muse Glimmer served via vLLM-compatible server on A10G/A100; OpenAI-compatible endpoint; handles ALL genotype-derived interpretation for the raw-file tier. `OPEN_WEIGHT_PROVIDER=modal|baseten` toggle for the Muse Spark Open backup |
| `db/` SQLite on Modal Volume | Single SQLite file on a persistent modal.Volume (decision Oct 30: no auth, no concurrent writers, 5-day build, so SQLite beats running a Postgres container; zero ops). Auth is extra credit, post-hackathon |
| `muse/` client module | Single typed wrapper for all Meta Model API calls: model routing, JSON-schema structured output, retries, dev cache, cost log, per-run spend caps |
| Modal Secrets | META_API_KEY, BASETEN_API_KEY |

### Modal Cloud Compute (Zero AWS/GCP, Zero Competitor APIs)
**$130 in Modal credits** powers our entire backend infrastructure in pure Python:

1. **Modal Function 1 (`bioinformatics_worker` — CPU Container):**
   * 4-core CPU container mounting a persistent `modal.Volume` (`aadr-reference-v1`) holding the pre-computed Reich Lab AADR SNP coordinates, allele frequencies, 25 PC loadings ($\mathbf{V}_{\text{AADR}}$), and ~45–120 ancient population centroids.

   * Auto-detects both **23andMe** (4-column `.txt`) and **AncestryDNA** (5-column `.txt`), strips medical SNPs, projects onto the AADR eigenspace ($\mathbf{p}_{\text{user}} = \frac{M}{M_{\text{valid}}} \tilde{\mathbf{g}}_{\text{user}}^T \mathbf{V}_{\text{AADR}}$), and solves Constrained NNLS admixture with 200 bootstrap iterations in $<2.5\text{ seconds}$.

2. **Modal Function 2 (`open_weight_enclave` — GPU Container):**
   * Serves Meta’s open-weight **Muse Glimmer** / **Muse Spark Open** on a serverless Modal GPU to interpret the user’s ancient admixture matrix and retrieve verified *Nature*/*Science* citations from our bundled Reich Lab paper index.
   * Includes a config flag (`OPEN_WEIGHT_PROVIDER=modal|baseten`) so if Baseten credits (`meta-models/muse-spark-open-1026`) arrive, you can toggle in 1 line.

3. **Modal Function 3 (`open_weight_tts` — GPU/CPU Container) — STRETCH ONLY (build only if everything else is 100%):**
   * Runs Apache-2.0 open-weight **Kokoro-82M TTS** directly on Modal to synthesize documentary narration audio, ensuring **zero** calls to competitor TTS APIs. Core reel ships silent with kinetic typography.
   * Sends the generated audio to Meta's **`Muse Voice Transcribe`** API to extract timestamps (`W = [{ word, start, end }]`). NOTE: word-level granularity is unverified (turn boundaries are confirmed); verify before building. Beat-level sync works with turn-level timing either way.

4. **Modal Function 4 (`playwright_visual_qa` — Headless Browser + Muse Spark) — DEV/QA ON FIXTURE REELS ONLY:**
   * Renders a FIXTURE/SAMPLE reel at 5 key timestamps (`390x844` 9:16 frame), captures screenshots, sends them to **Muse Spark** for a 0-10 visual rubric score, and returns auto-patched CSS custom properties if any text collides.
   * Never runs on per-user Tier 2 reels: genotype-derived frames must not reach the hosted API.


### Pipeline detail (Tier 2) — the deep-time engine

Reference: AADR (Allen Ancient DNA Resource, Reich Lab) v66, HO (Human Origins) release —
ancients AND modern populations on ~600k HO sites; single reference (HGDP/1000G dropped).
Working dir: meta_ai_hacks_docs/smartpca/ (download script, population curation drafts,
method gotchas). Record AADR version + citation + terms in README.

1. Validate/parse raw files — BOTH 23andMe TSV and AncestryDNA format (two-allele columns);
   build 37; no-calls, chip variants — pydantic models. Vendor-agnostic engine; 23andMe
   stays marketing-primary
2. plink2: convert, intersect with HO panel, strand/allele harmonization, drop palindromic
   SNPs. QC GATE: per-file measured overlap (OmniExpress-era chips overlap far better than
   GSA-era like 23andMe v5 — measure per chip Day 2, table in smartpca/README.md); marker
   count surfaced honestly in the UI and the reel's method beat
3. THE MUSE-BUILT ENGINE (NumPy): PCA basis precomputed from curated AADR populations
   (shipped in Modal volume); user projected via least-squares projection with missing-data
   handling (lsqproject-style) + shrinkage correction. This is the "took geneticists years"
   part — Muse Code implements it during the event
4. ORACLE VALIDATION: real EIGENSOFT smartpca runs in the same container as ground truth;
   CI test asserts coordinate correlation r > 0.99 on fixture profiles. The judging claim is
   "Muse reimplemented the Reich Lab's core tool and matches it", not "Muse wrote some PCA"
5. Era-binned mixture fit: constrained NNLS (non-negative, sums to 1) over curated source
   populations for THREE EPOCHS STRICT: Bronze Age (ancient AADR sources), Middle Ages
   (medieval AADR sources), Modern (present-day Human Origins populations, which ship inside
   AADR). G25/nMonte-style method, scoped sanely. Output: per-epoch compositions + closest
   ancient populations/samples with distances + bootstrap uncertainty ranges
6. Output JSON -> SQLite on Modal Volume; raw genotype file deleted. Deliberately NOT
   built: full qpAdm f-statistics machinery (multi-week rabbit hole; documented as roadmap)

### Orchestrator agent (the Best Agentic Use-Case story)

A typed state machine in code orchestrates single-task agents (full spec: AGENTS_PIPELINE.MD):
gatekeep upload (vendor detect, health-panel rejection, tier route) -> (parse screenshot via
hosted Spark vision | run deep-time engine on Modal CPU) -> citation selection from the curated
Reich Lab index plus grade-8 explainers -> reel plan (7 beats, 30-60s) with kinetic copy and
map waypoints -> scene selection from the pregenerated library (Tier 2: library-only, open
weights; Tier 1: hosted Spark, capped on-the-fly Muse Image on cache miss) -> compliance audit
gate -> reel JSON consumed by the t-driven engine. Every step emits a progress event the app
renders live. Tier 2 privacy invariant is ABSOLUTE: every agent in a raw-file job runs on open
weights and zero hosted calls occur. NOT RAG: Muse Spark's search grounding authors the
reviewed citation index at BUILD TIME; runtime does constrained claim-to-citation binding over
structured engine output, no retrieval infrastructure anywhere.

### The Reel engine

- Our own t-driven scene engine (TypeScript, small): every visual property is a pure function
  of time t, no CSS keyframe timelines. Based on the html-reel "clock" pattern from the MengTo
  Skills repo, which is MIT licensed (verified Oct 30), so the skill may be downloaded and
  adapted with attribution. We still drop its ElevenLabs voiceover path
- Determinism of t -> frame is what makes Modal MP4 export exact (step t, screenshot, ffmpeg)
- Playback: WebView / Expo "use dom" in the RN app (identical on web). 1080x1920, 30-60s
  STRICT, 7 beats
- Maps inside the reel: NO map service (no Mapbox, no tiles, no network). Bundled world-atlas
  TopoJSON (Natural Earth, public domain, ~100KB) rendered with d3-geo as SVG/Canvas inside
  the engine. Migration paths draw as pure functions of t, so they are deterministic for MP4
  export and render with zero delay
- Voiceover: core reel is SILENT, kinetic typography (Inter display) carries narration.
  STRETCH ONLY (if everything else is 100%): Kokoro-82M TTS on Modal + Muse Voice Transcribe
  timestamps to sync the clock; audio muxed into MP4 via ffmpeg
- Authoring attempt order per decision: Muse Spark authors reel JSON + beat layouts first;
  only if it cannot, fall back to outside help for the one-time engine/template work

## Data

- SQLite file on a persistent modal.Volume (decision Oct 30). No Postgres container, no managed
  DB: there is no auth and no concurrent-writer workload, so SQLite is the right size and has
  zero ops cost. Tables: `uploads` (metadata only, never genotypes), `jobs`, `reels`
  (beats, citations, scene refs), `share_cards`
- The app keys a user's Library with a client-generated device ID stored locally (no signup,
  no accounts). Real auth is extra credit, post-hackathon
- Storage: Modal Volumes for screenshots, pregenerated scene library, and exported MP4s;
  served through signed Modal endpoints. Raw genotype files live transiently in Modal volumes
  and are deleted post-job
- Auth: none this hackathon (extra credit later)

## Atlas / globe

- No Mapbox or any tile service (network delay, API keys, nondeterminism)
- Reel map insets: bundled world-atlas TopoJSON + d3-geo (see Reel engine section)
- Interactive Atlas screen (if it survives scope): react-globe.gl (Three.js globe, assets
  bundled, works offline); era slider snaps to Bronze Age / Middle Ages / Modern

## Meta Model API usage and reasoning-effort policy

| Task | Model | Effort |
|------|-------|--------|
| Vendor detection, tier routing, health-panel check | Muse Spark | low |
| Screenshot -> structured composition | Muse Spark (vision) | medium |
| Literature grounding + citations | Muse Spark (search grounding) | high |
| Chapter narratives | Muse Spark (or Glimmer in privacy mode) | high |
| Scene generation | Muse Image | n/a |
| Scene scoring/selection | Muse Spark | low |


## Credits budget

We have $150 Meta credits (secured; VALID ONLY THROUGH NOV 4, usage after that bills the card),
$130 Modal total ($30 monthly allowance + $100 hackathon grant), and $100 Baseten (secured).
These credits cover everything: code generation, API calls, cloud compute.

| Source | Amount | Allocation |
|--------|--------|-----------|
| Meta Model API | $150 (expires Nov 4, then billed) | Muse Image is $0.01/image (verified), so the full pregenerated library (3 candidates x 3 eras x ~20-40 populations) costs $2-4; be generous with library coverage. Bulk of budget: ~$80 Spark parsing/index-authoring/dev iterations and Muse Code if shared pool; ~$30 demo-day headroom; ~$35 reserve. Dev cache mandatory (RULES.md) |
| Modal | $130 ($30 monthly + $100 grant) | CPU pipeline + endpoints + Postgres container + MP4 export: pennies. Reserve ~$60-80 for Glimmer GPU (~20-40 GPU-hours): dev against hosted Spark early, GPU up late, aggressive scaledown so idle = $0 |
| Baseten | $100 (secured) | Muse Spark Open (meta-models/muse-spark-open-1026) as the graceful backup for the open-weights path; one-line provider toggle |
| Muse Code | Discord confirms Claude is also permitted for code generation | Plan: Muse Code primary (judging story + credits), Claude as fallback if Muse Code output is not working |

### Budget caps (NON-NEGOTIABLE, implement before any code runs)

1. Dashboard-level hard spending caps/alerts set on Meta, Modal, and Baseten accounts Day 0.
2. The `muse/` client logs cost per call and enforces per-run caps (e.g., max images per
   episode, max tokens per agent call); a global kill switch env var halts all paid calls.
3. GPU containers: scaledown_window at the minimum; never leave a dev GPU warm overnight.
4. Nov 4 end-of-day: confirm nothing is still deployed that can bill against the expired
   Meta credits; tear down or cap everything.

## Repo layout (public from day one)

```
pocketdna/
  app/                 Expo app (TypeScript; iOS + web)
  backend/             Modal app (Python)
    api/  pipeline/  glimmer/  muse/  prompts/
  shared/              JSON schemas shared app<->backend
  docs/                These planning docs (copied in)
  demo/                Demo script, fixtures (openSNP IDs + licenses), video assets
  README.md            Problem, Meta models used, what was built during hackathon, data rights
```


omplete Stack Matrix (100% Meta + Open Source)

| Layer | Technology | Role in PocketDNA | Credits / Cost |
| :--- | :--- | :--- | :--- |
| **Coding Agent** | **Muse Code** (Claude permitted as fallback per Discord) | Authors the React Native Universal UI, Modal Python bioinformatics engine, and `reel-clock.js` choreography. | $150 Meta Model API Credits |
| **Universal Frontend** | **React Native (Expo SDK 52+, Expo Router, React Native Web)** | Single codebase compiling to Responsive Desktop Web, Mobile Web, and iOS (TestFlight). | Free / Open Source (Meta Ecosystem) |
| **9:16 Documentary Engine** | **`reel-clock.js` (`window.__frame(t)`) inside Expo `"use dom"`** | Frame-accurate 9:16 HTML/SVG/Canvas documentary stage, 30-60s, 7 beats, deterministic for MP4 export. | Open Source (html-reel pattern, MIT) |
| **Maps / Atlas** | **world-atlas TopoJSON + d3-geo** (reel insets); **react-globe.gl** (interactive atlas, scope permitting) | Zero-network bundled vector maps; migration paths as pure functions of t; no Mapbox, no tiles, no delay. | Free / Open Source |
| **Database & Storage** | **SQLite on a modal.Volume** | Job state, reel manifests, citations; Volumes store the scene library and MP4s. No auth this hackathon (device ID keys the Library; auth is extra credit). | $130 Modal Credits |
| **Bioinformatics Compute** | **Modal Serverless CPU + `modal.Volume`** | Dual 23andMe/Ancestry parser + pre-computed Reich Lab AADR eigenspace projection + constrained NNLS solver (<2.5s). | $130 Modal Credits |
| **Private Open-Weight LLM** | **Muse Glimmer** on **Modal GPU**, **Muse Spark Open** via **Baseten** backup | EVERY agent in a raw-file job: citation binding, reel direction, scene selection (library-only), compliance audit. Zero hosted calls in Tier 2. One-line provider toggle for graceful failover. | $130 Modal + $100 Baseten Credits |
| **Multimodal Reasoning & QA** | **Muse Spark** (Meta Model API) | Screenshot parsing (Tier 1), Tier 1 reel direction, and 0-10 Visual QA Critic scoring on fixture reels. | $150 Meta Model API Credits |
| **Historical Visuals** | **Muse Wonder & Muse Image** (Meta Model API) | PREGENERATED library of 9:16 Bronze Age / Middle Ages / Modern scenes for common populations at build time; capped on-the-fly generation for uncommon ones. | $150 Meta Model API Credits |
| **2.5D Depth Segmentation** | **SAM 3.1** (Meta Model API) | Cuts foreground subjects into transparent PNG masks for 2.5D Ken Burns parallax; runs at build time over the pregenerated library. | $150 Meta Model API Credits |
| **Voice Synthesis & Sync (STRETCH ONLY)** | **Kokoro-82M Open-Weight TTS (Modal)** + **Muse Voice Transcribe (Meta API)** | Built only if everything else is 100%: synthesizes voiceover on open weights, extracts timestamps via Meta API (word-level granularity unverified; turn-level confirmed). | $130 Modal + $150 Meta API Credits |