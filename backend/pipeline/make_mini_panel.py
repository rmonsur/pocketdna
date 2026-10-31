"""Generate the committed mini panel fixture: 200 SNPs, 5 PCs, 3 shared sources.

Deterministic (seed 7). Also writes a synthetic 23andMe-format genome built
from known weights plus truth.json, so engine tests assert real recovery.
All 3 epochs share the mini panel's sources by design (documented simplification).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
FIX = HERE / "fixtures"

SEED = 7
N_SNPS = 2000
K_PCS = 5
TRUTH_W = np.array([0.6, 0.3, 0.1])
SRC_IDS = np.array(["src-steppe", "src-farmer", "src-hunter"])
SRC_LABELS = np.array(["Steppe-like", "Farmer-like", "Hunter-like"])


def main() -> None:
    FIX.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(SEED)
    bases = np.array(["A", "C", "G", "T"])
    refs = bases[rng.integers(0, 4, N_SNPS)]
    alts = np.array([bases[(int(bases.tolist().index(r)) + 1) % 4] for r in refs])
    snps = np.array([f"rs{100001 + i}:{refs[i]}:{alts[i]}" for i in range(N_SNPS)])
    af = rng.uniform(0.25, 0.5, N_SNPS)
    mean = 2 * af
    loadings, _ = np.linalg.qr(rng.standard_normal((N_SNPS, K_PCS)))
    centroids = rng.standard_normal((3, K_PCS)) * 2.5

    panel = {
        "snps": snps, "mean": mean, "V": loadings,
        "panel_id": np.array("mini-fixture-v1"), "aadr_version": np.array("none"),
        "n_ref": np.array(90),
    }
    for epoch in ("bronze", "middle", "modern"):
        panel[f"src_{epoch}_ids"] = SRC_IDS
        panel[f"src_{epoch}_labels"] = SRC_LABELS
        panel[f"src_{epoch}_C"] = centroids
    np.savez(FIX / "mini-panel.npz", **panel)

    truth_p = TRUTH_W @ centroids
    geno_real = mean + loadings @ truth_p + rng.normal(0, 0.08, N_SNPS)
    dosage = np.clip(np.round(geno_real), 0, 2).astype(int)
    lines = ["# PocketDNA synthetic fixture (not real genotypes)", "# rsid\tchromosome\tposition\tgenotype"]
    for i in range(N_SNPS):
        call = "AA" if dosage[i] == 0 else ("AB" if dosage[i] == 1 else "BB")
        call = call.replace("A", refs[i]).replace("B", alts[i])
        lines.append(f"rs{100001 + i}\t1\t{1000 + i}\t{call}")
    (FIX / "mini-genome.txt").write_text("\n".join(lines) + "\n")
    (FIX / "truth.json").write_text(json.dumps(
        {"weights": TRUTH_W.tolist(), "pc": [round(float(x), 4) for x in truth_p]}) + "\n")
    print("wrote mini-panel.npz + mini-genome.txt + truth.json")


if __name__ == "__main__":
    main()
