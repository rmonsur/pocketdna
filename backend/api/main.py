"""PocketDNA FastAPI service. Thin routes; orchestration lives in api/jobs.py."""

from __future__ import annotations

import json
import uuid

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

from agents.openweights import OpenWeightsDown
from api.jobs import BACKEND_DIR, err, ok, run_tier1, run_tier2
from api.router import route_upload
from api.schemas import JobStatus
from api.store import create_job, get_job, set_state
from pipeline.engine import PanelMissing

app = FastAPI(title="PocketDNA")


@app.post("/v1/jobs")
async def create(file: UploadFile = File(...)) -> JSONResponse:
    try:
        blob = await file.read()
    except Exception:
        return err("R2", "could not read upload")
    name = file.filename or ""
    tier, detail, message = route_upload(name, blob)
    job_id = uuid.uuid4().hex[:12]
    if tier == "rejection":
        create_job(job_id, "tier1", "rejected", message)
        set_state(job_id, "rejected", message, detail)
        return ok({"job_id": job_id, "tier": "tier1", "state": "rejected",
                   "rejection": detail, "message": message})
    create_job(job_id, tier, "queued")
    try:
        if tier == "tier2":
            return run_tier2(job_id, detail, name, blob)
        return run_tier1(job_id, blob)
    except PanelMissing as exc:
        set_state(job_id, "failed", f"R4: {exc}", "R4")
        return err("R4", str(exc), 500)
    except OpenWeightsDown as exc:
        set_state(job_id, "failed", "R5: open-weights endpoint unreachable", "R5")
        return err("R5", f"open-weights endpoint unreachable ({str(exc)[:150]})", 503)
    except ValueError as exc:
        set_state(job_id, "failed", f"R4: {exc}", "R4")
        return err("R4", str(exc)[:200], 500)
    except Exception as exc:  # partial-result path, never a dead spinner
        set_state(job_id, "failed", f"R4: {str(exc)[:200]}", "R4")
        return err("R4", f"pipeline step failed: {str(exc)[:200]}", 500)


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
