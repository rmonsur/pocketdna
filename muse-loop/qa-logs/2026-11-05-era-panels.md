# Era source panels — 2026-11-05

Built native PocketDNA PCA-25 era panels by projecting strictly matched AADR
samples. The era text files' Global25 coordinates were used for membership
and grouping ONLY; every panel coordinate is a native projection (mixing
spaces is forbidden by BIOINFORMATICS).

## Data intake

Copied the 8 user-specified AADR files (1240K + HO: .geno/.ind/.snp/.anno)
to `dataset/` as APFS clones. Verified ignored: `git check-ignore` confirms
`dataset/.gitignore` covers them; `git status` shows zero v66 files.

## Parsing and cross-validation (`research/parse_era_files.py`)

Era files split to CSVs (`era_ids_{bronze,middle,modern}.csv`, with the
external coordinate space labelled on every row). Matching against anno/ind
in strict tiers: T1 exact Genetic ID, T2 suffix-stripped Genetic ID,
T3 Individual ID, T4 Group ID, T5 unique-candidate normalized group match
(ambiguous ties refused, never guessed).

| Era | Era rows | Matched rows | Individuals |
|---|---|---|---|
| Bronze | 157 | 20 | 129 |
| Middle | 584 | 99 | 144 |
| Modern | 1085 | 226 | 3,419 |

Unmatched rows (1,481) are listed in `unmatched.csv` — mostly heavily
abbreviated Eurogenes population codes with no unique AADR counterpart.
Coverage, not silence: bronze panels are sparse (20 sources) and must not be
presented as complete.

## Projection (`research/project_era_samples.py`)

TGENO decoding per the repo's convertf-validated reader. Allele harmonization
ledger: 1240K carries all 99,794 bundle markers (all allele-flipped vs the
bundle convention — systematic, handled), HO carries 46,906 (52,888 absent),
zero incompatible, zero duplicate rsIDs. 3,543 samples projected; per-source
centroids in `panels.json` (bronze 20 / middle 99 / modern 226 sources).

Parity, done honestly in two parts:
- Extraction correctness (like-for-like, identical calls and marker subset):
  **PASS**, max error 5.0e-7 vs the validated frozen.geno chain
  (`check_era_extraction.py`, `extraction_parity.json`).
- Vs full-marker smartpca scores: max delta 0.0085 — this is marker-subset
  information loss (HO ancient/modern extractions carry ~46k usable markers),
  the same effect quantified in the consumer-mask validation. It is recorded
  as a delta with that interpretation, not relabelled as a pass.

Median usable markers per source ≈46k (ancient no-calls + HO marker ceiling);
3,628 of 3,692 matched individuals have ≥40k usable.

## Limits

- Bronze coverage is thin (20/157 sources); era panels are experimental and
  not production science. Era fits (mixture solver, already built) can now run
  against these centroids, but results inherit panel sparsity + mask shift.
- Anno date sanity checks and per-source QC review remain science-lane work.

Self-score: 8/10.
