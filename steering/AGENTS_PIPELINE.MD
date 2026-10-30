# PocketDNA: Multi-Agent Pipeline Specification (`1 Agent = 1 Task`)
*100% Meta AI Models + Open-Weight Models on Modal (Zero Competitor APIs)*

Principles:
1. One agent, one task, one input schema, one output schema (Zod/pydantic, shared).
2. Deterministic code orchestrates; agents never call agents; agents never do math.
   The bioinformatics engine is pure NumPy/SciPy, not an agent.
3. Privacy invariant: for the raw-file tier, every agent that sees genotype-derived content
   runs on open weights (Muse Glimmer on Modal GPU, Muse Spark Open on Baseten as backup).
   Hosted Meta API agents serve only the screenshot tier and non-derived work.
4. Build-time agents run during development and ship their output as data (reliability, cost,
   privacy). Prefer build-time whenever the input space is enumerable.
5. Every agent has fixtures and a golden-output test; schema violations retry once with the
   validation error in-prompt, then degrade per the agent's failure mode.

---

## Pipeline Topology Overview

```
BUILD TIME (ships as data, runs during development):
  B1 CitationIndexerAgent ──► data/citation-index.json  (curated ~50-paper Reich Lab index)
  B2 CartographerAgent    ──► data/map-paths.json       (era waypoints for d3-geo paths)
  B3 SceneLibrarianAgent  ──► assets/scene-library/     (pregenerated Muse Image plates
                                                         + SAM 3.1 parallax masks)

RUNTIME:
[User Input: Screenshot OR Raw .txt OR 1-Click Sample]
        │
        ▼
  A0: GatekeeperAgent [Muse Spark Vision, hosted, low effort]
      vendor detect · health-panel rejection (R1) · tier route
        │
        ├─ (Tier 1: Screenshot) ─► A1: ScreenshotParserAgent [Muse Spark Vision, hosted]
        │
        └─ (Tier 2: Raw DNA, ALWAYS PRIVATE) ─► ENGINE (not an agent):
               deterministic NumPy/SciPy on Modal CPU: parse -> project onto precomputed
               25-PC AADR eigenspace -> 3-epoch constrained NNLS (Bronze / Middle / Modern)
        │
        ▼
  A2: ArchaeogeneticsCitationAgent
      [Tier 2: Muse Glimmer on Modal GPU / Spark Open on Baseten · Tier 1: Muse Spark hosted]
        │
        ▼
  A3: DocumentaryDirectorAgent
      [Tier 2: open weights · Tier 1: Muse Spark hosted]
        │
        ▼
  A4: SceneSelectorAgent
      [Tier 2: open weights, LIBRARY-ONLY scenes · Tier 1: Muse Spark hosted,
       capped Muse Image generation on cache miss]
        │
        ▼
  A5: ComplianceAuditorAgent  ◄── NO REEL RENDERS WITHOUT A PASS
      [Tier 2: open weights · Tier 1: Muse Spark hosted]
        │
        ▼
  [reel JSON -> t-driven engine -> playback / MP4 export]

DEV/QA LOOP (fixture reels only, not per-user):
  A6: VisualQaCriticAgent [Playwright on Modal + Muse Spark Vision]

STRETCH ONLY (if everything else is 100%):
  A7: VoiceAndClockSyncAgent [Kokoro-82M TTS on Modal + Muse Voice Transcribe]
```

---

## Runtime agents

### A0: `GatekeeperAgent`
* **Single Task:** Classify an upload: detect vendor (23andMe / AncestryDNA), detect report
  type, REJECT health/trait panels (R1) and illegible inputs (R2), route to tier.
  Raw-file header validation is deterministic code, not this agent.
* **Model / Infra:** `Muse Spark` (Vision, Meta API), low effort.
* **Failure mode:** Unknown input -> R2, never guess.

### A1: `ScreenshotParserAgent`
* **Single Task:** Parse a 23andMe or AncestryDNA ancestry-results screenshot into structured
  percentages with per-field confidence, mapped to reference population priors.
* **Model / Infra:** `Muse Spark` (Vision, Meta API), medium effort.
* **Failure mode:** Low-confidence fields flagged; unusable -> R2.

### ENGINE (deterministic, NOT an agent): `bioinformatics_worker`
* **Single Task:** Parse raw 23andMe/AncestryDNA files, strip clinical/medical SNPs, project
  genotypes onto the precomputed Reich Lab AADR eigenspace
  ($\mathbf{p}_{\text{user}} = \frac{M}{M_{\text{valid}}} \tilde{\mathbf{g}}_{\text{user}}^T \mathbf{V}_{\text{AADR}}$),
  solve constrained NNLS admixture with 200 bootstrap resamples across THREE epochs
  (Bronze Age / Middle Ages / Modern, modern sources = Human Origins populations within AADR).
* **Infra:** Python/NumPy/SciPy written with Muse Code, Modal Serverless CPU, mounted
  `aadr-reference-v1` Volume. Latency target < 2.5s. Validated against EIGENSOFT smartpca
  oracle (r > 0.99) in CI.

### A2: `ArchaeogeneticsCitationAgent`
* **Single Task:** Given PC coordinates, closest ancient samples, and 3-epoch admixture
  weights, select 4-6 exact peer-reviewed citations from the build-time citation index (B1)
  and write a one-line grade-8 explainer per claim.
* **Model / Infra:** Tier 2: **Muse Glimmer** on Modal GPU (backup: `muse-spark-open-1026`
  via Baseten, `OPEN_WEIGHT_PROVIDER=modal|baseten`). Tier 1: Muse Spark (Meta API), high effort.
