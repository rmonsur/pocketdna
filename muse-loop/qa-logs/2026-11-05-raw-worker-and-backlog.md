# Raw worker + science/product/hardening pass — 2026-11-05

## Browser raw-DNA pipeline (built, tested on the builder's own export)

- `harmonize.ts`: consumer genotype -> bundle calls (copies of a1), direct and
  strand-complement paths, indels/no-calls -> missing. Unit-tested by hand-worked cases.
- `analyzeRaw.ts`: projection (normal equations, cross-checked vs the QR solver
  at 1e-9), per-era mixture fits against the era panels, chromosome-block
  bootstrap (24 reps), closest sources, honest limitations on every result.
- `rawWorker.ts` + `src/lib/rawAnalysis.ts`: Web Worker; bundle fetched from the
  local server's allowlisted `/api/bundle/*` and `/api/era-panels` endpoints.
- UI: raw tab now analyses on-device (ZIP honestly refused — unzip first);
  `RawResult` shows coordinates, QC, per-era shares with bootstrap ranges.
- The mixture solver was rewritten as a Lawson–Hanson active-set QP after the
  modern panel (226 sources > 25 dims) exposed Gram singularity and cycling in
  the first version; new k>>dims recovery test added.
- End-to-end on the builder's 23andMe file (951,360 lines): 47,115 harmonized
  calls (47.2% bundle coverage, matching the chip's marker presence), 1.2s,
  QC passed. Modern fit residual 0.0077; bronze 0.036; middle 0.064 (thin
  South-Asian medieval coverage — the residual says so). Only aggregate QC
  metrics are recorded here; no coordinates or genotypes logged.

## Science lane

- Era date sanity (`validate_era_sanity.py`): the era files themselves mix
  modern proxy sources into ancient panels (bronze dated-median 0 BP, 37% in a
  broad bronze window; middle median 603 BP). Reported as panel-composition
  fact, not used as a filter.
- Allele-error injection: 1% flipped calls ≈ chip-mask noise (p95 0.32 SD);
  5% degrades to 0.52 SD.
- `unmatched_review.csv`: top AADR group candidates for all 1,481 unmatched
  era rows, for human decision. Nothing auto-matched.

## Product completeness

- Correction step: `POST /api/extract` (gatekeeper+extractor) -> editable
  `CorrectionTable` (labels, percentages, remove rows, vendor) -> job created
  with user-confirmed shares; the pipeline skips both vision calls and stamps
  the evidence "confirmed or edited by you". New server tests cover the typed
  kill-switch failure and corrected-shares validation.
- Citations: all 9 index DOIs verified — 7 via Crossref (title+year match),
  AADR via DataCite. One seeded DOI was wrong (Margaryan Viking paper,
  ...2682-5 404s everywhere); corrected to 10.1038/s41586-020-2688-8 in the
  citation index and fixtures, re-verified 200. Record:
  `citation-crossref-check.json`.
- Replay hook rewritten to compliant wording ("Some of your matches are
  5,000 years old" — no superlative personal claim).
- Judge path: `npm run serve` builds and serves app+API on one origin
  (http://localhost:8000); documented at the top of the README.
- Still open: live Muse Image generation (scenes remain labelled gradient
  placeholders — the image API was not wired this pass).

## Hardening backlog

- zod 3 -> 4.6.7 upgraded: high-severity advisory cleared, 3 moderate remain
  (dev-tooling chain). All 11 Node suites + tsc green under zod 4.
- Rate limit on POST /api/jobs: 10/minute in-memory (paid-call protection),
  typed 429.
- Bundle split: Atlas/Library lazy-loaded; landing chunk 786 KB -> 257 KB
  (Atlas 554 KB on demand). Worker ships as its own chunk.
- Coverage gate: no coverage tooling exists in this repo's runner; not added
  (would require a new framework). Recorded, not faked.

Verification: tsc clean; 11 Node test files + experimentalProjection + 34
Python tests pass; vite build green; live checks — /api/health, bundle
manifest, era-panels, 19.9 MB weights download, Vite 200.

Self-score: 8/10.
