# PocketDNA diagrams

How the product actually runs, drawn from the docs (`docs/ABOUT.md`, `docs/STACK.md`,
`docs/AGENT.md`, `docs/IMAGE.md`, `docs/RULES.md`, `AGENTS.md`) and checked against the
code that exists today (`src/server/pipeline.ts`, `src/server/images.ts`,
`src/lib/muse/client.ts`, `src/server/app.ts`). Where the docs specify more than the
code does, the diagram says so (see 06).

Two skills were used as the drawing method, both MIT licensed:

- [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) for the
  seven schematic pages: one self-contained HTML + inline SVG each, orthogonal
  connectors, masked labels, a bottom legend, accessible `<title>`/`<desc>`.
- [wheresryan22/anatomy](https://github.com/wheresryan22/anatomy) for the isometric
  figure in `anatomy/`: a physical machine whose mechanism is the pipeline. The kit
  (`anatomy/kit/iso-kit.mjs`, `iso.css`) is vendored with its licence.

Open any `.html` file directly in a browser. PNG previews are in `previews/`.

Each schematic page has a **plain-language walkthrough** under the drawing. For every step
it gives what the step gets, does, hands over, why a Muse model (or no model) is used there
and which guard applies, plus a "critical view" of what Muse is and is not trusted with.
The architecture and input pages also list the genomic datasets (AADR, EGDP, SGDP,
Franco-Cantabrian) and why they are not in the repository. Text lives in
`walk-content.mjs`, dataset rows and source links in `datasets.mjs`, layout in
`walk-render.mjs`.

## Index

| File | Type | What it shows | Source docs |
| --- | --- | --- | --- |
| `01-system-architecture.html` | Architecture | Browser (React app, in-memory ancestry worker, reel engine), local Hono server (API, orchestrator, the single Muse adapter, local cache), hosted Muse Spark and Muse Image. Raw genotypes never cross the browser boundary. | STACK §3, §5, §10; RULES privacy |
| `02-input-to-evidence.html` | Flowchart | Screenshot tier (gatekeeper, extractor, user correction, typed rejections) and raw tier (browser worker: parse, QC, PCA-25, era fits), both ending in one `EvidenceRecord`. | STACK §5; `pipeline.ts`, `app.ts` |
| `03-evidence-to-film.html` | Process | Interpretation, profiler, director, narrative and compliance audits (run in parallel) with the single repair loop, then deterministic atlas scenes and reviewed images. | AGENTS graph; DIRECTOR; `pipeline.ts` |
| `04-agent-swimlane.html` | Swimlane | Who hands what to whom: orchestrator, Spark workers, Spark auditors, deterministic code. | AGENTS runtime role registry |
| `05-muse-call-sequence.html` | Sequence | What one `callJson` goes through: kill switch, run cap, sha256 cache, Meta API with JSON schema, Zod validation and one retry, cache write, cost log, typed result. | RULES models/budget; `client.ts` |
| `06-image-agent-state.html` | State machine | HistoricalImageAgent states from AGENT.md. Audit, one repair, re-audit, then approved or fallback, as `images.ts` now implements it. | AGENT.md; IMAGE.md; `images.ts` |
| `07-muse-model-map.html` | Tree | Which Muse model runs which stage, at which effort (temperature and token caps from `models.ts`; high effort is 32,768 tokens), and that Wonder is development only. | STACK §6; `models.ts` |
| `anatomy/pocketdna-bench.html` | Isometric figure | The bench: a sealed analyser releases an evidence card, one lamp lights for every Spark stage, two stamps are the audits, a reel winds the film. Readout and dial count paid calls. Hover or use arrow keys. Light theme: `pocketdna-bench-light.html`. | ABOUT; AGENTS; `pipeline.ts` |

## Skin

The diagram-design style-guide gate was answered with the project's own tokens from
`docs/DESIGN.md`: warm charcoal paper `#0A0908`, white ink, `#A3A3A3` secondary text,
amber `#EEB057` as the one focal accent, lime `#C8F45B` for HTTP/API arrows, Inter for
names, Geist Mono for technical labels, Instrument Serif for titles and callouts. The
accent budget (one or two elements per diagram) is kept.

## Rebuild

```sh
node diagram/build-diagrams.mjs          # writes the seven schematic HTML files
node diagram/anatomy/build.mjs           # dark figure
node diagram/anatomy/build.mjs --light   # light figure
```

Both generators are plain Node (20+) with no dependencies. Edit the geometry in the
generator, not the HTML.

## Checks run (2026-11-05)

- diagram-design `scripts/verify-geometry.py` on all seven pages: 0 findings
  (two connectors were rerouted after a first pass flagged a transit behind a node and
  a border-riding segment).
- diagram-design `scripts/self_check.py` on all seven pages: OK (accessible SVG
  contract, single-file safety, content inside the viewBox).
- Headless Chrome renders of every page reviewed at 2x; callout leaders and one zone
  label crossing were corrected.
- anatomy `scripts/lines.mjs` on both figure themes: `line ends: 0 of 526 float`.
- anatomy `scripts/capture.mjs`: console clean, no sideways scroll at 1100 and 390 px,
  readout follows the idle tour, reduced-motion still renders, 4x close-ups of the
  lamp, stamps, analyser slot and meter reviewed.
- Not run: the anatomy geometry audit (`--audit`), which applies to figures with
  recorded pipes and turned parts; this figure has none.
