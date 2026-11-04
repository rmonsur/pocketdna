#!/usr/bin/env python3
"""Held-out group performance + mixture-solver oracle fixture (BIOINFORMATICS 11/14).

A) Per-source-group bundle projection error on held-out TEST samples (full
calls), vs smartpca: is accuracy uniform across populations?
B) A deterministic mixture problem solved by the Python engine (scipy SLSQP);
the fixture lets the TypeScript solver be checked against it exactly.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "dataset/interim/reference-validation/experimental-pca"
B = P / "bundle-v1"


def main() -> None:
    manifest = json.loads((B / "manifest.json").read_text())
    weights = np.fromfile(B / "weights.f64", dtype="<f8").reshape(manifest["markers"], 25)
    means = np.fromfile(B / "means.f64", dtype="<f8")
    normalization = np.fromfile(B / "normalization.f64", dtype="<f8")
    scales = np.fromfile(B / "coordinate-scales.f64", dtype="<f8")

    eig: dict[str, np.ndarray] = {}
    for line in (P / "pca.evec").open():
        if line.lstrip().startswith("#") or not line.strip():
            continue
        f = line.split()
        eig[f[0]] = np.array(f[1:26], dtype=np.float64)

    with (P / "split.tsv").open(newline="") as handle:
        rows = list(csv.DictReader(handle, delimiter="\t"))
    ind = [line.split()[0] for line in (P / "frozen.ind").open() if line.strip()]
    # frozen.ind and pca.evec use alias IDs; split.tsv uses genetic IDs.
    with (P / "aliases.tsv").open(newline="") as handle:
        alias_rows = list(csv.DictReader(handle, delimiter="\t"))
    to_alias = {r["genetic_id"]: r["alias"] for r in alias_rows}
    snps = [line.split() for line in (P / "frozen.snp").open() if line.strip()]
    stride = (len(snps) + 3) // 4
    data = np.memmap(P / "frozen.geno", dtype=np.uint8, mode="r", offset=48, shape=(len(ind), stride))
    mi = np.arange(len(snps))
    shifts = ((3 - mi % 4) * 2).astype(np.uint8)
    calls = np.asarray((data[:, mi // 4] >> shifts) & 3)
    index = {sid: i for i, sid in enumerate(ind)}

    test = [r for r in rows if r["role"] == "test" and to_alias.get(r["genetic_id"]) in eig]
    pick = [test[i] for i in np.linspace(0, len(test) - 1, 96, dtype=int)]
    groups: dict[str, list[float]] = {}
    for row in pick:
        alias_id = to_alias[row["genetic_id"]]
        sid = alias_id
        if alias_id not in index:
            continue
        c = calls[index[alias_id]]
        obs = c != 3
        values = (c[obs].astype(np.float64) - means[obs]) * normalization[obs]
        beta, _, rank, _ = np.linalg.lstsq(weights[obs], values, rcond=None)
        if rank != 25:
            continue
        err = float(np.max(np.abs(beta * scales - eig[sid])))
        groups.setdefault(row["source_group"], []).append(err)

    summary = {
        g: {"n": len(v), "max_abs_error": max(v), "rmse": float(np.sqrt(np.mean(np.square(v))))}
        for g, v in sorted(groups.items())
    }
    worst = max(summary.items(), key=lambda kv: kv[1]["max_abs_error"])
    report_a = {
        "samples_evaluated": int(sum(v["n"] for v in summary.values())),
        "groups": summary,
        "worst_group": worst[0],
        "note": "Full-call projection vs smartpca; numerical parity by group, not ancestry accuracy.",
    }
    (P / "group-performance.json").write_text(json.dumps(report_a, indent=2) + "\n")
    print(json.dumps(report_a, indent=2))

    # B) mixture oracle fixture via the Python engine itself
    import sys

    sys.path.insert(0, str(ROOT / "backend"))
    from pipeline.engine import fit_weights  # noqa: E402

    rng = np.random.default_rng(7)
    centroids = rng.normal(size=(6, 25))
    truth = np.array([0.4, 0.25, 0.2, 0.15, 0.0, 0.0])
    target = truth @ centroids + rng.normal(scale=0.001, size=25)
    solved = fit_weights(target, centroids)
    fixture = {
        "centroids": centroids.tolist(),
        "target": target.tolist(),
        "python_weights": solved.tolist(),
        "tolerance": 0.01,
    }
    (P / "mixture-oracle.json").write_text(json.dumps(fixture, indent=2) + "\n")
    print("mixture oracle fixture written; python weights:", np.round(solved, 4).tolist())


if __name__ == "__main__":
    main()
