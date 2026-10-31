"""PocketDNA FastAPI service. Typed envelopes on every endpoint."""

from __future__ import annotations

import base64
import json
import uuid
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

from agents.runner import Tier2Parked, citation_index, run_agent
from api.router import TIER2_PARKED, route_upload
from api.schemas import JobStatus
from api.store import add_event, create_job, get_job, save_reel, set_state

app = FastAPI(title="PocketDNA")
BACKEND_DIR = Path(__file__).resolve().parents[1]


def ok(data: dict) -> JSONResponse:
    return JSONResponse({"ok": True, "data": data})


def err(code: str, message: str, status: int = 400) -> JSONResponse:
    return JSONResponse({"ok": False, "code": code, "message": message}, status_code=status)


@app.post("/v1/jobs")
async def create(file: UploadFile = File(...)) -> JSONResponse:
    try:
        blob = await file.read()
    except Exception:
        return err("R2", "could not read upload")
    tier, detail, message = route_upload(file.filename or "", blob)
    job_id = uuid.uuid4().hex[:12]
    if tier == "rejection":
        create_job(job_id, "tier1", "rejected", message)
        set_state(job_id, "rejected", message, detail)
        return ok({"job_id": job_id, "tier": "tier1", "state": "rejected",
                   "rejection": detail, "message": message})
    if tier == "tier2" and TIER2_PARKED:
        create_job(job_id, "tier2", "parked", "Deep ancestry engine in testing")
        return ok({"job_id": job_id, "tier": "tier2", "state": "parked",
                   "message": "Deep ancestry engine in testing. Try a screenshot or the sample reel."})
    create_job(job_id, tier, "queued")
    try:
        return run_tier1(job_id, blob)
    except Tier2Parked as exc:
        set_state(job_id, "parked", str(exc))
        return ok({"job_id": job_id, "tier": tier, "state": "parked", "message": str(exc)})
    except Exception as exc:  # partial-result path, never a dead spinner
        set_state(job_id, "failed", f"R4: {str(exc)[:200]}", "R4")
        return err("R4", f"pipeline step failed: {str(exc)[:200]}", 500)


def run_tier1(job_id: str, blob: bytes) -> JSONResponse:
    set_state(job_id, "running")
    spent = 0.0
    b64 = base64.b64encode(blob).decode()
    image_part = {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}

    add_event(job_id, 1, "Reading your results", "muse-spark-1.3", "running")
    gate = run_agent("a0", tier="tier1", user_content=[image_part], run_spent_usd=spent)
    spent += gate.cost_usd
    if gate.data["route"] == "rejection":
        rej = gate.data["rejection"] or "R2"
        msg = "PocketDNA reads ancestry only. We never interpret health data." if rej == "R1" else "Please upload the ancestry composition screen."
        set_state(job_id, "rejected", msg, rej)
        add_event(job_id, 1, "Reading your results", "muse-spark-1.3", "done", f"rejected {rej}")
        return ok({"job_id": job_id, "tier": "tier1", "state": "rejected", "rejection": rej, "message": msg})
    add_event(job_id, 1, "Reading your results", "muse-spark-1.3", "done",
              f"vendor: {gate.data['vendor']}")

    parsed = run_agent("a1", tier="tier1", user_content=[image_part], run_spent_usd=spent)
    spent += parsed.cost_usd
    if "error" in parsed.data:
        rej = parsed.data["error"]
        set_state(job_id, "rejected", "Could not parse this screenshot.", rej)
        return ok({"job_id": job_id, "tier": "tier1", "state": "rejected", "rejection": rej})
    shares = parsed.data["shares"]

    add_event(job_id, 5, "Selecting your citations", "muse-spark-1.3", "running")
    cited = run_agent("a2", tier="tier1",
                      user_content=[{"type": "text", "text": json.dumps({"shares": shares, "index": citation_index()})}],
                      run_spent_usd=spent)
    spent += cited.cost_usd
    add_event(job_id, 5, "Selecting your citations", "muse-spark-1.3", "done",
              f"{len(cited.data['claims'])} claims grounded")

    add_event(job_id, 6, "Directing your reel", "muse-spark-1.3", "running")
    reel = run_agent("a3", tier="tier1",
                     user_content=[{"type": "text", "text": json.dumps({"claims": cited.data["claims"]})}],
                     run_spent_usd=spent)
    spent += reel.cost_usd

    audit = run_agent("a5", tier="tier1",
                      user_content=[{"type": "text", "text": json.dumps({"reel": reel.data})}],
                      run_spent_usd=spent)
    if not audit.data["passed"]:
        set_state(job_id, "failed", "R4: reel failed compliance audit", "R4")
        return err("R4", "reel failed compliance audit", 500)

    save_reel(job_id, reel.data)
    add_event(job_id, 6, "Directing your reel", "muse-spark-1.3", "done", "7 beats, A5 pass")
    return ok({"job_id": job_id, "tier": "tier1", "state": "done", "reel": reel.data})


@app.get("/v1/jobs/{job_id}")
async def job_status(job_id: str) -> JSONResponse:
    job = get_job(job_id)
    if job is None:
        return err("NOT_FOUND", "unknown job", 404)
    reel = json.loads(job["reel_json"]) if job["reel_json"] else None
    status = JobStatus(job_id=job_id, tier=job["tier"], state=job["state"],
                       rejection=job["rejection"], message=job["message"],
                       reel=reel, events=job["events"])
    return ok(status.model_dump())


@app.get("/v1/sample/reel")
async def sample_reel() -> JSONResponse:
    path = BACKEND_DIR.parent / "demo" / "fixtures" / "sample-reel.json"
    return ok(json.loads(path.read_text()))