* **Failure mode:** Missing index coverage -> claim dropped, never invented. Qualifies the
  project for the Best Build on Meta Open Weight Models prize.

### A3: `DocumentaryDirectorAgent`
* **Single Task:** Write the complete reel JSON: 7 beats (hook, method, Bronze Age, Middle
  Ages, Modern, convergence, share stamp), 30-60s timing, kinetic copy, map waypoints (from B2),
  and scene briefs, grounded strictly in A2's citations.
* **Model / Infra:** Tier 2: open weights (Glimmer/Spark Open). Tier 1: `Muse Spark`
  (Meta API), high effort.
* **Failure mode:** Retry once with validation errors; then template reel with safe library copy.

### A4: `SceneSelectorAgent`
* **Single Task:** For each era beat, pick the best plate from the pregenerated scene library
  (B3).
* **Model / Infra (decision Oct 30, privacy option a):**
  * Tier 2 (raw file): selection runs on open weights (Glimmer/Spark Open) and is LIBRARY-ONLY.
    No on-the-fly generation, no hosted calls of any kind. Uncommon populations get the closest
    library plate plus an honest caption. This keeps ABOUT's claim absolute: raw DNA and its
    derivatives never touch a hosted API.
  * Tier 1 (screenshot): selection on `Muse Spark` (Meta API) low effort; on a library miss,
    capped on-the-fly generation (3 `Muse Image` candidates, score against the style guide,
    pick one, add to library).
* **Failure mode:** Generation failure -> styled era-default placeholder from library.

### A5: `ComplianceAuditorAgent`
* **Single Task:** Final gate on reel JSON + selected scenes before render: every claim cites
  an index source; zero health/trait/selection content; zero personality or identity inference;
  zero political framing or war glorification (migration/expansion language, era names not
  modern nations); confidence language ("consistent with") present.
* **Model / Infra:** Tier 2: open weights. Tier 1: `Muse Spark` (Meta API), high effort.
* **Failure mode:** Violations -> A3 revises once; still failing -> degrade the offending beat
  to safe library copy. NO REEL RENDERS WITHOUT AN A5 PASS. Tested against adversarial
  fixtures (war framing, trait claim, uncited claim, health mention, modern-nation claim).

### A6: `VisualQaCriticAgent` (dev/QA loop, fixture reels only)
* **Single Task:** Open a rendered 9:16 reel (390x844) in headless Playwright on Modal, scrub
  deterministically via `window.__frame(t)` to 5 key timestamps, screenshot, score visual
  hierarchy/legibility 0-10 with Muse Spark Vision, and propose CSS custom-property patches
  (`--subtitle-offset`, `--title-scale`, `--overlay-scrim-alpha`) for frames under 8.0.
* **Model / Infra:** Playwright (Modal) + `Muse Spark` (Vision, Meta API).
* **Privacy note:** Runs on fixture/sample reels during development, not on per-user Tier 2
  reels, so no genotype-derived frames reach the hosted API.

### A7: `VoiceAndClockSyncAgent` (STRETCH ONLY: build if everything else is 100%)
* **Single Task:** Synthesize narration with open-weight Kokoro-82M TTS on Modal, then extract
  timestamps via `Muse Voice Transcribe` (Meta API) and retime the reel clock to the delivery.
* **Verify first:** word-level granularity is unconfirmed (turn boundaries are confirmed).
  Beat-level sync works with turn-level timing; per-word kinetic sync needs word-level.
* **Failure mode:** Any problem -> ship the silent kinetic-type reel (the core product).

## Build-time agents (run in dev, output ships as data)

### B1: `CitationIndexerAgent`
* **Single Task:** For ONE curated AADR source population, assemble citation-index entries
  from the ~50-paper Reich Lab paleogenomics set: claims, sources (authors/year/venue/DOI),
  migration-framed summary, grade-8 explainer, pre-vetted against A5 rules. Builder reviews
  every entry.
* **Output:** `data/citation-index.json`.

### B2: `CartographerAgent`
* **Single Task:** For ONE era transition, produce map waypoints and era-appropriate labels
  for d3-geo path animation (consumed by A3 and the reel engine).
* **Output:** `data/map-paths.json`.

### B3: `SceneLibrarianAgent`
* **Single Task:** For ONE common era/population combo, pregenerate 3 Muse Image 9:16 plates
  (style-locked), score and keep the best, cut SAM 3.1 parallax masks, store with metadata.
* **Output:** `assets/scene-library/` (plates + alpha masks + scores). This is where most of
  the Muse Image budget is spent, deliberately, at build time.

## Flow evaluation against the whole plan (checked Oct 30)

- Two tiers only: A0 routes; no privacy toggle exists anywhere (ABOUT/USER_FLOW aligned).
- Privacy invariant is ABSOLUTE for Tier 2: every agent that runs in a Tier 2 job (A2, A3, A4,
  A5) runs on open weights, scenes are library-only, and A6 runs on fixtures. Zero hosted
  calls occur anywhere in a Tier 2 job. The router assertion + test in RULES.md enforces this.
- Pregeneration decision (Oct 30) is embodied by B3 + A4's cache-first design; on-the-fly
  Muse Image calls exist only in Tier 1, only on library misses, and are hard-capped
  (budget caps, RULES.md). At $0.01 per image, the full library build is ~$2, so coverage
  should be generous rather than stingy.
- 3 eras / 7 beats / 30-60s are the canonical numbers everywhere in this doc.
- Graceful backups: open-weights provider toggle (Modal GPU <-> Baseten) at A2/A3/A5; scene
  fallback to library placeholders; compliance degradation to safe copy; R4 partial-reel path.
- Voiceover is isolated in A7 so cutting it touches nothing else.
