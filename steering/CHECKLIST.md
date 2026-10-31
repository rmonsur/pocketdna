# PocketDNA Checklist (living tracker)

Internal submit: Nov 4, 2:00 PM EST. Public repo from day one. New work only (Oct 26 - Nov 4).
Bioinformatics Tier 2 engine: PARKED Oct 31 — builder running own tests. Do not build `pipeline/` math until unparked.

Model tags: `[Spark]` = Muse Spark suffices. `[Wonder]` = needs Muse Wonder (long-horizon / hardest build-time passes). `[S->W]` = start Spark, escalate if stuck.

DoD per item (RULES.md): runs on device, survives error case, committed, checked off with date.

## 0. Foundations (Day 0-1)

- [ ] [Spark] Repo public, logged-out access verified. README skeleton (problem, models, new-work statement, AADR cite).
- [ ] [Spark] Dashboard hard caps + alerts on Meta / Modal / Baseten. Record in README.
- [ ] [Spark] Custom domain live + favicon + OG tags. Expo web build deploys to it.
- [ ] [Spark] Scaffolds: `app/` (Expo + TS strict + Router + NativeWind + Zustand + TanStack Query + Zod), `backend/` (Modal Python 3.12), `shared/` schemas, `prompts/`, `demo/`.
- [ ] [Spark] `muse/` typed client: model routing, JSON-schema outputs, retry-once-then-typed-error, dev cache keyed (model, prompt hash), per-call cost log, per-run caps, `KILL_PAID_CALLS` env kill switch.
- [ ] [Spark] Signed-endpoint pattern for Modal Volumes + upload whitelist (PNG/JPEG 10MB; .txt/.zip 50MB, sniff headers, zip-bomb guard). No secrets in repo; Modal/EAS secrets only.
- [ ] [Spark] EAS project configured for TestFlight. First build target Nov 2.
- [ ] [Spark] Conventional commits + pre-commit (tsc --noEmit, no console.log, secret scan).

## 1. Intake + Gatekeeper (Tier 1 path first)

- [ ] [Spark] Upload hub screen (3 cards + privacy badge + format list). See UI-COMPONENTS.md U1.
- [ ] [Spark] A0 GatekeeperAgent: vendor detect, health-panel reject (R1), tier route. Low effort. Prompt in `prompts/a0.md`.
- [ ] [Spark] A1 ScreenshotParserAgent: screenshot -> structured % + confidence. Medium effort. R2 on illegible.
- [ ] [Spark] Consent interstitial (detected vendor, data handling, [Build my episode]).
- [ ] [Spark] Tests: health-panel rejection fixture; parser golden fixtures (5+).

## 2. Reel engine + playback + export (hero output)

- [ ] [S->W] t-driven engine `window.__frame(t)`: every visual prop a pure function of t. No CSS timelines. 1080x1920, 7 beats, 30-60s strict. Pattern from html-reel skill (MIT, attribute); drop ElevenLabs path.
- [ ] [Spark] Playback via WebView / Expo `use dom` (identical web + iOS). Autoplay on arrival, tap = pause + evidence.
- [ ] [Spark] Bundled maps: world-atlas TopoJSON + d3-geo SVG insets, paths as f(t). No Mapbox/tiles/network.
- [ ] [Spark] MP4 export Modal job: headless Chromium steps t -> ffmpeg -> 1080x1920 MP4 on Volume, signed URL. Progress events to app.
- [ ] [Spark] Share stamp beat (B7) + OS share sheet to MP4. No Graph API code anywhere.

## 3. Build-time data (ships as data)

- [ ] [S->W] B1 citation index `data/citation-index.json`: ~50-paper Reich Lab set, claims + DOI + migration-framed summary + grade-8 explainer, A5-pre-vetted. Builder reviews every entry. Spark drafts, Wonder takes contested passes.
- [ ] [Spark] B2 map paths `data/map-paths.json`: waypoints + era labels per transition for d3-geo.
- [ ] [S->W] B3 scene library `assets/scene-library/`: 9:16 Muse Image plates ($0.01/img, be generous: 3 candidates x 3 eras x 20-40 pops), Spark scores vs style guide, SAM 3.1 parallax masks at build time. Wonder writes complex multi-population briefs.
- [ ] [Spark] Scene style lock enforced: painterly archival realism, no text/faces, no war/weapons/fantasy/caricature/modern artifacts.

