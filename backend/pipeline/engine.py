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
from scipy.optimize import minimize

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
    """Count valid panel ALT alleles; reject incompatible calls rather than guessing."""
    dosage: list[float] = []
    rows: list[int] = []
    for i, spec in enumerate(snps.tolist()):
        rsid, ref, alt = spec.split(":")
        geno = calls.get(rsid)
        if geno is None or len(geno) != 2 or any(base not in (ref, alt) for base in geno):
            continue
        dosage.append(float(geno.count(alt)))
        rows.append(i)
    return np.array(dosage), np.array(rows, dtype=int)


def project(dosage: np.ndarray, rows: np.ndarray, panel: dict) -> np.ndarray:
    """Solve on observed loci; do not apply an unvalidated coverage multiplier."""
    valid_v = panel["V"][rows]
    centered = dosage - panel["mean"][rows]
    coords, _res, rank, singular_values = np.linalg.lstsq(valid_v, centered, rcond=None)
    if rank != valid_v.shape[1] or not len(singular_values) or singular_values[-1] <= singular_values[0] * 1e-10:
        raise ValueError("projection is rank deficient or ill-conditioned")
    return coords


def fit_weights(coords: np.ndarray, centroids: np.ndarray) -> np.ndarray:
    """Minimize squared residual with nonnegative weights that sum exactly to one."""
    matrix = np.asarray(centroids, dtype=float)
    target = np.asarray(coords, dtype=float)
    if matrix.ndim != 2 or matrix.shape[0] == 0 or matrix.shape[1] != target.size:
        raise ValueError("invalid mixture dimensions")
    if not np.isfinite(matrix).all() or not np.isfinite(target).all():
        raise ValueError("non-finite mixture inputs")
    def objective(weights: np.ndarray) -> float:
        residual = matrix.T @ weights - target
        return float(0.5 * residual @ residual)
    def jacobian(weights: np.ndarray) -> np.ndarray:
        return matrix @ (matrix.T @ weights - target)
    result = minimize(objective, np.full(matrix.shape[0], 1.0 / matrix.shape[0]),
                      jac=jacobian, method="SLSQP", bounds=[(0.0, 1.0)] * matrix.shape[0],
                      constraints={"type": "eq", "fun": lambda w: float(w.sum() - 1.0),
                                   "jac": lambda w: np.ones_like(w)},
                      options={"ftol": 1e-12, "maxiter": 1000})
    if not result.success or not np.isfinite(result.x).all() or abs(result.x.sum() - 1.0) > 1e-8 or np.any(result.x < -1e-9):
        raise ValueError("constrained mixture fit did not converge")
    return result.x


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

    # Resample markers once; the projection is epoch-independent, so the three
    # epochs share the same resamples and their intervals are directly comparable.
    boot_coords = np.zeros((n_boot, len(coords)))
    for b in range(n_boot):
        pick = rng.integers(0, len(rows), len(rows))
        boot_coords[b] = project(dosage[pick], rows[pick], panel)

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
        boots = np.stack([fit_weights(bc, cents) for bc in boot_coords])
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
