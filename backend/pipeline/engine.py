"""Tier 2 deep-time engine: project genotypes onto the panel eigenspace,
then per-epoch constrained mixture fits. Pure NumPy/SciPy, no agents, no math by LLM.

Panel .npz keys: snps ("rs:REF:ALT", harmonized, palindromic dropped at build),
mean (M,), V (M,K orthonormal loadings), per epoch src_<e>_ids/_labels/_C (S,K
centroids), panel_id, aadr_version, n_ref.
"""

from __future__ import annotations

import os
from pathlib import Path

import numpy as np
from scipy.optimize import nnls

EPOCHS = ("bronze", "middle", "modern")

FIXTURE_PANEL = Path(__file__).resolve().parent / "fixtures" / "mini-panel.npz"


class PanelMissing(RuntimeError):
    pass


def panel_path() -> Path:
    override = os.environ.get("POCKETDNA_PANEL_PATH", "/data/aadr-panel.npz")
    path = Path(override)
    if path.exists():
        return path
    if os.environ.get("ALLOW_FIXTURE_PANEL", "") == "1" and FIXTURE_PANEL.exists():
        return FIXTURE_PANEL
    raise PanelMissing(
        "reference panel not built. Run pipeline/build_panel.py on the AADR release, "
        "or set ALLOW_FIXTURE_PANEL=1 for the labeled demo panel."
    )


def load_panel(path: Path | None = None) -> dict:
    path = path or panel_path()
    raw = np.load(path, allow_pickle=False)
    panel = {key: raw[key] for key in raw.files}
    for key in ("snps", "mean", "V", "panel_id"):
        if key not in panel:
            raise PanelMissing(f"panel {path} missing {key}")
    return panel


def encode(calls: dict[str, str], snps: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Alt-allele dosages over panel SNPs present in calls. Returns (dosage, row_index)."""
    dosage: list[float] = []
    rows: list[int] = []
    for i, spec in enumerate(snps.tolist()):
        rsid, _ref, alt = spec.split(":")
        geno = calls.get(rsid)
        if geno is None:
            continue
        dosage.append(float(geno.count(alt)))
        rows.append(i)
    return np.array(dosage), np.array(rows)


def project(dosage: np.ndarray, rows: np.ndarray, panel: dict) -> np.ndarray:
    """Least-squares projection (lsqproject-style) + missing-data shrinkage."""
    valid_v = panel["V"][rows]
    centered = dosage - panel["mean"][rows]
    coords, _res, _rank, _sv = np.linalg.lstsq(valid_v, centered, rcond=None)
    return coords * (len(panel["mean"]) / max(len(rows), 1))


def fit_weights(coords: np.ndarray, centroids: np.ndarray, strength: float = 10.0) -> np.ndarray:
    """Constrained NNLS: w >= 0, sum w = 1 (equality via augmented row)."""
    mat = np.vstack([centroids.T, strength * np.ones((1, centroids.shape[0]))])
    target = np.append(coords, strength)
    weights, _res = nnls(mat, target)
    total = weights.sum()
    return weights / total if total > 0 else np.full_like(weights, 1 / len(weights))


def closest(coords: np.ndarray, centroids: np.ndarray, labels: np.ndarray, k: int = 3) -> list[dict]:
    dists = np.linalg.norm(centroids - coords, axis=1)
    order = np.argsort(dists)[:k]
    return [{"label": str(labels[i]), "distance": round(float(dists[i]), 4)} for i in order]


def analyze(
    calls: dict[str, str],
    panel: dict,
    *,
    seed: int = 0,
    n_boot: int = 200,
) -> dict:
    dosage, rows = encode(calls, panel["snps"])
    if len(rows) < 50:
        raise ValueError(f"only {len(rows)} usable markers; need >= 50")
    coords = project(dosage, rows, panel)
    rng = np.random.default_rng(seed)
    out: dict = {
        "panel_id": str(panel["panel_id"]),
        "n_markers_total": int(len(calls)),
        "n_markers_usable": int(len(rows)),
        "pc_coords": [round(float(x), 4) for x in coords],
        "epochs": {},
    }
    for epoch in EPOCHS:
        cents = panel[f"src_{epoch}_C"]
        ids = panel[f"src_{epoch}_ids"].tolist()
        labels = panel[f"src_{epoch}_labels"]
        weights = fit_weights(coords, cents)
        boots = np.zeros((n_boot, len(weights)))
        for b in range(n_boot):
            pick = rng.integers(0, len(rows), len(rows))
            boot_coords = project(dosage[pick], rows[pick], panel)
            boots[b] = fit_weights(boot_coords, cents)
        shares = [
            {
                "id": str(ids[i]),
                "label": str(labels[i]),
                "weight": round(float(weights[i]), 4),
                "low": round(float(np.percentile(boots[:, i], 5)), 4),
                "high": round(float(np.percentile(boots[:, i], 95)), 4),
            }
            for i in range(len(weights))
        ]
        out["epochs"][epoch] = {"shares": shares, "closest": closest(coords, cents, labels)}
    return out
