"""The committed TS parity fixture must match what the Python engine produces today.

If engine.py or parse_raw.py changes, regenerate with
  python3 pipeline/parity_fixture.py ../app/src/engine/fixtures
and rerun `npm run test:engine` in app/.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
COMMITTED = BACKEND.parent / "app" / "src" / "engine" / "fixtures"
FILES = ("parity.json", "panel.meta.json", "panel.f32", "mini-genome.txt")


def test_committed_parity_fixture_is_current() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [sys.executable, str(BACKEND / "pipeline" / "parity_fixture.py"), tmp],
            check=True, cwd=BACKEND, capture_output=True,
        )
        for name in FILES:
            fresh = (Path(tmp) / name).read_bytes()
            committed = (COMMITTED / name).read_bytes()
            if name == "parity.json":
                assert json.loads(fresh) == json.loads(committed), "parity.json drifted; regenerate"
            else:
                assert fresh == committed, f"{name} drifted; regenerate"


if __name__ == "__main__":
    test_committed_parity_fixture_is_current()
    print("PASS test_committed_parity_fixture_is_current")
