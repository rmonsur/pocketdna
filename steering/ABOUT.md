# PocketDNA General Plan

- Meta Global AI Developer Hackathon | Oct 26 - Nov 4, 2026 | Indie Developer Track (solo)
- Submission deadline: November 4, 9:00 PM EST. Internal deadline: November 4, 2:00 PM EST.
- Track: Indie Developer Track ($400,000 Pool — $150,000 1st Prize) + All 5 Bonus Prizes ($50,000 Pool)
- Builder: Solo Participant (leveraging Muse Code as force-multiplier)

## One-liner

PocketDNA is Finding Your Roots for everyone: drop your DNA test and get a micro documentary 
of your origins. 

## The Problem

50 million people have taken DNA tests globally. Facebook Groups and subreddits  have hundreds of thousands of people posting screenshots asking "what does this
mean?" hoping a knowledgeable stranger replies. The alternative, a professional genetic
genealogist, costs roughly $2,000 per case. Existing deep-ancestry tools (MyTrueAncestry,
IllustrativeDNA) show dry dashboards with no interpretation and no narrative. What people want is a story of who they are. 

Meanwhile, this field is under the golden age of paleogenomics, led by David Reich's lab at Harvard and the Allen Ancient DNA Resource (AADR), has sequenced over 10,000 ancient human skeletons but those insights are locked behind UNIX command-line tools (PLINK, EIGENSOFT/smartpca, qpAdm) and dense academic PDFs in Nature and Science. There are some genetics bloggers like Davidski and Razib Khan who offer some tools for interpretation but there still exists a large gap beteween what people want and what currently is being served. Analysis of deep ancestry is hidden behind dry dashboards like Illustrativedna and MyTrueAncestry and respective subreddits of these companies are filled with people sharing screenshots begging for interpretations.

And since 23andMe's bankruptcy, millions of people are asking a newer, sharper question: who holds my genome? People want deep ancestry insight without surrendering their most personal data to yet another cloud API. PocketDNA processes raw DNA is only on infrastructure we control, and all genotype-derived interpretation runs on Meta's open-weight models (Muse Glimmer / Muse Spark Open) that we host ourselves. 

## Hackathon Problem statement fit

