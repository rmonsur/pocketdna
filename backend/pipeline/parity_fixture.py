"""Produce the Python-side truth for app/src/engine/parity.test.ts.

Runs parse_raw + engine.analyze on the mini fixture with FIXED resample indices
(dumped as base64 little-endian uint16) so the TS bootstrap can be checked exactly.
Also exports the mini panel in both JSON (float64) and the browser binary format.
Usage: python3 pipeline/parity_fixture.py <out_dir>
"""

from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

import numpy as np

from engine import EPOCHS, FIXTURE_PANEL, closest, encode, fit_weights, load_panel, project
from export_web_panel import export
from parse_raw import parse_raw

HERE = Path(__file__).resolve().parent
GENOME = HERE / "fixtures" / "mini-genome.txt"
SEED = 0
N_BOOT = 20


def main(argv: list[str]) -> None:
    if len(argv) != 2:
        raise SystemExit(__doc__)
    out = Path(argv[1])
    out.mkdir(parents=True, exist_ok=True)
    panel = load_panel(FIXTURE_PANEL)
    export(panel, out)

    text = GENOME.read_text()
    parsed = parse_raw("23andme", text)
    dosage, rows = encode(parsed.calls, panel["snps"])
    coords = project(dosage, rows, panel)
    rng = np.random.default_rng(SEED)
    picks = np.stack([rng.integers(0, len(rows), len(rows)) for _ in range(N_BOOT)])
    boot_coords = np.stack([project(dosage[p], rows[p], panel) for p in picks])

    epochs = {}
    for epoch in EPOCHS:
        cents = panel[f"src_{epoch}_C"]
        weights = fit_weights(coords, cents)
        boots = np.stack([fit_weights(bc, cents) for bc in boot_coords])
        epochs[epoch] = {
            "weights": [float(w) for w in weights],
            "low": [float(np.percentile(boots[:, i], 5)) for i in range(len(weights))],
            "high": [float(np.percentile(boots[:, i], 95)) for i in range(len(weights))],
            "closest": closest(coords, cents, panel[f"src_{epoch}_labels"]),
        }
    fixture = {
        "panel_id": str(panel["panel_id"]),
        "parse": {
            "vendor": parsed.vendor,
            "n_calls": len(parsed.calls),
            "n_lines": parsed.n_lines,
            "n_skipped": parsed.n_skipped,
            "n_nocall": parsed.n_nocall,
        },
        "n_markers_usable": int(len(rows)),
        "pc_coords": [float(x) for x in coords],
        "resample_u16_b64": base64.b64encode(picks.astype("<u2").tobytes()).decode(),
        "n_boot": N_BOOT,
        "epochs": epochs,
    }
    (out / "parity.json").write_text(json.dumps(fixture) + "\n")
    (out / "mini-genome.txt").write_text(text)
    print(f"wrote {out}/parity.json ({len(rows)} usable markers, {N_BOOT} boots)")


if __name__ == "__main__":
    main(sys.argv)