## 4. Runtime agents + orchestrator (Tier 1 = hosted Spark)

- [ ] [Wonder] Orchestrator typed state machine: gatekeep -> parse/engine -> cite -> direct -> scenes -> audit -> reel JSON. Progress event per step, idempotent/resumable steps, partial-result path (R4).
- [ ] [Spark] A2 citation agent (Tier 1): 4-6 index citations + explainers over structured composition. Missing coverage -> drop claim, never invent.
- [ ] [S->W] A3 director agent (Tier 1): full reel JSON (beats, kinetic copy, timings, waypoints, scene briefs) grounded in A2. Wonder owns template + hard grounding cases.
- [ ] [Spark] A4 scene selector (Tier 1): library-first, capped on-the-fly gen on miss (3 candidates, score, keep, add to library). Failure -> era-default placeholder.
- [ ] [Wonder] A5 compliance auditor: cites-every-claim, zero health/trait/selection/personality/politics/war, era names not modern nations, "consistent with" language. No render without pass. Adversarial fixtures: war, trait, uncited, health, modern-nation.
- [ ] [Spark] A6 visual QA (fixtures only): Playwright 390x844 x 5 timestamps -> Spark vision 0-10 + CSS-var patches. Never on per-user Tier 2 frames.

## 5. App screens (specs: UI-COMPONENTS.md, flows: USER_FLOW.md)

- [ ] [Spark] Welcome + sample reel (safety net when judge has no DNA).
- [ ] [Spark] Web landing: drag/paste-anywhere starts Tier 1, sample above fold.
- [ ] [Spark] Processing screen (demo hero): live step log + model badges + one-line real artifact per step.
- [ ] [Spark] Reel screen + toolbar (Replay / Atlas / Share / Library).
- [ ] [Spark] Evidence layer slide-up: claims, compositions + ranges, closest samples + distances, citations.
- [ ] [Spark] Library (device-ID keyed poster wall, sample always present).
- [ ] [Spark] Atlas: react-globe.gl + era slider IF scope allows; else static per-era maps (degrade path).
- [ ] [Spark] Rejection states R1-R5 all designed (no dead spinners, no default alerts).

## 6. Tier 2 raw-file path (PARKED — builder testing, do not build yet)

- [ ] [HOLD] `pipeline/` NumPy engine: parse 23andMe/Ancestry, plink2 intersect + harmonize, project onto 25-PC AADR basis, 3-epoch NNLS + 200 bootstraps, QC gate + honest marker counts.
- [ ] [HOLD] smartpca oracle validation in CI (r > 0.99 on fixtures).
- [ ] [HOLD] Glimmer GPU endpoint on Modal + `OPEN_WEIGHT_PROVIDER=modal|baseten` toggle. GPU up late, min scaledown, never warm overnight.
- [ ] [HOLD] A2/A3/A4/A5 Tier 2 prompts on open weights, library-only scenes, router assertion blocking hosted calls in Tier 2 jobs + test.
- [ ] [HOLD] Raw-file delete-after-job + no-genotype-logging audit.

## 7. QA / demo / submission

- [ ] [Spark] Non-negotiable tests green: (1) schema validation of every structured output vs fixtures, (2) privacy router assertion, (3) parser fixtures, (4) health rejection.
- [ ] [Spark] Daily E2E demo run: builder raw file (or sample while parked) -> processing -> reel -> evidence -> atlas -> share. Rehearsed daily.
- [ ] [Spark] Demo fixtures: permission records for every shared screenshot, PII redacted; openSNP IDs + licenses in `demo/`.
- [ ] [Spark] Demo video + submission copy: leads with engine + reel, never "screenshot analysis". Scientific-honesty framing (LLM interprets, math is deterministic).
- [ ] [Spark] Nov 4 teardown: nothing billable left deployed after Meta credits expire. Tag `v1.0-demo`.

## Stretch (only if everything above is 100%)

- [ ] A7 voiceover: Kokoro-82M on Modal + Muse Voice Transcribe timestamps. Verify word-level granularity first; turn-level still gives beat sync. Any problem -> ship silent.
- [ ] iOS TestFlight hero shots for demo video (web remains primary).
