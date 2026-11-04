"""Modal GPU: Muse Glimmer via a vLLM OpenAI-compatible server (Tier 2 inference).

Stays deployed through judging (Modal credits do not expire); scaledown 60s so idle = $0.
Confirm MODEL_ID on HuggingFace before first deploy.

Deploy: modal deploy glimmer/serve.py  (then set OPENWEIGHT_BASE_URL to the shown URL)
Smoke:  curl -s "$OPENWEIGHT_BASE_URL/chat/completions" -H 'content-type: application/json' \
          -d '{"model":"meta/muse-glimmer-30b","messages":[{"role":"user","content":"ping"}],"max_tokens":8}'
"""

import modal

app = modal.App("pocketdna-glimmer")

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install("vllm==0.6.6", "hf_transfer==0.1.8")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
)

MODEL_ID = "meta/muse-glimmer-30b"  # confirm exact id before deploy
VOL = modal.Volume.from_name("pocketdna-hf-cache", create_if_missing=True)


@app.function(
    image=image,
    gpu="A10G",
    scaledown_window=60,
    timeout=600,
    volumes={"/root/.cache/huggingface": VOL},
    secrets=[modal.Secret.from_name("pocketdna")],
)
@modal.concurrent(max_inputs=8)
@modal.asgi_app()
def api():
    """build_app only wires routes; the engine and serving objects are attached by
    init_app_state (what vLLM's run_server does). Without it every request 500s."""
    import asyncio

    import fastapi  # noqa: F401  (ensures fastapi present for the vllm server import)
    from vllm.engine.arg_utils import AsyncEngineArgs
    from vllm.engine.async_llm_engine import AsyncLLMEngine
    from vllm.entrypoints.openai.api_server import build_app, init_app_state
    from vllm.entrypoints.openai.cli_args import make_arg_parser
    from vllm.usage.usage_lib import UsageContext
    from vllm.utils import FlexibleArgumentParser

    parser = make_arg_parser(FlexibleArgumentParser())
    args = parser.parse_args(["--model", MODEL_ID, "--trust-remote-code"])

    engine = AsyncLLMEngine.from_engine_args(
        AsyncEngineArgs.from_cli_args(args),
        usage_context=UsageContext.OPENAI_API_SERVER,
    )
    model_config = asyncio.run(engine.get_model_config())

    web_app = build_app(args)
    asyncio.run(init_app_state(engine, model_config, web_app.state, args))
    return web_app
