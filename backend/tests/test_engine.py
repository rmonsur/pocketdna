"""Engine tests on the committed mini panel: real recovery, determinism, parsers."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np

from pipeline.engine import analyze, encode, load_panel, project
from pipeline.parse_raw import parse_23andme, parse_ancestry

FIX = Path(__file__).resolve().parents[1] / "pipeline" / "fixtures"


def _panel_and_calls():
    panel = load_panel(FIX / "mini-panel.npz")
    parsed = parse_23andme((FIX / "mini-genome.txt").read_text())
    return panel, parsed


def test_parse_mini_genome() -> None:
    parsed = parse_23andme((FIX / "mini-genome.txt").read_text())
    assert parsed.n_lines == 2000 and len(parsed.calls) == 2000 and parsed.n_nocall == 0


def test_projection_exact_on_continuous_data() -> None:
    panel, _ = _panel_and_calls()
    known = np.array([1.5, -2.0, 0.5, 1.0, -0.5])
    dosage = panel["mean"] + panel["V"] @ known
    assert np.allclose(project(dosage, np.arange(len(dosage)), panel), known, atol=1e-8)


def test_projection_recovers_truth() -> None:
    # Discrete {0,1,2} dosages carry quantization noise sigma ~= 0.3 per coord;
    # RMS error must sit at that floor, not below it (fixed fixture: deterministic).
    panel, parsed = _panel_and_calls()
    truth = json.loads((FIX / "truth.json").read_text())
    dosage, rows = encode(parsed.calls, panel["snps"])
    assert len(rows) == 2000
    coords = project(dosage, rows, panel)
    rms = float(np.sqrt(np.mean((coords - np.array(truth["pc"])) ** 2)))
    assert rms < 0.6, (rms, coords)


def test_weights_recover_truth() -> None:
    panel, parsed = _panel_and_calls()
    truth = json.loads((FIX / "truth.json").read_text())
    result = analyze(parsed.calls, panel, seed=42, n_boot=50)
    assert result["panel_id"] == "mini-fixture-v1"
    assert result["n_markers_usable"] == 2000
    for epoch in ("bronze", "middle", "modern"):
        weights = [s["weight"] for s in result["epochs"][epoch]["shares"]]
        assert abs(sum(weights) - 1.0) < 0.01
        assert np.allclose(weights, truth["weights"], atol=0.15), (epoch, weights)
        for share in result["epochs"][epoch]["shares"]:
            assert share["low"] <= share["weight"] <= share["high"]
    assert len(result["epochs"]["bronze"]["closest"]) == 3


def test_bootstrap_deterministic() -> None:
    panel, parsed = _panel_and_calls()
    first = analyze(parsed.calls, panel, seed=7, n_boot=20)
    second = analyze(parsed.calls, panel, seed=7, n_boot=20)
    assert first == second


def test_malformed_lines_counted() -> None:
    text = "\n".join([
        "# comment",
        "rsid\tchromosome\tposition\tgenotype",
        "rs1\t1\t100\tAA",
        "rs2\t1\t200\t--",
        "rs3\t1\t300\tA",
        "rs4\t1\t400\tID",
        "rs5\t1\t500\tAC",
        "garbage line",
        "rs6\t1\t600\tNN",
    ])
    parsed = parse_23andme(text)
    assert parsed.calls == {"rs1": "AA", "rs5": "AC"}
    assert parsed.n_lines == 6 and parsed.n_nocall == 4 and parsed.n_skipped == 1


def test_ancestry_parse() -> None:
    text = "\n".join([
        "RsID\tAlleles\tChromosome\tPosition",
        "rs1\tA/A\t1\t100",
        "rs2\t-/-\t1\t200",
        "rs3\tG/C\t1\t300",
    ])
    parsed = parse_ancestry(text)
    assert parsed.calls == {"rs1": "AA", "rs3": "GC"}
    assert parsed.n_nocall == 1


def test_too_few_markers_raises() -> None:
    panel, _ = _panel_and_calls()
    try:
        analyze({"rs999": "AA"}, panel, seed=1)
    except ValueError:
        return
    raise SystemExit("expected ValueError for sparse markers")


if __name__ == "__main__":
    for name, fn in sorted({k: v for k, v in globals().items() if k.startswith("test_")}.items()):
        fn()
        print(f"PASS {name}")


def test_missing_marker_projection_has_no_artificial_coverage_multiplier() -> None:
    panel = {"mean": np.zeros(4), "V": np.array([[1., 0.], [0., 1.], [1., 1.], [1., -1.]])}
    truth = np.array([0.3, 0.7])
    indices = np.array([0, 2, 3])
    assert np.allclose(project(panel["V"][indices] @ truth, indices, panel), truth, atol=1e-12)


def test_invalid_alleles_are_excluded() -> None:
    dosage, rows = encode({"rs1": "TT", "rs2": "AG"}, np.array(["rs1:A:C", "rs2:A:G"]))
    assert rows.tolist() == [1] and dosage.tolist() == [1.0]


def test_simplex_fit_satisfies_exact_constraint() -> None:
    from pipeline.engine import fit_weights
    # The nearest feasible mixture is a vertex even when the target lies outside the simplex.
    weights = fit_weights(np.array([3., -1.]), np.eye(2))
    assert np.allclose(weights, [1., 0.], atol=1e-9)
    assert abs(float(weights.sum()) - 1.0) < 1e-9 and np.all(weights >= 0)


def test_simplex_fit_recovers_interior_and_boundary_solutions() -> None:
    from pipeline.engine import fit_weights
    vertices = np.array([[0., 0.], [1., 0.], [0., 1.]])
    assert np.allclose(fit_weights(np.array([.25, .45]), vertices), [.30, .25, .45], atol=1e-8)
    assert np.allclose(fit_weights(np.array([-.2, .7]), vertices), [.30, 0., .7], atol=1e-8)
