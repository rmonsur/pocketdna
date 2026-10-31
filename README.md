# PocketDNA

Finding Your Roots for everyone: drop your DNA test, get a 30-60s micro documentary of your origins.

Meta Global AI Developer Hackathon, Oct 26 - Nov 4, 2026. Indie track. All code in this repo was built during the event window. Prior concept (DNAless) informed the idea; no old code, prompts, or assets are reused.

## How it works

Two input tiers, one hero output (9:16 reel + evidence layer):

- Tier 1: ancestry screenshot -> Muse Spark vision parses vendor percentages.
- Tier 2: raw 23andMe/AncestryDNA file -> deterministic NumPy engine (PCA projection onto precomputed AADR eigenspace + 3-epoch constrained NNLS). ALL interpretation on self-hosted open weights (Muse Glimmer / Muse Spark Open). Raw DNA never touches a hosted API.

Scientific honesty rule: the LLM never computes ancestry. Math is deterministic population genetics (validated against EIGENSOFT smartpca); Muse does interpretation, narrative, visuals, cited grounding.

## Meta models used

Spark (Tier 1 parse + direction + fixture visual QA), Wonder (hardest build-time passes), Image (scene library), SAM 3.1 (parallax masks), Glimmer + Spark Open (all Tier 2 reasoning), Voice Transcribe (stretch), Muse Code (this codebase).

## Quickstart

```sh
# backend (Python 3.12, Modal)
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env  # add keys; never commit
modal deploy backend/modal_app.py

# app (Expo, TypeScript strict)
cd app && npm install && npx expo start
```

## Data rights

- Builder's own DNA export: owned.
- Shared screenshots: sent directly by group members with permission, PII redacted. Permission records kept.
- Reference: AADR (Reich Lab, Harvard Dataverse, DOI 10.7910/DVN/FFIDCW). Version recorded at build.
- Reel clock pattern adapted from MengTo Skills html-reel (MIT, attributed).