Build for Your World a domain problem the builder knows firsthand (prior project
DNAless; personal demo uses builder's own DNA). Secondary resonance with Push the Frontier via
the real bioinformatics pipeline.

## The Product

A website with iOS (testflight if time permits, app store within a week is scope creep) companion. The user provides DNA results either via screenshot or actual raw DNA text file upload (supprt 23andMe and AncestryDNA only for now) and PocketDNA produces a chaptered, narrated, visually produced micro documentary of their origins (30 second to 60 second max, 9:16 vertical ratio), with every factual claim grounded in cited literature. The product generates DNA based ancestry analysis, maps, images all tied into a compelling narrative via the shorts/reels documentary. 

### Two input tiers (both core)

| Tier | Input | Pipeline | What it proves |
|------|-------|----------|----------------|
| 1 | Screenshot of 23andMe or AncestryDNA results | Muse Spark vision parses the image into structured ancestry data | Zero-friction entry; meets users where they are (the screenshot-posting behavior) |
| 2 | Raw genotype file (23andMe or AncestryDNA), ALWAYS PRIVATE | Deep-time ancestry engine: user genotypes projected onto a precomputed 25-PC AADR eigenspace (basis built at build time, validated against EIGENSOFT smartpca as oracle), then 3-epoch constrained NNLS mixture fit (Bronze Age, Middle Ages, Modern). All genotype-derived interpretation and reel direction runs on Meta open weights (Muse Glimmer on Modal GPU, Muse Spark Open via Baseten as backup). Raw DNA and its derivatives never touch a hosted third-party API | Real bioinformatics plus privacy by default (no toggle, no fine print); the open-weights bonus prize is built into the main path, and it kills any "simple image analyzer" objection |

### The output: the Reel + Evidence layer

One sentence: a 30-60 second, 9:16, auto-generated cinematic reel. Imagine Spotify Wrapped meets a
Nat Geo/Ken Burns sequence with a tappable evidence layer underneath. Stunning sleek visuals and short beats. 


- 7 beats, 30-60 seconds strict: hook (your oldest/rarest signal) -> method-credibility beat
(marker counts, N ancient genomes compared) -> 3 era beats (Bronze Age, Middle Ages, Modern
period) -> convergence map (all paths lead to you) -> share stamp (Instagram/Threads/Facebook
reels and stories)

- Each era beat: full-bleed period scene (from the pregenerated Muse Image library; on-the-fly
  generation for uncommon populations in Tier 1 only, Tier 2 is library-only) with slow push,
  inset animated map path,
  kinetic typography (Inter display) carrying ONE cited claim plus a short plain-language
  explainer of what the result means. Core reel is silent; kinetic type carries narration.
  STRETCH (only if everything else is 100%): Kokoro-82M open-weight TTS voiceover on Modal,
  word/turn timestamps extracted via Muse Voice Transcribe to sync the clock

- Engine: our own t-driven scene engine (every element a pure function of time t, inspired by
  the html-reel clock pattern but written by Muse Code during the event — rights-clean).
  Muse Spark authors each user's reel JSON (beats, copy, map coords, timings) against it

- Playback in-app via WebView (identical on web); MP4 export as a Modal job (headless browser
  steps t frame-by-frame -> ffmpeg) feeding the share/viral loop

- Evidence layer: tap any beat -> the claims, compositions with uncertainty ranges, and real
  citations behind it. This is where the credibility lives


## Execution 

I am using Meta's family of AI models combined with strictly open source software to build this project. As a solo developer competing in the Indie Developer Track my advantage is cohesion and purity of vision:

- zero competitor AI APIs (no OpenAI, no Anthropic, no ElevenLabs, no Google).

- build the mobile & web UI in React Native (Meta’s flagship UI framework).

- write the bioinformatics and animation code using Muse Code (Meta’s coding agent).

- segment 2.5D documentary layers using SAM 3.1 (Meta’s computer vision flagship).

- generate historical reconstructions using Muse Wonder and Muse Image.

- extract timestamps for voiceover sync using Muse Voice Transcribe (stretch goal only).

- run ALL private genomic reasoning on Muse Glimmer (Modal GPU) with Muse Spark Open (Baseten)
  as graceful backup; raw DNA never touches a hosted third-party API.

PocketDNA should read as a love letter to the entire Meta AI solving a deeply human problem.

### Muse model usage map

| Model | Role |
|-------|------|
| Muse Spark | Screenshot vision parsing and cross-vendor reconciliation (Tier 1), Tier 1 reel direction, visual QA critic on fixture reels, and BUILD TIME: authors the curated citation index with its native search grounding. NOT RAG: no retrieval infrastructure exists at runtime; models bind claims to a small builder-reviewed index over structured engine output |
| Muse Wonder | Long-horizon helper for the hardest build-time generations (complex scene briefs, index authoring passes where Spark needs escalation) |
| Muse Image | 9:16 historical scenes, $0.01/image: generous pregenerated library for era/population combos; capped on-the-fly generation for uncommon ones in Tier 1 ONLY (Tier 2 is library-only to keep the privacy claim absolute) |
| SAM 3.1 | 2.5D parallax cutouts (run at build time on the pregenerated library) |
| Muse Glimmer (open weights) | ALL genotype-derived interpretation and reel direction for the raw-file tier, self-hosted on Modal GPU |
| Muse Spark Open via Baseten | Graceful backup for the open-weights path (partner-provided inference is explicitly allowed for the open-weights bonus); one-line config toggle |
| Muse Voice Transcribe | STRETCH only: word/turn timestamps for voiceover clock sync |
| Muse Code | Writes the codebase, performs bioinformatics math |

## Critical scientific honesty rule

The LLM never computes ancestry at inference time. The math is deterministic population
genetics: a PCA-projection + mixture-fitting engine (written by Muse Code, validated against
EIGENSOFT smartpca as ground truth), or the vendor's own published percentages from screenshot. Muse does what previously required a human expert: interpretation, narrative, visuals,
and cited grounding  and, separately, Muse Code wrote the engine itself, which is its own
judging story. This framing appears in the README, demo video, and submission.


## Hard boundaries (see RULES.md)

- No health/trait interpretation ever. Health panels in screenshots are detected and rejected
  with a clear message. Ancestry only.
- Demo data: builder's own DNA (hero demo) + screenshots shared directly with the builder by
  members of Facebook ancestry groups the builder admins, used with their permission, all
  personal information redacted. Keep a record of each permission. 
- Public repo from day one; all work during the event window.


## Related docs

- STRATEGY.md — judging rubric mapping, bonus prizes, demo/video strategy, risks
- RULES.md — hackathon compliance + engineering rules (Muse Code reads this)
- STACK.md — architecture, services, credits budget
- DESIGN.md — visual direction and per-feature quality references
- USER_FLOW.md — screens and flows
- AGENTS_PIPELINE.md — runtime and build-time agent architecture (one agent, one task)
- SKILLS.md - open source libraries of skills, UI components to fast track the build
- UI-COMPONENTS.md — component-level spec sheet with acceptance criteria and build order
- CHECKLIST.md — living spec sheet and project management tracker

