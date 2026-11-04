#!/usr/bin/env python3
"""Consumer-mask validation for the PCA-25 bundle (BIOINFORMATICS 14.6).

Question: how far do bundle coordinates move when a sample is observed only
through consumer-like marker patterns, versus its full-data smartpca scores?

Prespecified acceptance: a mask condition is acceptable when the p95 of
per-sample max-axis |delta| (in basis training SD units) is <= 0.25.

Masks: (a) real consumer-file marker presence (rsIDs only from the builder's
export; no consumer calls are read or used), (b) chip mask plus seeded random
no-call drops of 10/30/50%, (c) chip mask plus one chromosome dropped at a
time. Samples: deterministic evenly spaced held-out TEST samples only.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "dataset/interim/reference-validation/experimental-pca"
B = P / "bundle-v1"
OUT = P / "consumer-mask-validation.json"
ACCEPT_P95 = 0.25


def load_calls() -> tuple[list[str], np.ndarray, list[str]]:
    ind = [line.split()[0] for line in (P / "frozen.ind").open() if line.strip()]
    snps = [line.split() for line in (P / "frozen.snp").open() if line.strip()]
    stride = (len(snps) + 3) // 4
    data = np.memmap(P / "frozen.geno", dtype=np.uint8, mode="r", offset=48, shape=(len(ind), stride))
    mi = np.arange(len(snps))
    shifts = ((3 - mi % 4) * 2).astype(np.uint8)
    calls = (data[:, mi // 4] >> shifts) & 3
    return ind, np.asarray(calls), snps


def main() -> None:
    manifest = json.loads((B / "manifest.json").read_text())
    weights = np.fromfile(B / "weights.f64", dtype="<f8").reshape(manifest["markers"], 25)
    means = np.fromfile(B / "means.f64", dtype="<f8")
    normalization = np.fromfile(B / "normalization.f64", dtype="<f8")
    scales = np.fromfile(B / "coordinate-scales.f64", dtype="<f8")

    eig: dict[str, np.ndarray] = {}
    roles: dict[str, str] = {}
    for line in (P / "pca.evec").open():
        if line.lstrip().startswith("#") or not line.strip():
            continue
        f = line.split()
        eig[f[0]] = np.array(f[1:26], dtype=np.float64)
        roles[f[0]] = f[-1]
    basis_ids = sorted(s for s, r in roles.items() if r == "BASIS")
    test_ids = sorted(s for s, r in roles.items() if r == "TEST")
    train = np.stack([eig[s] for s in basis_ids])
    sd = train.std(axis=0)

    ind, calls, snps = load_calls()
    index = {sid: i for i, sid in enumerate(ind)}
    marker_ids = [r[0] for r in snps]
    chrom = np.array([int(r[1]) for r in snps])

    consumer = ROOT / "dataset/genome_reshad_ monsur_n_v2_v3_Full_20171127205355.txt"
    present: set[str] = set()
    with consumer.open() as handle:
        for line in handle:
            if line.startswith("rs"):
                present.add(line.split("\t", 1)[0])
    chip_mask = np.array([m in present for m in marker_ids])
    print(f"chip markers present: {chip_mask.sum()} / {len(marker_ids)}")

    def project(sample_calls: np.ndarray, mask: np.ndarray) -> np.ndarray:
        obs = mask & (sample_calls != 3)
        values = (sample_calls[obs].astype(np.float64) - means[obs]) * normalization[obs]
        beta, _, rank, _ = np.linalg.lstsq(weights[obs], values, rcond=None)
        if rank != 25:
            raise ValueError("Rank-deficient masked projection")
        return beta * scales

    def deltas(sample_ids: list[str], mask_fn) -> dict:
        per_sample = []
        usable = []
        for sid in sample_ids:
            c = calls[index[sid]]
            coords = project(c, mask_fn(c))
            per_sample.append(np.max(np.abs(coords - eig[sid]) / sd))
            usable.append(int((mask_fn(c) & (c != 3)).sum()))
        arr = np.array(per_sample)
        return {
            "samples": len(sample_ids),
            "median_max_axis_delta_sd": float(np.median(arr)),
            "p95_max_axis_delta_sd": float(np.quantile(arr, 0.95)),
            "max_max_axis_delta_sd": float(arr.max()),
            "min_usable_markers": min(usable),
            "acceptable": bool(np.quantile(arr, 0.95) <= ACCEPT_P95),
        }

    rng = np.random.default_rng(20261105)
    pick = lambda ids, n: [ids[i] for i in np.linspace(0, len(ids) - 1, n, dtype=int)]

    results: dict[str, dict] = {}
    results["chip_mask"] = deltas(pick(test_ids, 64), lambda c: chip_mask)
    for rate in (0.10, 0.30, 0.50):
        drop = rng.random(len(marker_ids)) < rate
        results[f"chip_plus_{int(rate * 100)}pct_nocall"] = deltas(
            pick(test_ids, 32), lambda c, d=drop: chip_mask & ~d
        )
    chr_results = {}
    for chromosome in range(1, 23):
        keep = chip_mask & (chrom != chromosome)
        chr_results[f"chr{chromosome}"] = deltas(pick(test_ids, 16), lambda c, k=keep: k)
    worst_chr = max(chr_results.items(), key=lambda kv: kv[1]["p95_max_axis_delta_sd"])
    results["chromosome_dropout_worst"] = {"chromosome": worst_chr[0], **worst_chr[1]}
    results["chromosome_dropout_all_acceptable"] = all(v["acceptable"] for v in chr_results.values())

    report = {
        "status": "experimental validation; not a production gate sign-off",
        "acceptance": f"p95 per-sample max-axis |delta| <= {ACCEPT_P95} basis-training SD",
        "chip_mask_markers": int(chip_mask.sum()),
        "results": results,
        "limitations": "Reference samples under synthetic masks; one real consumer marker set; no strand/build errors injected; scales fitted on 16 basis samples.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
