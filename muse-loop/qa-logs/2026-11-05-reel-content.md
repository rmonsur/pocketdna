# 2026-11-05 reel-content (labels, globe, images, viewport bugs) — score 7/10
Works: 2/2. Spec: 1/2. Compliant: 2/2. Clean: 1/2. Shippable: 1/2.
Spec refs: docs/DIRECTOR.md (beat shape, copy rules), docs/ATLAS.md 6/8
(sampling locations never territory; locate-region / affinity-overview
presets; deterministic film clock), docs/IMAGE.md (HIST-IMAGE-01,
HIST-AUDIT-01, six-image budget, caption-safe composition), docs/AGENT.md
(no self-certification, fallback on failure), AGENTS.md roster.
Fixtures: builder's own raw export (live, not committed as frames).
Shots: none committed — every frame carried a personal ancestry summary
(muse-improve rule: fixtures only). Inspected live in Chrome instead.
Manifest: none (no fixture artifacts produced).

Mistakes seen (user report + live inspection):
- Era headlines used lab codes ("60.5% L8630-like"); nobody can read that.
- No map inside the reel; the right column showed gradient plates only.
- "Illustration (reconstruction)" badge with no illustration behind it.
- Era chip row overflowed into the time counter at 375px.
- Three live runs failed before a pass: director repair hit the 8192-token
  completion cap (Spark reasoning counts as output); narrative auditor never
  saw the profile claims and rejected gazetteer dates; compliance demanded
  the literal phrase "consistent with". Image API rejected size 1080x1920.

Fix applied:
- scripts/build-gazetteer.mjs: 324/326 panel sources mapped to AADR v66.p1
  rows (readable family label, locality, country, lon/lat, date, DOI).
- Population profiles (prompts/population-profiler.md, Spark, high): who /
  where / why similar / caution per top source, each a context claim citing
  the AADR publication; evidence labels rewritten to readable names.
- Deterministic AtlasScene per era beat + convergence (markers = sampling
  locations weighted by share; legend "similarity, not territory or route").
  ReelGlobe: SVG orthographic, camera and reveal pure functions of beat
  progress; dissolves into the reviewed image (terrain-to-image).
- HistoricalImageAgent (src/server/images.ts): HIST-IMAGE-01 compiled from
  gazetteer place/date only (no fit values), Muse Image via Responses API,
  independent Spark vision audit (pass/fallback), per-job manifest, bytes
  served from .local/episodes; failures leave the deterministic plate.
- Viewport: chips shrink-0 with clipped row, reconstruction badge only when
  an image is shown, globe legend badge, stage uses overflow-clip.
- Prompts: director naming/copy rules; auditors accept "similar to" /
  "most similar to" / "closest to ... in this comparison" as qualifiers;
  narrative auditor receives the approved claims; token cap 16384.

Live result (job 00dff4cf-4e7, cached Spark steps + live images):
7 beats, narrative + compliance pass on the first round, 4 globe scenes,
3/3 images approved by the visual auditor (two low-severity notes about busy
lower foregrounds), hook reuses the bronze anchor. Headlines now read
"Most similar to Shahr-i Sokhta people, about 2742 BCE" etc.

Cost: this pass ~$0.95 across 5 runs (Spark profiler/interpretation/
director/auditors + 3 Muse Image at $0.01 + 3 visual audits).

Open (why not 8): no repair pass for images (fallback only); replay fixture
has no images or globe; screenshot (provider) path gets no profiles, globe
or images; panel curation mismatch (BOL001..009 labelled "Volga AD 200-400"
but AADR group Russia_Tver_BA, about 2528 BCE) reported to ScientificEngineer;
gazetteer lives in the ignored dataset/ tree, so a fresh clone needs the
AADR annotation files and `node scripts/build-gazetteer.mjs`.
Verdict: patch-and-rescore (image repair + replay package next).
