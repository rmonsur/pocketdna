"""Open-weights caller for Tier 2 (and build) jobs. Never touches hosted Muse.

Provider switch: OPEN_WEIGHT_PROVIDER=modal|baseten (one line).
Endpoints are env-driven so ids/URLs stay out of code:
  modal:   OPENWEIGHT_BASE_URL=https://<modal-glimmer-url>  OPENWEIGHT_MODEL=<glimmer id>
  baseten: OPENWEIGHT_BASE_URL=https://inference.baseten.co/v1  BASETEN_API_KEY=...
"""

from __future__ import annotations

import os
from typing import Any, Callable

import httpx

from api.router import assert_open_weights_only
from muse.client import cache_get, cache_key, cache_put, killed, log_cost


class OpenWeightsDown(RuntimeError):
    pass


def provider() -> str:
    return os.environ.get("OPEN_WEIGHT_PROVIDER", "modal")


def base_url() -> str:
    url = os.environ.get("OPENWEIGHT_BASE_URL", "")
    if provider() == "baseten" and not url:
        url = "https://inference.baseten.co/v1"
    if not url:
        raise OpenWeightsDown("OPENWEIGHT_BASE_URL not set (deploy glimmer/serve.py first)")
    return url


def model_id() -> str:
    default = "meta/muse-glimmer-30b" if provider() == "modal" else "meta-models/muse-spark-open-1026"
    return os.environ.get("OPENWEIGHT_MODEL", default)


def auth_headers() -> dict[str, str]:
    if provider() == "baseten":
        key = os.environ.get("BASETEN_API_KEY", "")
        if not key:
            raise OpenWeightsDown("BASETEN_API_KEY missing")
        return {"Authorization": f"Bearer {key}"}
    return {}


def call_open(
    *,
    agent: str,
    tier: str,
    messages: list[dict[str, Any]],
    validate: Callable[[dict[str, Any]], dict[str, Any]],
    temperature: float = 0.4,
    max_tokens: int = 4096,
) -> dict[str, Any]:
    """POST an OpenAI-compatible chat call. Cached; validated twice like hosted."""
    if tier not in ("tier2", "build"):
        raise AssertionError(f"open-weights client is for tier2/build, got {tier}")
    assert_open_weights_only(tier, provider())  # privacy invariant, enforced on every call
    if killed():
        raise OpenWeightsDown("KILL_PAID_CALLS is set; refusing open-weights call")
    import json as _json

    model = model_id()
    key = cache_key(model, messages, {"agent": agent})
    hit = cache_get(key)
    if hit is not None:
        return validate(hit["data"])
    payload = {"model": model, "messages": messages, "temperature": temperature, "max_tokens": max_tokens}
    last_error = ""
    for attempt in range(2):
        body = dict(payload)
        if attempt == 1:
            body["messages"] = messages + [
                {"role": "user", "content": f"Your previous output failed validation: {last_error}. Fix it and return valid JSON only."}
            ]
        try:
            with httpx.Client(timeout=180.0) as client:
                resp = client.post(f"{base_url()}/chat/completions", json=body, headers=auth_headers())
        except httpx.HTTPError as exc:
            raise OpenWeightsDown(f"{agent}: endpoint unreachable: {exc}") from exc
        if resp.status_code != 200:
            raise OpenWeightsDown(f"{agent}: HTTP {resp.status_code}: {resp.text[:200]}")
        try:
            content = resp.json()["choices"][0]["message"]["content"]
            validated = validate(_json.loads(content))
        except Exception as exc:
            last_error = str(exc)[:500]
            continue
        cache_put(key, {"data": validated})
        log_cost({"agent": agent, "model": f"open:{model}", "usd": 0.0})
        return validated
    raise OpenWeightsDown(f"{agent}: schema validation failed twice: {last_error}")
