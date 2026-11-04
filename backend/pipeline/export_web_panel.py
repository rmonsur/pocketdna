"""Export a panel .npz to the browser format: panel.meta.json + panel.f32.

panel.f32 is little-endian float32: mean (M) followed by V (M*K, row-major).
The meta file carries everything else (snps, sources, centroids as float64 JSON).
Usage: python3 pipeline/export_web_panel.py <panel.npz> <out_dir>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

from engine import EPOCHS, load_panel


def export(panel: dict, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    mean = np.asarray(panel["mean"], dtype=np.float64)
    loadings = np.asarray(panel["V"], dtype=np.float64)
    n_snps, n_pcs = loadings.shape
    meta = {
        "panel_id": str(panel["panel_id"]),
        "n_snps": int(n_snps),
        "n_pcs": int(n_pcs),
        "snps": [str(s) for s in panel["snps"].tolist()],
        "epochs": {
            epoch: {
                "ids": [str(x) for x in panel[f"src_{epoch}_ids"].tolist()],
                "labels": [str(x) for x in panel[f"src_{epoch}_labels"].tolist()],
                "centroids": np.asarray(panel[f"src_{epoch}_C"], dtype=np.float64).tolist(),
            }
            for epoch in EPOCHS
        },
    }
    (out_dir / "panel.meta.json").write_text(json.dumps(meta) + "\n")
    vec = np.concatenate([mean, loadings.reshape(-1)]).astype("<f4")
    (out_dir / "panel.f32").write_bytes(vec.tobytes())


def main(argv: list[str]) -> None:
    if len(argv) != 3:
        raise SystemExit(__doc__)
    export(load_panel(Path(argv[1])), Path(argv[2]))
    print(f"wrote {argv[2]}/panel.meta.json + panel.f32")


if __name__ == "__main__":
    main(sys.argv)
