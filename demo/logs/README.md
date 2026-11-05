# Muse model call logs

Real logs from building and testing PocketDNA, copied from the private runtime
folder (`.local/`). They contain no API keys and no prompts sent to Muse Spark.
They do contain derived ancestry results and film text from the builder's own
DNA, which the builder chose to publish.

## `muse-cost.jsonl`: every live Muse call

One row per paid call that reached Meta's API (cache hits cost nothing and are
not listed): agent, model, input tokens, output tokens and USD.

| | |
| --- | --- |
| Live calls | 128 (102 Muse Spark 1.3, 26 Muse Image 1.0) |
| Muse Spark tokens | 290,579 in, 495,034 out |
| Total cost | about $2.73 across the whole build and test period |

Calls by agent: visual auditor 26, historical image 20, narrative auditor 19,
compliance auditor 19, director 18, interpretation 7, image repair 6,
extractor 5, gatekeeper 4, population profiler 4. The extractor and
gatekeeper rows come from an earlier screenshot input that has since been
removed from the product.

## `runs/`: four complete stories

| Run | What it shows | Files |
| --- | --- | --- |
| `047889d3-e6e` | The episode in the demo video. The narrative auditor sent the first script back, the director rewrote it (16,320 tokens), both auditors passed, and three images passed their visual audit. | `trace.jsonl` (every call with timestamp, cache hit, tokens, cost, duration), `job.json` (final film plan, claims, stage events), `image-manifest.json` (exact image prompts and audit verdicts) |
| `da5d5bde-855` | The audit gate working: the auditors still objected after the one allowed rewrite, so the job stopped with "No reel renders without a pass." | `trace.jsonl`, `job.json` |
| `5a777ce1-f28` | An image repair that passed. The visual auditor flagged a wooden box bellows as out of place in the Bronze Age; Muse Image replaced it with a leather bag bellows, and the re-audit passed. | `image-manifest.json` (both attempts, the repair note, image hashes) |
| `e3325bf3-eac` | A repair that failed. The bronze scene failed its re-audit, so it fell back to a plain plate instead of showing an unapproved image. | `image-manifest.json` |

How to read a trace row: `cached: true` means the response came from the
local cache with no network call and no charge; `duration_ms` is wall-clock
time for the call; `status` is `ok` or `error`.
