"""Contract tests: shared JSON schemas parse, fixtures validate. No pytest needed."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.schemas import GatekeeperOut, ParseOut, Reel
from agents.runner import _validate_a5

ROOT = Path(__file__).resolve().parents[2]
FIX = ROOT / "demo" / "fixtures"


def test_shared_schemas_are_valid_json() -> None:
    for name in ("job.schema.json", "reel.schema.json"):
        json.loads((ROOT / "shared" / name).read_text())


def test_sample_reel_validates() -> None:
    reel = Reel.model_validate(json.loads((FIX / "sample-reel.json").read_text()))
    assert len(reel.beats) == 7
    assert 90 <= reel.duration_s <= 150
    for beat in reel.beats:
        assert beat.t_end > beat.t_start, beat.id
        assert len(beat.copy) <= 140, beat.id


def test_sample_parse_validates() -> None:
    parsed = ParseOut.model_validate(json.loads((FIX / "sample-parse.json").read_text()))
    assert abs(sum(s.weight for s in parsed.shares) - 1.0) < 0.01


def test_gatekeeper_r1_fixture() -> None:
    out = GatekeeperOut.model_validate(json.loads((FIX / "gatekeeper-r1.json").read_text()))
    assert out.route == "rejection" and out.rejection == "R1"


def test_a5_pass_key_remap() -> None:
    assert _validate_a5({"pass": True, "violations": []})["passed"] is True
    assert _validate_a5({"pass": False, "violations": [{"rule": "x", "fix": "y"}]})["passed"] is False


if __name__ == "__main__":
    for name, fn in sorted({k: v for k, v in globals().items() if k.startswith("test_")}.items()):
        fn()
        print(f"PASS {name}")
