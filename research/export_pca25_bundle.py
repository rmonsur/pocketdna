#!/usr/bin/env python3
"""Export the experimental PocketDNA PCA-25 basis as a portable, checksummed bundle.

Recomputes weights/means/normalization/coordinate-scales with the same math as
research/experimental_projection_check.py (validated against smartpca at ~6e-7).
Status: experimental basis, basis-fitted scales; NOT production validation and
personal raw-DNA results remain disabled (docs/BIOINFORMATICS.md gates).
"""
from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "dataset/interim/reference-validation/experimental-pca"
OUT = P / "bundle-v1"
BASIS_ID = "pocketdna-pca25-experimental-v1"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    snps = [line.split() for line in (P / "frozen.snp").open() if line.strip()]
    weights = np.loadtxt(P / "pca.weights", usecols=tuple(range(3, 28)), dtype=np.float64)
    if weights.shape != (len(snps), 25):
        raise ValueError("Weight dimensions mismatch")
    with (P / "pca.weights").open() as f:
        ids = [line.split()[0] for line in f if line.strip()]
    if ids != [r[0] for r in snps]:
        raise ValueError("Weight SNP order mismatch")

    with (P / "basis-frequency.acount").open(newline="") as f:
        freq = {r["ID"]: r for r in csv.DictReader(f, delimiter="\t")}
    means, normalization = [], []
    for marker, *_rest, a1, a2 in [(r[0], *r[1:], r[4], r[5]) for r in snps]:
        row = freq[marker]
        if row["REF"] != a1 or row["ALT"] != a2:
            raise ValueError(f"Frequency allele mismatch at {marker}")
        n = int(row["OBS_CT"])
        p = (n - int(row["ALT_CTS"])) / n  # frequency of allele A1 (frozen.snp col 5)
        if not 0 < p < 1:
            raise ValueError(f"Monomorphic marker {marker}")
        means.append(2 * p)
        normalization.append(1 / np.sqrt(p * (1 - p)))
    means = np.array(means)
    normalization = np.array(normalization)
    weights = weights / np.sqrt(len(snps))

    # Coordinate scales: refit deterministically on the parity fixture calibration
    # outputs is not possible here without genotypes; reuse the validated scales
    # exported by experimental_projection_check.py (basis-only calibration).
    scales = np.fromfile(P / "ts-parity/coordinate-scales.f64", dtype="<f8")
    if scales.shape != (25,):
        raise ValueError("Coordinate scales missing; run experimental_projection_check.py first")
    fixture_weights = np.fromfile(P / "ts-parity/weights.f64", dtype="<f8").reshape(len(snps), 25)
    if not np.allclose(fixture_weights, weights):
        raise ValueError("Recomputed weights diverge from validated parity fixture")

    OUT.mkdir(exist_ok=True)
    arrays = {
        "weights.f64": np.asarray(weights, dtype="<f8"),
        "means.f64": np.asarray(means, dtype="<f8"),
        "normalization.f64": np.asarray(normalization, dtype="<f8"),
        "coordinate-scales.f64": np.asarray(scales, dtype="<f8"),
    }
    for name, arr in arrays.items():
        arr.tofile(OUT / name)
    with (OUT / "markers.tsv").open("w") as f:
        f.write("id\tchrom\tpos\ta1\ta2\n")
        for r in snps:
            f.write(f"{r[0]}\t{r[1]}\t{r[3]}\t{r[4]}\t{r[5]}\n")

    manifest = {
        "schemaVersion": 1,
        "basisId": BASIS_ID,
        "status": "experimental; not production validation; personal raw-DNA results disabled",
        "dimensions": 25,
        "markers": len(snps),
        "basisSamples": 2829,
        "callConvention": "calls[i] = copies of allele a1 (markers.tsv) in {0,1,2}; 3 = missing/no-call",
        "calibration": "25 per-axis scales fitted on 16 evenly spaced basis individuals against smartpca scores",
        "parity": "Python and TypeScript projection match smartpca at max abs error ~6.3e-7 (full and demo-masked)",
        "sources": {
            "pca.weights": sha256(P / "pca.weights"),
            "frozen.snp": sha256(P / "frozen.snp"),
            "basis-frequency.acount": sha256(P / "basis-frequency.acount"),
        },
        "files": {name: hashlib.sha256((OUT / name).read_bytes()).hexdigest() for name in [*arrays, "markers.tsv"]},
        "limitations": [
            "Experimental basis; identity/QC gates in docs/BIOINFORMATICS.md are not all closed.",
            "Consumer-chip transfer validated only as marker-presence proxy on 16 reference samples.",
            "Allele harmonization from consumer exports to the a1-count convention is required before runtime use.",
        ],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"bundle": str(OUT), "markers": len(snps), "basisId": BASIS_ID}, indent=2))


if __name__ == "__main__":
    main()
