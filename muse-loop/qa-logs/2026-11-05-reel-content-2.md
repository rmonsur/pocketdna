# 2026-11-05 reel-content-2 (repairs, replay package, provider path, names) — score 8/10
Works: 2/2. Spec: 2/2. Compliant: 2/2. Clean: 1/2. Shippable: 1/2.
Spec refs: docs/AGENT.md (one repair per scene, two per episode, fallback,
no self-certification), docs/IMAGE.md (HIST-REPAIR-01, replay assets for the
no-key demo), docs/ATLAS.md 6/7 (dated sites from cited studies; provider
labels resolve only through a reviewed table, never geocoded), docs/RULES.md
(screenshot percentages never become ancient components), docs/DIRECTOR.md.
Fixtures: tests/fixtures/composition.png (23andMe fixture) for the provider
path; builder's own export for the raw path (not committed as frames);
public/assets/replay/*.jpeg generated from the replay fixture's cited sites.
Shots: none committed (raw frames are personal; provider frames inspected
live in Chrome and recorded in log.txt).
Manifest: public/assets/replay/manifest.json (prompts, audits, hashes).

Mistakes seen:
- Lab codes still surfaced in the results card hint and "closest sources"
  line; two samples of one AADR group rendered as identical rows.
- Provider path had no profiles, globe or images; replay had none either.
- Image audit could only pass or fall back; no bounded repair.
- Provider director attached provider percentages to ancient sites.
- Infrastructure limits masked as pipeline failures: 120 s chat timeout,
  16k completion ceiling (Spark reasoning counts as output).

Fix applied:
- Repair pass: auditor returns pass/repair/fallback with an edit
  instruction; HIST-REPAIR-01 sends the candidate as a captioned reference
  through the Responses API; one repair per scene, two per episode,
  re-audit required; manifests record every attempt.
- Replay: fixture beats carry atlas scenes anchored on AADR-resolved sites;
  scripts/build-replay-assets.ts generated three reviewed images (two
  repaired once) into public/assets/replay with src/contracts/replayAssets.ts.
- Provider path: src/server/providerRegions.ts reviewed label table ->
  present-day panel populations; context sites registry (12 AADR groups for
  the cited studies) -> dated markers per era; profiles for both; images from
  the leading marker; pipeline reordered so citations precede profiles.
- Names: closest sources and shares carry readable labels end to end;
  group-shared profiles; "(individual n)" disambiguation; junk localities
  ("India, modern 2") dropped; present-day fallback names.
- Reliability: chat timeout 300 s, completion ceiling 32k, concurrent
  audits, structured job_failed log line, assets served after restarts.

Cost: this pass ~$1.40 (replay build $0.10; raw run $0.25; provider runs
$0.26 + failed attempts; image repairs at $0.01 each plus audits).

Open (why not higher): image repairs often still fail re-audit on "busy
caption zone" (two of five scenes across runs); provider copy rule verified
on the final run only (see log.txt); gazetteer and sites still live in the
ignored dataset tree (fresh clone needs the AADR annotation files and the
build script); the panel curation mismatch (BOL001..009) stands.
Verdict: proceed.
