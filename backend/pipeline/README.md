# pipeline/ (Tier 2 engine — UNPARKED Oct 31)

- `parse_raw.py`: deterministic 23andMe/AncestryDNA parsers (counts, never silent skips).
- `engine.py`: least-squares projection onto panel eigenspace + per-epoch constrained NNLS + 200 bootstraps. Pure NumPy/SciPy.
- `fixtures/`: committed mini panel (seed 7) + synthetic genome + truth. Unit tests run on these.
- `build_panel.py`: builder-run script for the REAL AADR panel (needs plink2, smartpca, AADR release).
- Oracle CI (smartpca r > 0.99) runs once the real panel exists; mini panel is labeled `mini-fixture-v1` everywhere it appears.
