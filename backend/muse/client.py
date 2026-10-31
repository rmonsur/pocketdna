"""Single typed client for all Meta Model API calls.

Discipline (RULES.md): central routing, retry-once-then-typed-error, dev cache,
per-call cost log, per-run caps, global kill switch, Tier 2 privacy assertion.
"""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import httpx

from .models import EFFORT, price

BACKEND_DIR = Path(__file__).resolve().parents[1]
CACHE_DIR = BACKEND_DIR / ".muse-cache"
COST_LOG = BACKEND_DIR / ".muse-cost.jsonl"
API_BASE = os.environ.get("META_API_URL", "https://api.meta.ai/v1")

MAX_IMAGES_PER_RUN = 12
MAX_TOKENS_PER_CALL = 8192


class KillSwitchEngaged(RuntimeError):
    pass


class BudgetExceeded(RuntimeError):
    pass


class ModelCallError(RuntimeError):
    pass


@dataclass(frozen=True)
class CallResult:
    data: dict[str, Any]
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    cached: bool


def load_dotenv() -> None:
    path = BACKEND_DIR / ".env"
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def api_key() -> str:
    load_dotenv()
    key = os.environ.get("META_API_KEY", "")
    if not key:
        raise ModelCallError("META_API_KEY missing; add it to backend/.env (never commit)")
    return key


def killed() -> bool:
    return bool(os.environ.get("KILL_PAID_CALLS", ""))


def cache_key(model: str, messages: list[dict[str, Any]], schema: dict[str, Any]) -> str:
    raw = json.dumps({"m": model, "msg": messages, "s": schema}, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


def cache_get(key: str) -> dict[str, Any] | None:
    path = CACHE_DIR / f"{key}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text())


def cache_put(key: str, body: dict[str, Any]) -> None:
    CACHE_DIR.mkdir(exist_ok=True)
    (CACHE_DIR / f"{key}.json").write_text(json.dumps(body))


def log_cost(entry: dict[str, Any]) -> None:
    with COST_LOG.open("a") as fh:
        fh.write(json.dumps(entry) + "\n")


def read_prompt(name: str) -> str:
    return (BACKEND_DIR / "prompts" / f"{name}.md").read_text()


def call_json(
    *,
    agent: str,
    tier: str,
    model: str,
    messages: list[dict[str, Any]],
    json_schema: dict[str, Any],
    effort: str = "medium",
    validate: Callable[[dict[str, Any]], dict[str, Any]],
    run_spend_cap_usd: float = 5.0,
    run_spent_usd: float = 0.0,
) -> CallResult:
    """POST a structured-output chat call. Retries once with the validation error in-prompt."""
    if tier == "tier2":
        raise AssertionError("privacy invariant: Tier 2 jobs must use open weights only")
    if killed():
        raise KillSwitchEngaged("KILL_PAID_CALLS is set; refusing paid call")
    if run_spent_usd >= run_spend_cap_usd:
        raise BudgetExceeded(f"run cap ${run_spend_cap_usd:.2f} reached")

    temperature, max_tokens = EFFORT[effort]
    max_tokens = min(max_tokens, MAX_TOKENS_PER_CALL)
    key = cache_key(model, messages, json_schema)
    body = cache_get(key)
    if body is not None:
        return CallResult(
            data=validate(body["data"]),
            model=model,
            input_tokens=0,
            output_tokens=0,
            cost_usd=0.0,
            cached=True,
        )

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_schema", "json_schema": json_schema},
    }
    headers = {"Authorization": f"Bearer {api_key()}"}
    attempts = [payload, None]  # second attempt rebuilt with validation error
    last_error = ""
    for attempt in range(2):
        if attempt == 1:
            payload = dict(payload)
            payload["messages"] = messages + [
                {"role": "user", "content": f"Your previous output failed validation: {last_error}. Fix it and return valid JSON only."}
            ]
        try:
            with httpx.Client(timeout=120.0) as client:
                resp = client.post(f"{API_BASE}/chat/completions", json=payload, headers=headers)
        except httpx.HTTPError as exc:
            raise ModelCallError(f"{agent}: transport error: {exc}") from exc
        if resp.status_code != 200:
            raise ModelCallError(f"{agent}: HTTP {resp.status_code}: {resp.text[:300]}")
        raw = resp.json()
        try:
            content = raw["choices"][0]["message"]["content"]
            usage = raw.get("usage", {})
            data = json.loads(content)
            validated = validate(data)
        except (KeyError, ValueError) as exc:
            last_error = str(exc)[:500]
            attempts[1] = True
            continue
        except Exception as exc:  # pydantic ValidationError etc.
            last_error = str(exc)[:500]
            attempts[1] = True
            continue
        in_tok = int(usage.get("prompt_tokens", 0))
        out_tok = int(usage.get("completion_tokens", 0))
        cost = price(model, in_tok, out_tok)
        cache_put(key, {"data": validated})
        log_cost({"agent": agent, "model": model, "in": in_tok, "out": out_tok, "usd": round(cost, 4)})
        return CallResult(data=validated, model=model, input_tokens=in_tok,
                          output_tokens=out_tok, cost_usd=cost, cached=False)
    raise ModelCallError(f"{agent}: schema validation failed twice: {last_error}")
