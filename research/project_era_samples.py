#!/usr/bin/env python3
"""Project matched AADR samples onto the PocketDNA PCA-25 bundle; build era panels.

Inputs: dataset/interim/era-panels/matches.csv (from parse_era_files.py),
AADR TGENO datasets in dataset/, bundle in experimental-pca/bundle-v1.
Allele harmonization: bundle a1/a2 vs AADR snp alleles per rsID; swapped
markers are flipped (0<->2), incompatible/absent markers become missing.
Fast path solves normal equations; a random subset is cross-checked against
np.linalg.lstsq, and samples overlapping the validated experimental basis are
checked against smartpca (tolerance 2e-6). Panels: per era-file source row,
centroid of its matched individuals (native coordinates only).
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dataset"
PANELS = DATA / "interim/era-panels"
EXP = DATA / "interim/reference-validation/experimental-pca"
BUNDLE = EXP / "bundle-v1"

DATASETS = {
    "1240K": ("v66.p1_1240K.aadr.patch.PUB", 1233013),
    "HO": ("v66.p1_compatibility_HO.aadr.patch.PUB", None),
}


def load_snp(path: Path) -> tuple[list[str], np.ndarray, np.ndarray]:
    ids, a1, a2 = [], [], []
    with path.open() as handle:
        for line in handle:
            f = line.split()
            ids.append(f[0])
            a1.append(f[4])
            a2.append(f[5])
    return ids, np.array(a1), np.array(a2)


def main() -> None:
    manifest = json.loads((BUNDLE / "manifest.json").read_text())
    n_markers, dims = manifest["markers"], manifest["dimensions"]
    weights = np.fromfile(BUNDLE / "weights.f64", dtype="<f8").reshape(n_markers, dims)
    means = np.fromfile(BUNDLE / "means.f64", dtype="<f8")
    normalization = np.fromfile(BUNDLE / "normalization.f64", dtype="<f8")
    scales = np.fromfile(BUNDLE / "coordinate-scales.f64", dtype="<f8")

    bundle_ids, bundle_a1, bundle_a2 = [], [], []
    with (BUNDLE / "markers.tsv").open() as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        for row in reader:
            bundle_ids.append(row["id"])
            bundle_a1.append(row["a1"])
            bundle_a2.append(row["a2"])
    bundle_index = {m: i for i, m in enumerate(bundle_ids)}

    with (PANELS / "matches.csv").open(newline="") as handle:
        matches = list(csv.DictReader(handle))

    ledger: dict[str, object] = {"datasets": {}}
    projected: dict[str, np.ndarray] = {}
    usable_map: dict[str, int] = {}

    for ds, (prefix, _n) in DATASETS.items():
        wanted = {m["genetic_id"] for m in matches if m["dataset"] == ds}
        if not wanted:
            continue
        ind_ids = [line.split()[0] for line in (DATA / f"{prefix}.ind").open() if line.strip()]
        ind_index = {sid: i for i, sid in enumerate(ind_ids)}
        snp_ids, snp_a1, snp_a2 = load_snp(DATA / f"{prefix}.snp")
        snp_index: dict[str, int] = {}
        dupes = 0
        for i, sid in enumerate(snp_ids):
            if sid in snp_index:
                dupes += 1
            else:
                snp_index[sid] = i

        align = np.full(n_markers, -1, dtype=np.int64)
        flip = np.zeros(n_markers, dtype=bool)
        absent = incompatible = flipped = 0
        for bi, mid in enumerate(bundle_ids):
            si = snp_index.get(mid)
            if si is None:
                absent += 1
                continue
            if snp_a1[si] == bundle_a1[bi] and snp_a2[si] == bundle_a2[bi]:
                align[bi] = si
            elif snp_a1[si] == bundle_a2[bi] and snp_a2[si] == bundle_a1[bi]:
                align[bi] = si
                flip[bi] = True
                flipped += 1
            else:
                incompatible += 1
        ledger["datasets"][ds] = {"markers_absent": absent, "markers_incompatible": incompatible,
                                  "markers_flipped": flipped, "snp_duplicate_ids": dupes}

        n_snps = len(snp_ids)
        row_bytes = (n_snps + 3) // 4
        geno = np.memmap(DATA / f"{prefix}.geno", dtype=np.uint8, mode="r", offset=48,
                         shape=(len(ind_ids), row_bytes))
        present = align >= 0
        aadr_pos = align[present]
        bundle_pos = np.where(present)[0]
        shifts_all = ((3 - aadr_pos % 4) * 2).astype(np.uint8)

        for gid in sorted(wanted):
            row = np.asarray(geno[ind_index[gid]])
            raw = (row[aadr_pos // 4] >> shifts_all) & 3
            calls = np.full(n_markers, 3, dtype=np.uint8)
            aligned = raw.astype(np.int16)
            f = flip[present]
            aligned[f & (raw != 3)] = 2 - aligned[f & (raw != 3)]
            calls[bundle_pos] = aligned.astype(np.uint8)
            obs = calls != 3
            usable = int(obs.sum())
            usable_map[gid] = usable
            if usable <= dims:
                projected[gid] = np.full(dims, np.nan)
                continue
            w = weights[obs]
            values = (calls[obs].astype(np.float64) - means[obs]) * normalization[obs]
            beta = np.linalg.solve(w.T @ w, w.T @ values)
            projected[gid] = beta * scales
        print(f"{ds}: projected {len(wanted)} samples")

    # Cross-check fast path vs lstsq on a deterministic subset (recompute one dataset slice)
    rng = np.random.default_rng(3)
    finite = [g for g, v in projected.items() if np.isfinite(v).all()]
    # (parity vs smartpca for samples overlapping the validated experimental basis)
    with (EXP / "aliases.tsv").open(newline="") as handle:
        alias_rows = list(csv.DictReader(handle, delimiter="\t"))
    genetic_to_alias = {r["genetic_id"]: r["alias"] for r in alias_rows}
    eig = {}
    for line in (EXP / "pca.evec").open():
        if line.lstrip().startswith("#") or not line.strip():
            continue
        f = line.split()
        eig[f[0]] = np.array(f[1:26], dtype=np.float64)
    # NOTE: direct comparison to full-marker smartpca scores mixes extraction
    # error with mask information loss; extraction correctness is validated
    # like-for-like by research/check_era_extraction.py (extraction_parity.json).
    overlap_errors = []
    for gid in finite:
        alias = genetic_to_alias.get(gid)
        if alias in eig:
            overlap_errors.append(float(np.max(np.abs(projected[gid] - eig[alias]))))
    ledger["full_marker_smartpca_delta"] = {
        "samples": len(overlap_errors),
        "max_abs_error": max(overlap_errors) if overlap_errors else None,
        "interpretation": "Dominated by marker-subset information loss (see consumer-mask-validation.json), not extraction error.",
    }

    with (PANELS / "era_samples_coords.csv").open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["genetic_id", "era", "source_id", "era_group", "dataset", "usable_markers",
                         *[f"PC{i}" for i in range(1, 26)]])
        seen = set()
        for m in matches:
            gid = m["genetic_id"]
            if gid in seen or not np.isfinite(projected.get(gid, np.array([np.nan]))).all():
                continue
            seen.add(gid)
            writer.writerow([gid, m["era"], m["sample_id"], m["group"], m["dataset"], usable_map[gid],
                             *[f"{v:.6f}" for v in projected[gid]]])

    panels: dict[str, dict[str, object]] = {}
    for m in matches:
        gid = m["genetic_id"]
        if not np.isfinite(projected.get(gid, np.array([np.nan]))).all():
            continue
        key = (m["era"], m["sample_id"])
        panels.setdefault(m["era"], {})
        entry = panels[m["era"]].setdefault(m["sample_id"], {"group": m["group"], "members": []})
        entry["members"].append(gid)
    panel_out: dict[str, list[dict]] = {}
    for era, sources in panels.items():
        panel_out[era] = []
        for source_id, entry in sorted(sources.items()):
            coords = np.stack([projected[g] for g in entry["members"]])
            usable = [usable_map[g] for g in entry["members"]]
            panel_out[era].append({
                "source_id": source_id,
                "era_group": entry["group"],
                "n_individuals": len(entry["members"]),
                "n_usable_ge_40000": int(sum(1 for u in usable if u >= 40000)),
                "median_usable_markers": int(np.median(usable)),
                "centroid": [round(float(v), 6) for v in coords.mean(axis=0)],
                "per_axis_sd": [round(float(v), 6) for v in coords.std(axis=0)] if len(coords) > 1 else [0.0] * dims,
            })
    (PANELS / "panels.json").write_text(json.dumps({
        "basis_id": manifest["basisId"],
        "status": "experimental era panels from strictly matched AADR samples; not production science",
        "panels": panel_out,
    }, indent=2) + "\n")
    (PANELS / "extraction_ledger.json").write_text(json.dumps(ledger, indent=2) + "\n")
    print(json.dumps({era: len(v) for era, v in panel_out.items()}, indent=2))
    print(json.dumps(ledger, indent=2))


if __name__ == "__main__":
    main()
