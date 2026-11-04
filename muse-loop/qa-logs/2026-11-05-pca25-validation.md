# PCA-25 validation stages — 2026-11-05

Continues BIOINFORMATICS §14.6–14.7 for the native PocketDNA PCA-25 engine.

## Consumer-mask validation (`research/validate_consumer_masks.py`)

Prespecified acceptance (written before running): p95 per-sample max-axis
|delta| ≤ 0.25 basis-training SD vs full-data smartpca coordinates.
Masks: real consumer-file marker presence (47,142/99,794 bundle markers;
rsIDs only, no consumer calls), chip + 10/30/50% seeded no-call drops,
chip + single-chromosome dropouts. Held-out TEST samples only.

| Condition | Median | p95 | Min usable | Acceptable |
|---|---|---|---|---|
| Chip mask | 0.216 | 0.322 | 46,310 | **No** |
| Chip +10% no-call | 0.236 | 0.357 | 42,078 | No |
| Chip +30% no-call | 0.286 | 0.413 | 32,651 | No |
| Chip +50% no-call | 0.361 | 0.525 | 23,249 | No |
| Worst chr dropout (chr8) | 0.240 | 0.334 | 44,636 | No |

The 0.25 SD acceptance was **not met at any condition** — marker-subset
information loss is intrinsic, not a QC-floor problem. Consequences taken:
`MIN_USABLE_MARKERS` in `src/features/ancestry/pca25.ts` raised 5,000 → 40,000
(keeps runtime inputs in the measured regime) with the measured curve cited in
code; coordinates from masked inputs must carry this uncertainty in any future
product surface. Full report:
`dataset/interim/reference-validation/experimental-pca/consumer-mask-validation.json`.

## Held-out group performance (`research/validate_group_performance.py`)

96 held-out TEST samples across 79 source groups, full calls, bundle vs
smartpca: median group max error 4.96e-7; worst group Papuan 1.72e-6 — inside
the 2e-6 parity tolerance with no group blowing out. Thin evidence per group
(mostly n=1); this is numerical parity by group, not ancestry accuracy.

## Mixture-solver oracle parity

`mixture-oracle.json` solved by the Python engine (scipy SLSQP); the TS
active-set solver now checks against it in `tests/mixture.test.ts` (agreement
within 0.01 on all six weights). Both solvers green alongside their own suites.

## Still blocked / next

- Era source panels + bootstrap era models (§14.7): require approved source
  groups from POPLIST — a science decision, not an engineering one. Solver is
  ready and oracle-verified.
- Identity resolution and frozen-cohort sign-off (§14.2–14.3) remain with the
  science lane; personal raw-DNA results stay disabled until gates close.
- Real consumer exports beyond the builder's file (other chips/builds,
  strand-error injection) not yet tested.

Verification this stage: `tests/pca25.test.ts`, `tests/mixture.test.ts`,
`tests/experimentalProjection.test.ts`, `npx tsc --noEmit`, Python 34 passed.

Self-score: 8/10. The headline number is a failed prespecified threshold,
reported as such; the QC floor and product claims now match the measurement.
