# Dataset workspace

Local staging for PocketDNA reference-data research. This folder currently contains instructions only: no genotype files, source annotations or validated reference bundle have been added.

ScientificEngineer owns intake and provenance under [BIOINFORMATICS.md](../docs/BIOINFORMATICS.md). Use [POPLIST.md](../docs/POPLIST.md) for candidate discovery; it is not an approved sample list. Follow [RULES.md](../docs/RULES.md) for privacy and redistribution.

## Layout when data arrives

- `raw/`: immutable upstream reference genotypes, annotations and study manifests.
- `interim/`: identity crosswalks, harmonized variants, QC outputs and experimental arrays.
- `processed/`: candidate compact bundles and oracle fixtures awaiting release review.
- `manifests/`: source releases, checksums, permissions, sample/variant roles, exclusions and run identity.

These are future local subdirectories, not supplied datasets. Everything here except this guide and `.gitignore` is ignored by Git by default. Large inputs can instead live outside the repository, referenced through private local configuration. Do not place personal consumer DNA or screenshots in tracked files.

Before processing, record source URL/accession, release, original filename, SHA-256, assembly, genotype type, sample/marker identity, rights and role. Recover the historical source files mentioned in the scientific docs before claiming their audit has been reproduced. Keep v62 annotation findings distinct from current-release genotype approval.

After scientific and redistribution review, deliberately promote compact runtime artifacts to the target `public/reference/`, safe numerical fixtures to `tests/fixtures/`, reports to `research/reports/`, and approved demo inputs to `demo/`. These target paths may still need implementation. Never publish the whole staging folder or unreviewed derived data. Judges consume a validated compact bundle; they do not download the full upstream datasets.
