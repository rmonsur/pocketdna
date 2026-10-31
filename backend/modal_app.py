"""Modal deployment: FastAPI service on a persistent volume. Modal IS the cloud."""

import modal

app = modal.App("pocketdna")

image = modal.Image.debian_slim(python_version="3.12").pip_install(
    "fastapi", "pydantic", "httpx"
)
vol = modal.Volume.from_name("pocketdna-v1", create_if_missing=True)


@app.function(
    image=image,
    volumes={"/data": vol},
    secrets=[modal.Secret.from_name("pocketdna")],
    env={"POCKETDNA_DB": "/data/pocketdna.db"},
)
@modal.asgi_app()
def api():
    from api.main import app as fastapi_app

    return fastapi_app
