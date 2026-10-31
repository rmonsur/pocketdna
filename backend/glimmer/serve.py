"""Modal GPU: Muse Glimmer via a vLLM OpenAI-compatible server (Tier 2 inference).

UNVERIFIED (needs GPU + network): bring up late, aggressive scaledown so idle = $0.
Confirm GLIMMER_MODEL_ID on HuggingFace before first deploy.

Deploy: modal deploy glimmer/serve.py  (then set OPENWEIGHT_BASE_URL to the shown URL)
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
    import fastapi  # noqa: F401  (ensures fastapi present for the vllm server import)
    from vllm.entrypoints.openai.api_server import run_server  # noqa: F401
    from vllm.entrypoints.openai.cli_args import make_arg_parser
    from vllm.utils import FlexibleArgumentParser

    parser = FlexibleArgumentParser()
    parser = make_arg_parser(parser)
    args = parser.parse_args(["--model", MODEL_ID, "--trust-remote-code"])
    from vllm.entrypoints.openai.api_server import build_app

    return build_app(args)
