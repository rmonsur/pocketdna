#!/usr/bin/env python3
"""Era-panel sanity: anno dates, allele-error injection, unmatched review aid.

1) Date sanity: distribution of anno 'Date mean BP' for matched samples per
   era (broad windows: bronze >3000 BP, middle 500-1500 BP, modern ~0/absent).
   Reported as a sanity distribution, never used as a filter here.
2) Allele-error injection: chip-masked reference samples with 1%/5% of calls
   flipped (0<->2), bundle projection vs full-data smartpca (training SD).
3) Review aid: top AADR Group-ID candidates for each unmatched era row
   (token overlap). For human decision only; nothing is auto-matched.
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dataset"
PAN = DATA / "interim/era-panels"
EXP = DATA / "interim/reference-validation/experimental-pca"
B = EXP / "bundle-v1"


def load_anno_dates() -> dict[str, float]:
    out = {}
    for name in ("v66.p1_1240K.aadr.PUB.anno", "v66.p1_compatibility_HO.aadr.PUB.anno"):
        with (DATA / name).open(newline="", encoding="utf-8", errors="replace") as handle:
            reader = csv.DictReader(handle, delimiter="\t")
            cols = reader.fieldnames or []
            date_col = next(c for c in cols if c.startswith("Date mean"))
            for r in reader:
                try:
                    out[r[cols[0]].strip()] = float(r[date_col])
                except (TypeError, ValueError):
                    continue
    return out


def main() -> None:
    dates = load_anno_dates()
    matches = list(csv.DictReader(open(PAN / "matches.csv")))
    windows = {"bronze": (3000, 9000), "middle": (400, 1600), "modern": (0, 120)}
    sanity = {}
    for era, (lo, hi) in windows.items():
        vals = [dates[m["genetic_id"]] for m in matches if m["era"] == era and m["genetic_id"] in dates]
        if vals:
            arr = np.array(vals)
            sanity[era] = {"n_dated": len(vals), "median_bp": float(np.median(arr)),
                           "frac_in_broad_window": float(((arr >= lo) & (arr <= hi)).mean())}
    print(json.dumps(sanity, indent=2))

    # Allele-error injection on the consumer chip mask
    manifest = json.loads((B / "manifest.json").read_text())
    weights = np.fromfile(B / "weights.f64", dtype="<f8").reshape(manifest["markers"], 25)
    means = np.fromfile(B / "means.f64", dtype="<f8")
    normalization = np.fromfile(B / "normalization.f64", dtype="<f8")
    scales = np.fromfile(B / "coordinate-scales.f64", dtype="<f8")
    eig, roles = {}, {}
    for line in (EXP / "pca.evec").open():
        if line.lstrip().startswith("#") or not line.strip():
            continue
        f = line.split()
        eig[f[0]] = np.array(f[1:26], dtype=np.float64)
        roles[f[0]] = f[-1]
    basis = sorted(s for s, r in roles.items() if r == "BASIS")
    sd = np.stack([eig[s] for s in basis]).std(axis=0)
    test = sorted(s for s, r in roles.items() if r == "TEST")
    ind = [line.split()[0] for line in (EXP / "frozen.ind").open() if line.strip()]
    snps = [line.split() for line in (EXP / "frozen.snp").open() if line.strip()]
    stride = (len(snps) + 3) // 4
    data = np.memmap(EXP / "frozen.geno", dtype=np.uint8, mode="r", offset=48, shape=(len(ind), stride))
    mi = np.arange(len(snps))
    shifts = ((3 - mi % 4) * 2).astype(np.uint8)
    calls_all = np.asarray((data[:, mi // 4] >> shifts) & 3)
    index = {sid: i for i, sid in enumerate(ind)}
    marker_ids = [r[0] for r in snps]
    present = set()
    with open(DATA / "genome_reshad_ monsur_n_v2_v3_Full_20171127205355.txt") as handle:
        for line in handle:
            if line.startswith("rs"):
                present.add(line.split("\t", 1)[0])
    chip = np.array([m in present for m in marker_ids])
    rng = np.random.default_rng(11)
    pick = [test[i] for i in np.linspace(0, len(test) - 1, 16, dtype=int)]
    injection = {}
    for rate in (0.01, 0.05):
        deltas = []
        for sid in pick:
            calls = calls_all[index[sid]].copy()
            obs_idx = np.where(chip & (calls != 3))[0]
            flip = rng.random(len(obs_idx)) < rate
            chosen = obs_idx[flip]
            calls[chosen] = 2 - calls[chosen]
            obs = chip & (calls != 3)
            values = (calls[obs].astype(np.float64) - means[obs]) * normalization[obs]
            beta, _, rank, _ = np.linalg.lstsq(weights[obs], values, rcond=None)
            if rank == 25:
                deltas.append(float(np.max(np.abs(beta * scales - eig[sid]) / sd)))
        injection[f"flip_{int(rate * 100)}pct"] = {
            "samples": len(deltas), "median_max_axis_delta_sd": float(np.median(deltas)),
            "p95_max_axis_delta_sd": float(np.quantile(deltas, 0.95)),
        }
    print(json.dumps(injection, indent=2))
    (PAN / "era_sanity.json").write_text(json.dumps({"date_sanity": sanity, "allele_error_injection": injection}, indent=2) + "\n")

    # Human-review aid for unmatched rows
    groups: set[str] = set()
    for name in ("v66.p1_1240K.aadr.PUB.anno", "v66.p1_compatibility_HO.aadr.PUB.anno"):
        with (DATA / name).open(newline="", encoding="utf-8", errors="replace") as handle:
            reader = csv.DictReader(handle, delimiter="\t")
            gcol = next(c for c in (reader.fieldnames or []) if c.startswith("Group ID"))
            for r in reader:
                groups.add(r[gcol].strip())

    def toks(text: str) -> set[str]:
        return {t for t in re.split(r"[^a-z0-9]+", text.lower()) if len(t) >= 3}

    group_list = sorted(groups)
    unmatched = list(csv.DictReader(open(PAN / "unmatched.csv")))
    with (PAN / "unmatched_review.csv").open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["era", "sample_id", "candidate_1", "candidate_2", "candidate_3", "decision (fill in)"])
        for row in unmatched:
            want = toks(row["sample_id"])
            scored = sorted(((len(want & toks(g)), g) for g in group_list), reverse=True)
            top = [g for score, g in scored if score >= 2][:3]
            writer.writerow([row["era"], row["sample_id"], *top, *([""] * (3 - len(top))), ""])
    print(f"review rows: {len(unmatched)}")


if __name__ == "__main__":
    main()
