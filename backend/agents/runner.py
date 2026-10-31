"""Thin runtime agents: versioned prompt + muse.call_json + pydantic validator.

Deterministic code orchestrates; agents never call agents; agents never do math.
Tier 2 models are open weights only (parked until the engine hold lifts).
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from api.schemas import (
    AuditOut,
    CitationResult,
    GatekeeperOut,
    ParseOut,
    Reel,
    ScenePicks,
)
from muse.client import CallResult, call_json, read_prompt
from muse.models import SPARK_13

BACKEND_DIR = Path(__file__).resolve().parents[1]


class Tier2Parked(RuntimeError):
    pass


def _data(name: str) -> Any:
    return json.loads((BACKEND_DIR / "data" / name).read_text())


def citation_index() -> Any:
    return _data("citation-index.json")


def map_paths() -> Any:
    return _data("map-paths.json")


def _validate_a5(raw: dict[str, Any]) -> dict[str, Any]:
    raw = dict(raw)
    if "pass" in raw:  # prompt emits "pass"; schema field is "passed"
        raw["passed"] = raw.pop("pass")
    return AuditOut.model_validate(raw).model_dump()


AGENT_DEFS: dict[str, tuple[str, str, Any]] = {
    # name: (prompt_file, effort, validator)
    "a0": ("a0", "low", lambda d: GatekeeperOut.model_validate(d).model_dump()),
    "a1": ("a1", "medium", lambda d: ParseOut.model_validate(d).model_dump()),
    "a2": ("a2", "high", lambda d: CitationResult.model_validate(d).model_dump()),
    "a3": ("a3", "high", lambda d: Reel.model_validate(d).model_dump()),
    "a4": ("a4", "low", lambda d: ScenePicks.model_validate(d).model_dump()),
    "a5": ("a5", "high", _validate_a5),
}


def run_agent(
    name: str,
    *,
    tier: str,
    user_content: list[dict[str, Any]],
    run_spent_usd: float = 0.0,
) -> CallResult:
    prompt_file, effort, validate = AGENT_DEFS[name]
    if tier == "tier2":
        raise Tier2Parked("Tier 2 engine on hold (builder testing); open-weights path wires up on unpark")
    system = read_prompt(prompt_file)
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user_content}]
    schema = {"name": f"pocketdna_{name}", "strict": True, "schema": {"type": "object"}}
    return call_json(
        agent=name, tier=tier, model=SPARK_13, messages=messages,
        json_schema=schema, effort=effort, validate=validate,
        run_spent_usd=run_spent_usd,
    )


def open_weight_provider() -> str:
    return os.environ.get("OPEN_WEIGHT_PROVIDER", "modal")
