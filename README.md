# PocketDNA

Finding Your Roots for everyone: turn ancestry evidence into a cited micro documentary. The agreed release target is 90–150 seconds, silent-first.

Meta Global AI Developer Hackathon, Oct 26 - Nov 4, 2026. Indie track. All code in this repo was built during the event window. A prior concept (DNAless) informed the idea; no old code, prompts, or assets are reused.

## Run the target app (judge path)

```sh
npm install
npm run serve   # builds, then serves app + API on http://localhost:8000
```

Open http://localhost:8000. Watch the saved episode with no key, upload an
ancestry screenshot (needs `META_API_KEY` in `.env`), or drop a raw
23andMe/AncestryDNA `.txt` export — raw files are analysed in your browser
(experimental PocketDNA PCA-25) and never leave the device. For development,
`npm run dev:api` (port 8000) plus `npm run dev` (port 5173) gives hot reload.

## Implementation status

The reconciled release specification starts at [docs/ABOUT.md](docs/ABOUT.md); responsibilities are in [AGENTS.md](AGENTS.md). The target is React/Vite + Node/Hono with browser-local raw-DNA analysis, Muse Spark interpretation for both tiers, live Muse Image scenes, and one-command local startup/export. That migration is **pending**, not delivered by this documentation update.

The instructions and model routing below describe the earlier Expo/FastAPI prototype, including its 30–60 second reel format and Python requirement. They are retained for development and have not been revalidated in this documentation pass. They do not override the target contracts or establish scientific release readiness. The final judge instructions must be replaced after fresh-clone verification.

## Run the existing prototype

Requirements: Python 3.12+, Node 20+, Chrome. Two terminals. Runs fully on your machine; no hosted deployment needed.

```sh
# 1. Backend (FastAPI + NumPy engine)
cd backend
pip install -r requirements.txt
cp .env.example .env            # add your Meta Model API key (see below); never commit .env
python3 -m uvicorn api.main:app --port 8000

# 2. Web app (Expo + React Native Web), in a second terminal
cd app
npm install
npx expo start --web            # opens http://localhost:8081
```

Then in the browser:

1. **Watch a sample Reel**: works with no key at all (fixture reel, every claim cited).
2. **Raw DNA file**: upload `backend/pipeline/fixtures/mini-genome.txt` (synthetic 23andMe-format
   export). The deterministic engine runs locally; interpretation runs on Meta open weights (see keys).
3. **Screenshot**: upload a 23andMe or AncestryDNA ancestry-composition screenshot. Needs a Meta key.

### Keys (`backend/.env`, copied from `backend/.env.example`)

| Variable | Needed for | Where to get it |
|---|---|---|
| `META_API_KEY` | Screenshot tier (Muse Spark vision + agents) | dev.meta.ai |
| `OPENWEIGHT_BASE_URL` | Raw-file tier (Muse Glimmer, open weights) | The project's Modal endpoint URL (in `.env.example` at submission) or your own `modal deploy backend/glimmer/serve.py` |
| `BASETEN_API_KEY` + `OPEN_WEIGHT_PROVIDER=baseten` | Raw-file tier fallback via Muse Spark Open on Baseten | baseten.co |

Never commit a real key. `backend/.env`, the dev cache, and the cost log are gitignored.
`KILL_PAID_CALLS=1` refuses every paid call (the app then degrades to typed errors, never a hang).

### Verify

```sh
cd backend && python3 -m pytest -q      # engine, router, privacy invariant, orchestration (offline)
cd app && npx tsc --noEmit              # strict TypeScript
```

## How it works

Two input tiers, one hero output (9:16 reel + evidence layer):

- **Tier 1, screenshot**: Muse Spark vision parses vendor percentages, then Spark agents cite, direct, pick scenes, and audit.
- **Tier 2, raw 23andMe or AncestryDNA file**: deterministic NumPy engine (least-squares projection onto a precomputed AADR eigenspace, then 3-epoch constrained NNLS with bootstrap intervals). ALL interpretation runs on self-hosted Meta open weights (Muse Glimmer on Modal, Muse Spark Open on Baseten as fallback). Raw DNA never touches a hosted API; the router asserts this on every call and a test proves it.

Scientific honesty rule: the LLM never computes ancestry. The math is deterministic population genetics (validated against EIGENSOFT smartpca); Muse does interpretation, narrative, visuals, and cited grounding.

