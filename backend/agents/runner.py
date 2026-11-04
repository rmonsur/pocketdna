"""Thin runtime agents: versioned prompt + muse.call_json + pydantic validator.

Deterministic code orchestrates; agents never call agents; agents never do math.
Tier 2 models are open weights only (parked until the engine hold lifts).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from api.schemas import (
    AuditOut,
    CitationResult,
    GatekeeperOut,
    ParseError,
    ParseOut,
    Reel,
    ScenePicks,
)
from muse.client import CallResult, call_json, read_prompt
from muse.models import SPARK_13

BACKEND_DIR = Path(__file__).resolve().parents[1]


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


def _validate_a1(raw: dict[str, Any]) -> dict[str, Any]:
    if "error" in raw:
        return ParseError.model_validate(raw).model_dump()
    return ParseOut.model_validate(raw).model_dump()


AGENT_DEFS: dict[str, tuple[str, str, Any]] = {
    # name: (prompt_file, effort, validator)
    "a0": ("a0", "low", lambda d: GatekeeperOut.model_validate(d).model_dump()),
    "a1": ("a1", "medium", _validate_a1),
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
    system = read_prompt(prompt_file)
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user_content}]
    if tier == "tier2":
        from agents.openweights import call_open, model_id
        from muse.models import EFFORT

        temperature, max_tokens = EFFORT[effort]
        validated = call_open(
            agent=name, tier=tier, messages=messages, validate=validate,
            temperature=temperature, max_tokens=max_tokens,
        )
        return CallResult(data=validated, model=f"open:{model_id()}", input_tokens=0,
                          output_tokens=0, cost_usd=0.0, cached=False)
    schema = {"name": f"pocketdna_{name}", "strict": True, "schema": {"type": "object"}}
    return call_json(
        agent=name, tier=tier, model=SPARK_13, messages=messages,
        json_schema=schema, effort=effort, validate=validate,
        run_spent_usd=run_spent_usd,
    )

