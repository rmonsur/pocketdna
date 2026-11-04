"""Job orchestration: Tier 1 + Tier 2 pipelines. No web imports (testable offline)."""

from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path

from fastapi.responses import JSONResponse

from agents.openweights import model_id as open_model_id
from agents.runner import citation_index, map_paths, run_agent
from pipeline.engine import analyze, load_panel
from pipeline.parse_raw import parse_raw

BACKEND_DIR = Path(__file__).resolve().parents[1]
LIB_DIR = BACKEND_DIR.parent / "assets" / "scene-library"
MAX_ON_THE_FLY_SCENES = 2  # Tier 1 only; Tier 2 is library-only, always.


def ok(data: dict) -> JSONResponse:
    return JSONResponse({"ok": True, "data": data})


def err(code: str, message: str, status: int = 400) -> JSONResponse:
    return JSONResponse({"ok": False, "code": code, "message": message}, status_code=status)


def library_ids() -> list[str]:
    if not LIB_DIR.exists():
        return []
    return sorted(p.stem for p in LIB_DIR.glob("*.png"))


def apply_scene_picks(reel: dict, picks: dict, *, tier: str) -> dict:
    """Override beat scene_ids from A4. Caps Tier 1 generation; Tier 2 library-only."""
    allowed = MAX_ON_THE_FLY_SCENES if tier == "tier1" else 0
    by_beat = {p["beat_id"]: p for p in picks.get("picks", [])}
    for beat in reel.get("beats", []):
        pick = by_beat.get(beat["id"])
        if pick is None:
            continue
        if pick.get("scene_id"):
            beat["scene_id"] = pick["scene_id"]
        elif pick.get("generate") and allowed > 0:
            beat["scene_id"] = f"gen:{beat['id']}"
            allowed -= 1
    return reel


def _image_part(blob: bytes) -> dict:
    b64 = base64.b64encode(blob).decode()
    return {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}


def _text_part(obj: object) -> dict:
    return {"type": "text", "text": json.dumps(obj)}


def run_tier1(job_id: str, blob: bytes) -> JSONResponse:
    from api.store import add_event, save_reel, set_state

    set_state(job_id, "running")
    spent = 0.0
    image_part = _image_part(blob)

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
        msg = ("PocketDNA reads ancestry only. We never interpret health data." if rej == "R1"
               else "Could not read that screenshot. Please upload the ancestry composition screen.")
        set_state(job_id, "rejected", msg, rej)
        add_event(job_id, 1, "Reading your results", "muse-spark-1.3", "done", f"rejected {rej}")
        return ok({"job_id": job_id, "tier": "tier1", "state": "rejected", "rejection": rej, "message": msg})
    shares = parsed.data["shares"]

    add_event(job_id, 5, "Selecting your citations", "muse-spark-1.3", "running")
    cited = run_agent("a2", tier="tier1",
                      user_content=[_text_part({"shares": shares, "index": citation_index()})],
                      run_spent_usd=spent)
    spent += cited.cost_usd
    add_event(job_id, 5, "Selecting your citations", "muse-spark-1.3", "done",
              f"{len(cited.data['claims'])} claims grounded")

    add_event(job_id, 6, "Directing your reel", "muse-spark-1.3", "running")
    reel = run_agent("a3", tier="tier1",
                     user_content=[_text_part({"claims": cited.data["claims"], "map_paths": map_paths()})],
                     run_spent_usd=spent)
    spent += reel.cost_usd

    add_event(job_id, 7, "Choosing your scenes", "muse-spark-1.3", "running")
    picks = run_agent("a4", tier="tier1",
                      user_content=[_text_part({"beats": reel.data["beats"], "library": library_ids()})],
                      run_spent_usd=spent)
    spent += picks.cost_usd
    reel_data = apply_scene_picks(reel.data, picks.data, tier="tier1")
    add_event(job_id, 7, "Choosing your scenes", "muse-spark-1.3", "done", "plates assigned")

    audit = run_agent("a5", tier="tier1",
                      user_content=[_text_part({"reel": reel_data})],
                      run_spent_usd=spent)
    if not audit.data["passed"]:
        set_state(job_id, "failed", "R4: reel failed compliance audit", "R4")
        return err("R4", "reel failed compliance audit", 500)

    save_reel(job_id, reel_data)
    add_event(job_id, 6, "Directing your reel", "muse-spark-1.3", "done", "7 beats, A5 pass")
    return ok({"job_id": job_id, "tier": "tier1", "state": "done", "reel": reel_data})


def run_tier2(job_id: str, vendor: str, text: str, blob: bytes) -> JSONResponse:
    """Raw-file path: deterministic engine + open-weights agents only. Zero hosted calls.

    `text` is the decoded export (unzipped once by the router); `blob` seeds the bootstrap.
    """
    from api.store import add_event, save_reel, set_state

    set_state(job_id, "running")
    model = open_model_id()

    add_event(job_id, 1, "Validating markers", "engine", "running")
    parsed = parse_raw(vendor, text)
    add_event(job_id, 1, "Validating markers", "engine", "done",
              f"{parsed.n_lines} markers, {parsed.n_nocall} no-calls")

    panel = load_panel()  # raises PanelMissing -> honest R4
    add_event(job_id, 2, "Merging ancient panel", "engine", "running")
    seed = int.from_bytes(hashlib.sha256(blob).digest()[:4], "big")
    result = analyze(parsed.calls, panel, seed=seed)
    add_event(job_id, 2, "Merging ancient panel", "engine", "done",
              f"{result['n_markers_usable']} markers usable ({result['panel_id']})")

    add_event(job_id, 3, "Projecting PC space", "engine", "done", f"panel {result['panel_id']}")
    tops = ", ".join(f"{e}: {max(s['weight'] for s in result['epochs'][e]['shares']):.0%}"
                     for e in ("bronze", "middle", "modern"))
    add_event(job_id, 4, "Fitting your eras", "engine", "done", tops)

    add_event(job_id, 5, "Selecting your citations", model, "running")
    cited = run_agent("a2", tier="tier2",
                      user_content=[_text_part({"admixture": result["epochs"], "index": citation_index()})])
    add_event(job_id, 5, "Selecting your citations", model, "done",
              f"{len(cited.data['claims'])} claims grounded")

    add_event(job_id, 6, "Directing your reel", model, "running")
    reel = run_agent("a3", tier="tier2",
                     user_content=[_text_part({"claims": cited.data["claims"], "map_paths": map_paths()})])

    add_event(job_id, 7, "Choosing your scenes", model, "running")
    picks = run_agent("a4", tier="tier2",
                      user_content=[_text_part({"beats": reel.data["beats"], "library": library_ids()})])
    reel_data = apply_scene_picks(reel.data, picks.data, tier="tier2")
    add_event(job_id, 7, "Choosing your scenes", model, "done", "library-only plates")

    audit = run_agent("a5", tier="tier2", user_content=[_text_part({"reel": reel_data})])
    if not audit.data["passed"]:
        set_state(job_id, "failed", "R4: reel failed compliance audit", "R4")
        return err("R4", "reel failed compliance audit", 500)

    save_reel(job_id, reel_data)
    add_event(job_id, 6, "Directing your reel", model, "done", "7 beats, A5 pass")
    return ok({"job_id": job_id, "tier": "tier2", "state": "done", "reel": reel_data})