Pipeline: gatekeeper (vendor, health-panel rejection) -> parse or engine -> citation binding against a builder-reviewed Reich Lab index -> reel direction (7 beats, 30-60 s) -> scene selection -> compliance audit (no reel renders without a pass) -> t-driven reel engine (every frame a pure function of time, so MP4 export is exact).

## Meta models used

| Model | Role |
|---|---|
| Muse Spark 1.3 | Tier 1 vision parsing, citation binding, reel direction, scene scoring, compliance audit, fixture visual QA |
| Muse Glimmer (open weights, Modal GPU) | Every agent in the raw-file tier |
| Muse Spark Open (Baseten) | One-line fallback for the open-weights path |
| Muse Image | Pregenerated 9:16 historical scene library |
| SAM 3.1 | 2.5D parallax masks over the scene library |
| Muse Wonder | Hardest build-time passes (citation index) |
| Muse Code | Wrote this codebase, including the bioinformatics engine |

## Screenshots

(added before submission: welcome, upload, processing log, reel, evidence sheet, library)

## Data rights

- Builder's own DNA export: kept on disk for local testing but gitignored (`dataset/.gitignore`) since the 2026-11-05 security pass — committing and pushing it would publish sensitive genetic data.
- Sample raw file in the repo is synthetic (`backend/pipeline/fixtures/mini-genome.txt`).
- Shared screenshots: sent directly by group members with permission, PII redacted. Permission records kept.
- Reference: AADR (Reich Lab, Harvard Dataverse, DOI 10.7910/DVN/FFIDCW), v66.0. Mallick et al. 2024, Scientific Data.
- Reel clock pattern adapted from MengTo Skills html-reel (MIT, attributed).

## Agent skills

Skills installed at user scope (`muse skills list --source user`) and used to build and
review this project. Install any of them with `muse skills install <path-to-skill-dir> --scope user`.

| Skill | Source | Used for |
|---|---|---|
| [code-review](https://github.com/mattpocock/skills/tree/main/skills/engineering/code-review) | [mattpocock/skills](https://github.com/mattpocock/skills) — `skills/engineering/` | Two-axis review (Standards + Spec) of the working tree; findings in [2026-11-05-engineering-pass.md](muse-loop/qa-logs/2026-11-05-engineering-pass.md) |
| [tdd](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd) | [mattpocock/skills](https://github.com/mattpocock/skills) — `skills/engineering/` | Tests at public seams only (`tests/modelJson.test.ts`, `tests/extractor-rejection.test.ts`, boundary cases in `tests/server.test.ts`) |
| [diagnosing-bugs](https://github.com/mattpocock/skills/tree/main/skills/engineering/diagnosing-bugs) | [mattpocock/skills](https://github.com/mattpocock/skills) — `skills/engineering/` | Red-capable loop → fix for the extractor R1/R2 rejection bug and the reel-plan tiling defect |
| [security-and-hardening](https://github.com/addyosmani/agent-skills/tree/main/skills/security-and-hardening) | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) — `skills/` | Threat model + hardening: upload caps and content sniffing, localhost binding, fetch timeouts, security headers, generic error bodies, genome gitignore fix; see [2026-11-05-security-design-review.md](muse-loop/qa-logs/2026-11-05-security-design-review.md) |
| [impeccable](https://github.com/pbakaus/impeccable/tree/main/plugin/skills/impeccable) | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) — `plugin/skills/` | Design critique (two isolated assessments) + technical audit, scored 9/20 with findings in [2026-11-05-security-design-review.md](muse-loop/qa-logs/2026-11-05-security-design-review.md) |

The Pocock `skills/engineering/` folder is a pack of sub-skills, not a single skill
package, so its members are installed individually. Impeccable also ships a detector
binary (`impeccable detect`) that runs against the live page.

## Repo layout

```
app/        Expo + React Native Web (TypeScript strict). Web is the only surface.
backend/    FastAPI api/, agents/, deterministic pipeline/, muse/ client, glimmer/ Modal GPU server
shared/     JSON schemas shared app <-> backend
demo/       Fixtures (sample reel, sample parse, gatekeeper rejection)
docs/       Reconciled target specifications; start with ABOUT.md
dataset/    Ignored local reference-data staging; start with its README.md
AGENTS.md   Build ownership and runtime agent contracts
```
