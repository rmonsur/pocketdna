# glimmer/ (open-weights Tier 2 inference — UNPARKED Oct 31)

- `serve.py`: Modal GPU function (vLLM OpenAI server for Muse Glimmer). UNVERIFIED: bring up late, confirm model id, scaledown 60s.
- Provider switch lives in `agents/openweights.py`: `OPEN_WEIGHT_PROVIDER=modal|baseten`.
- Until the endpoint is live, Tier 2 jobs fail honestly with R5 (retry), never silent hosted fallback.
