# Dataset workspace

Local staging for PocketDNA reference-data research. The local inputs include AADR v66.1 Human Origins, EGDP, SGDP and Franco-Cantabrian reference data, plus the builder’s DNA export. No validated production reference bundle has been produced yet.

ScientificEngineer owns intake and provenance under [BIOINFORMATICS.md](../docs/BIOINFORMATICS.md). Use [POPLIST.md](../docs/POPLIST.md) for candidate discovery; it is not an approved sample list. Follow [RULES.md](../docs/RULES.md) for privacy and redistribution.

## Layout when data arrives

- `raw/`: immutable upstream reference genotypes, annotations and study manifests.
- `interim/`: identity crosswalks, harmonized variants, QC outputs and experimental arrays.
- `processed/`: candidate compact bundles and oracle fixtures awaiting release review.
- `manifests/`: source releases, checksums, permissions, sample/variant roles, exclusions and run identity.

Reference files and generated results are ignored by Git. The builder explicitly requested that their DNA export be eligible for Git tracking for the demo; the exception is in `.gitignore`. This is sensitive personal genetic data and publishing the repository will publish the file if it is added and committed. Large inputs can instead live outside the repository, referenced through private local configuration. Other personal inputs remain ignored.

Before processing, record source URL/accession, release, original filename, SHA-256, assembly, genotype type, sample/marker identity, rights and role. Recover the historical source files mentioned in the scientific docs before claiming their audit has been reproduced. Keep v62 annotation findings distinct from current-release genotype approval.

After scientific and redistribution review, deliberately promote compact runtime artifacts to the target `public/reference/`, safe numerical fixtures to `tests/fixtures/`, reports to `research/reports/`, and approved demo inputs to `demo/`. These target paths may still need implementation. Never publish the whole staging folder or unreviewed derived data. Judges consume a validated compact bundle; they do not download the full upstream datasets.

## smartpca smoke test

Run `python3 research/smartpca_smoke.py --smartpca /path/to/smartpca` to check that the installed binary can read the supplied AADR TGENO panel. It selects the first 64 `.HO` records and chromosome 22 as a technical fixture only and writes logs, parameters, hashes and results under ignored `dataset/interim/smartpca-smoke/`. This does not establish sample quality, ancestry accuracy, a production basis, or personal results.
