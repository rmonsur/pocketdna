# PocketDNA User Flow

## Flow map

```
Welcome
  -> Upload hub
       -> [Tier 1] Screenshot -> vendor detect -> (health panel? -> Rejection)
       -> [Tier 2] Raw 23andMe or AncestryDNA file -> ALWAYS PRIVATE (open-weights badge shown;
          no toggle, privacy is the default and only mode for raw files)
  -> Processing (live agent log)
  -> The Reel (30-60s auto-generated documentary; hero output)
       -> tap: pause + Evidence layer (claims, compositions, citations)
       -> Atlas (time slider) [downgrade path: map insets inside reel beats]
       -> Share: MP4 export (Modal) -> system share sheet
  -> Library (past reels)
```

## Screen-by-screen

### 1. Welcome
- One sentence: "Your DNA results have a story. Watch it."
- CTA: "Make your Reel". Secondary: "Watch a sample Reel" (pre-baked, also the safety net
  if a judge opens the app with no DNA data)
- No signup, no auth (auth is extra credit, post-hackathon). A client-generated device ID,
  stored locally, keys the Library.

### 1b. Web landing (primary judge-facing surface)
- Same Welcome content plus: drag/paste a screenshot ANYWHERE on the page starts the Tier 1
  flow instantly (zero onboarding a judge goes from link to processing in one gesture)
- Sample reel playable above the fold; custom domain, favicon, OG tags

### 2. Upload hub
- Three cards: "I have a screenshot" / "I have my raw DNA file" / sample episode
- Raw file card carries a permanent privacy badge (Muse Glimmer mark) and one-line explainer:
  "Raw DNA is always processed privately. Interpretation runs on Meta open-weight models we
  host. Your genetic data never touches a third-party API." No toggle; privacy is the default
  and only mode for raw files.
- Accepted formats listed up front: 23andMe and AncestryDNA, both fully supported. Screenshots
  as PNG/JPEG; raw files as .txt OR the .zip exactly as downloaded from the vendor (we unzip
  server-side and sniff the inner file header).

### 3. Vendor detect and consent interstitial
- Spark (low effort) identifies vendor (23andMe and Ancestry ony for now)+ report type from the image/file
- Health/trait panel detected -> Rejection state R1
- Confirm sheet: detected vendor, what will happen, data handling one-liner
  ("raw file deleted after processing"), [Build my episode]

### 4. Processing — demo hero screen
- Live step log, each step with model badge and status:
  1. Reading your results (Muse Spark vision) [Tier 1] / Validating 612,409 markers [Tier 2]
  2. Merging with ancient panel: 164,204 markers usable (QC gate, honest count) [Tier 2]
  3. Projecting you into ancient PC space: precomputed 25-PC AADR eigenspace on Modal [Tier 2]
  4. Fitting your eras: THREE ERAS STRICT, Bronze Age / Middle Ages / Modern, vs AADR sources
  5. Selecting your citations: curated Reich Lab index + grade-8 explainer per claim
     (Muse Glimmer on Modal for Tier 2; Muse Spark for Tier 1)
  6. Directing your reel (Muse Glimmer for Tier 2 / Muse Spark for Tier 1)
  7. Choosing your scenes: pregenerated Muse Image library. Tier 2 is library-only (zero
     hosted calls); Tier 1 may generate on-the-fly for uncommon populations (capped)
- Progress events streamed from orchestrator; each completed step shows a one-line
  real artifact (e.g., "closest Bronze Age sample: Sintashta, Russia", "11 sources found")
- Failure of any step -> designed partial-result path, never a dead spinner

### 5. The Reel (hero output)
- 30-60s STRICT, 9:16, autoplays on arrival; 7-beat structure specified in DESIGN.md
  (hook -> method beat -> three era beats: Bronze Age, Middle Ages, Modern -> convergence map
  -> share stamp)
- Kinetic typography (Inter display) carries narration; core reel is silent. Voiceover
  (Kokoro-82M + Voice Transcribe sync) is STRETCH ONLY, built if everything else is 100%
- Each era beat carries one cited claim plus a short plain-language explainer of what the
  result actually means
- Tap -> pause + Evidence layer (slide-up): the beat's claims mapped to compositions with
  uncertainty ranges, closest ancient samples with distances, sources (authors, year, venue, link)
- Persistent minimal toolbar: Replay / Atlas / Share / Library
- Scenes: pregenerated Muse Image library for common era/population combos. Raw-file Reels
  (Tier 2) use the library exclusively (keeps the privacy claim absolute: zero hosted calls);
  screenshot Reels (Tier 1) may trigger capped on-the-fly generation for uncommon populations.
  At $0.01/image, library coverage should be generous

### 6. Atlas
- Bundled vector globe/map (world-atlas TopoJSON + d3-geo in the reel; react-globe.gl for the
  interactive screen if scope permits). NO Mapbox, no tile services, no network calls
- Time slider snaps to THREE ERAS: Bronze Age, Middle Ages, Modern; lineage paths animate per era
- Each node tap -> jumps to the relevant Reel beat
- Degrade path (if behind schedule): static per-era maps instead of slider

### 7. Share
- Primary: export the reel itself as MP4 (Modal render job, progress shown) -> OS share sheet.
  The reel IS the viral asset for Instagram/Facebook/Threads reels and stories
- The loop is the user posting their own reel to their own accounts (NGL/BeReal-style sharing
  loop). No Facebook platform/Graph API integration (ruled out: deprecated Groups API, app
  review latency, policy risk); the OS share sheet already reaches FB/IG/Threads

### 8. Library
- Past Reels as poster wall, keyed by the local device ID. Sample Reel always present.

## Rejection and edge states (all designed; see DESIGN.md)

| ID | Trigger | Behavior |
|----|---------|----------|
| R1 | Health/trait panel detected | Respectful refusal: "PocketDNA reads ancestry only. We never interpret health data." + link to why |
| R2 | Unsupported/illegible screenshot | Ask for the ancestry composition screen specifically; show example crop |
| R3 | Malformed raw file | Named error (wrong build, truncated file) + how to re-export from 23andMe and AncestryDNA|
| R4 | Pipeline step failure | Partial episode with available chapters + retry affordance |
| R5 | Raw-file tier, open-weights endpoint down (Modal AND Baseten backup) | Explicit choice: wait/retry OR user explicitly consents to hosted processing (never silent, never default) |

## Demo path through this flow (the one that cannot fail)

Welcome -> raw file (builder's own; private by default, open-weights badge visible) ->
processing (cached pipeline, real logs) -> reel -> evidence sheet -> atlas -> share.
Rehearsed end-to-end daily.
