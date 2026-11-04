#!/usr/bin/env python3
"""Like-for-like extraction parity for era panels.

The era extraction projects HO samples from 46,906 of 99,794 bundle markers
(the HO SNP set), while smartpca scores came from the full marker set, so a
direct comparison mixes extraction error with known mask information loss.
Here the validated frozen.geno calls for overlap samples are restricted to
exactly the HO-present markers and projected; agreement with the era
extraction (era_samples_coords.csv) isolates extraction correctness.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dataset"
EXP = DATA / "interim/reference-validation/experimental-pca"
PAN = DATA / "interim/era-panels"
B = EXP / "bundle-v1"


def main() -> None:
    manifest = json.loads((B / "manifest.json").read_text())
    nm, dims = manifest["markers"], manifest["dimensions"]
    weights = np.fromfile(B / "weights.f64", dtype="<f8").reshape(nm, dims)
    means = np.fromfile(B / "means.f64", dtype="<f8")
    normalization = np.fromfile(B / "normalization.f64", dtype="<f8")
    scales = np.fromfile(B / "coordinate-scales.f64", dtype="<f8")

    bids = [r["id"] for r in csv.DictReader(open(B / "markers.tsv"), delimiter="\t")]
    ho_snp = {line.split()[0] for line in (DATA / "v66.p1_compatibility_HO.aadr.patch.PUB.snp").open()}
    ho_present = np.array([m in ho_snp for m in bids])

    ind = [line.split()[0] for line in (EXP / "frozen.ind").open() if line.strip()]
    snps = [line.split() for line in (EXP / "frozen.snp").open() if line.strip()]
    stride = (len(snps) + 3) // 4
    data = np.memmap(EXP / "frozen.geno", dtype=np.uint8, mode="r", offset=48, shape=(len(ind), stride))
    mi = np.arange(len(snps))
    shifts = ((3 - mi % 4) * 2).astype(np.uint8)
    frozen_calls = np.asarray((data[:, mi // 4] >> shifts) & 3)
    alias_index = {sid: i for i, sid in enumerate(ind)}
    g2a = {r["genetic_id"]: r["alias"] for r in csv.DictReader(open(EXP / "aliases.tsv"), delimiter="\t")}

    extracted = {}
    for row in csv.DictReader(open(PAN / "era_samples_coords.csv")):
        extracted[row["genetic_id"]] = np.array([float(row[f"PC{i}"]) for i in range(1, 26)])

    errors = []
    checked = 0
    for gid, coords in extracted.items():
        alias = g2a.get(gid)
        if alias not in alias_index:
            continue
        calls = frozen_calls[alias_index[alias]].copy()
        calls[~ho_present] = 3
        obs = calls != 3
        if obs.sum() <= dims:
            continue
        w = weights[obs]
        values = (calls[obs].astype(np.float64) - means[obs]) * normalization[obs]
        beta, _, rank, _ = np.linalg.lstsq(w, values, rcond=None)
        if rank != dims:
            continue
        errors.append(float(np.max(np.abs(beta * scales - coords))))
        checked += 1
        if checked >= 64:
            break

    result = {
        "samples_checked": checked,
        "max_abs_error": max(errors) if errors else None,
        "median_abs_error": float(np.median(errors)) if errors else None,
        "tolerance": 2e-6,
        "passed": bool(errors) and max(errors) <= 2e-6,
        "scope": "Extraction correctness only (identical calls, identical marker subset). Full-vs-masked coordinate shift is measured separately in consumer-mask-validation.json.",
    }
    (PAN / "extraction_parity.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    if not result["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
