"""API tests: sample endpoint live; Tier 1/2 orchestration with mocked agents (offline)."""

import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import api.store as store

store.DB_PATH = Path(tempfile.mkdtemp()) / "t.db"

from api.jobs import run_tier1, run_tier2  # noqa: E402
from api.store import create_job  # noqa: E402

try:
    from api.main import app  # noqa: E402  (needs python-multipart for UploadFile routes)

    HAS_APP = True
except RuntimeError:
    HAS_APP = False
from muse.client import CallResult  # noqa: E402
from pipeline.engine import PanelMissing  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
FIX = ROOT / "demo" / "fixtures"
PIPEFIX = Path(__file__).resolve().parents[1] / "pipeline" / "fixtures"


def _mock(data: dict) -> CallResult:
    return CallResult(data=data, model="mock", input_tokens=0, output_tokens=0,
                      cost_usd=0.0, cached=True)


def _script() -> dict:
    return {
        "a0": {"vendor": "23andme", "report_type": "ancestry_composition",
               "route": "tier1", "rejection": None, "confidence": 0.99},
        "a1": json.loads((FIX / "sample-parse.json").read_text()),
        "a2": {"claims": [{"claim": "c", "explainer": "e",
                           "citation_ids": ["c-steppe-haak2015"], "epoch": "bronze"}]},
        "a3": json.loads((FIX / "sample-reel.json").read_text()),
        "a4": {"picks": []},
        "a5": {"passed": True, "violations": []},
    }


def test_sample_endpoint() -> None:
    if not HAS_APP:
        print("SKIP test_sample_endpoint (pip3 install python-multipart, then rerun)")
        return
    from fastapi.testclient import TestClient

    client = TestClient(app)
    resp = client.get("/v1/sample/reel")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] and len(body["data"]["beats"]) == 7


def test_tier1_happy_path() -> None:
    script = _script()
    create_job("t1", "tier1", "queued")
    with patch("api.jobs.run_agent", side_effect=lambda name, **kw: _mock(script[name])):
        body = json.loads(run_tier1("t1", b"fake-image-bytes").body)
    assert body["ok"] and body["data"]["state"] == "done"
    assert len(body["data"]["reel"]["beats"]) == 7


def test_job_status_with_events_is_200() -> None:
    """Fix 1: events carry job_id so JobStatus validates (processing screen polls this)."""
    if not HAS_APP:
        return
    from fastapi.testclient import TestClient

    store.create_job("gj", "tier1", "running")
    store.add_event("gj", 1, "Reading your results", "muse-spark-1.3", "running")
    res = TestClient(app).get("/v1/jobs/gj")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["ok"] is True
    assert body["data"]["events"][0]["job_id"] == "gj"


def test_tier1_a1_error_branch_rejects_r2() -> None:
    """Fix 3: A1 may answer {"error": "R2"}; it must surface as a rejected job, not R4."""
    from agents.runner import AGENT_DEFS

    validate = AGENT_DEFS["a1"][2]
    assert validate({"error": "R2"}) == {"error": "R2"}
    script = _script()
    script["a1"] = {"error": "R2"}
    create_job("t1e", "tier1", "queued")
    with patch("api.jobs.run_agent", side_effect=lambda name, **kw: _mock(script[name])):
        body = json.loads(run_tier1("t1e", b"fake-image-bytes").body)
    assert body["data"]["state"] == "rejected" and body["data"]["rejection"] == "R2"
    assert "composition screen" in body["data"]["message"]


def test_tier1_r1_rejection() -> None:
    script = _script()
    script["a0"] = {"vendor": "23andme", "report_type": "health",
                    "route": "rejection", "rejection": "R1", "confidence": 0.98}
    create_job("t1r", "tier1", "queued")
    with patch("api.jobs.run_agent", side_effect=lambda name, **kw: _mock(script[name])):
        body = json.loads(run_tier1("t1r", b"fake-image-bytes").body)
    assert body["data"]["state"] == "rejected" and body["data"]["rejection"] == "R1"


def test_tier2_mini_panel_end_to_end() -> None:
    os.environ["ALLOW_FIXTURE_PANEL"] = "1"
    try:
        script = _script()
        blob = (PIPEFIX / "mini-genome.txt").read_bytes()
        create_job("t2", "tier2", "queued")
        with patch("api.jobs.run_agent", side_effect=lambda name, **kw: _mock(script[name])):
            body = json.loads(run_tier2("t2", "23andme", blob.decode(), blob).body)
        assert body["ok"] and body["data"]["state"] == "done", body
        job = store.get_job("t2")
        assert job is not None
        arts = " ".join(e["artifact"] for e in job["events"])
        assert "2000 markers usable" in arts and "mini-fixture-v1" in arts
    finally:
        del os.environ["ALLOW_FIXTURE_PANEL"]


def test_tier2_no_panel_honest_error() -> None:
    os.environ["POCKETDNA_PANEL_PATH"] = "/nonexistent/panel.npz"
    try:
        create_job("t2n", "tier2", "queued")
        try:
            run_tier2("t2n", "23andme", "rs1\t1\t100\tAA\n", b"rs1\t1\t100\tAA\n")
        except PanelMissing:
            return
        raise SystemExit("expected PanelMissing")
    finally:
        del os.environ["POCKETDNA_PANEL_PATH"]


if __name__ == "__main__":
    for name, fn in sorted({k: v for k, v in globals().items() if k.startswith("test_")}.items()):
        fn()
        print(f"PASS {name}")
