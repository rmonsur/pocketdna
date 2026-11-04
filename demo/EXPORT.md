# Pregenerated episode and model-call trace

`pocketdna-live-episode.mp4` is a 120 s, 1920x1080 landscape, silent export of one live
raw-DNA episode (the builder's own export, analysed in the browser; only the
derived era summary reached the server). `pocketdna-live-episode.mp4.manifest.json`
is the companion evidence manifest written by the same export command.

## What the manifest shows

- `beats`: every beat's timing, exact on-screen copy, claim ids, the globe
  markers it drew (label, sampling place, date) and the reviewed image it
  used (`mode` live/cache/replay, `audit` pass/repaired).
- `citations`: the sources behind every claim, with DOIs.
- `pipeline`: the stage events the viewer saw (analysis, citations,
  profiles, director, audits, illustration, ready).
- `modelCalls`: one row per Muse call made for this job, in order: agent,
  model, kind (chat/image), effort, `cached` (true means no network call and
  no charge), input/output tokens, USD, duration and status. `modelCostUsd`
  is their sum. Prompts, images and personal payloads are not included.
- `limitations`: the evidence record's own limitations, verbatim.

## How it was produced

```bash
npm run dev:api && npm run dev          # local server + app
node scripts/export.mjs --job <job id> --out demo/pocketdna-live-episode.mp4 --fps 12
```

The exporter opens `/reel?job=<id>&static=1&t=<s>` for every frame, waits for
the reel and its images, screenshots, and encodes with FFmpeg. The same
`/reel` route without `job` exports the saved replay. A job's trace is also
served live at `/api/jobs/<id>/trace`.

Replay scene images under `public/assets/replay/` were generated and audited
once by `scripts/build-replay-assets.ts`; their prompts, audits and hashes are
in `public/assets/replay/manifest.json`.
