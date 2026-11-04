# Raw episode generation — 2026-11-05

The reel no longer replays the saved episode after a raw analysis: the
browser result now generates its own episode through the same agent chain
as screenshots (interpretation -> director -> narrative + compliance
audits), per AGENTS.md roster and STACK 105.

## How it works

- Browser worker computes coordinates + era fits on-device, as before.
- "Generate your episode" sends ONLY the derived summary (era fits, counts,
  limitations) to `POST /api/raw-episodes`. The endpoint's strict Zod schema
  has no genotype, call, or coordinate fields at all — sending them is a 400
  (tested). Server builds the raw EvidenceRecord and runs the shared
  `continueJob` (claims from the citation index, director, audits, one repair
  round, fail-closed if audits never pass).
- The finished job feeds the existing `finish()` path, so the ReelViewport
  plays the new live episode with its own cited claims and evidence drawer.

## Live verification (builder's own analysis, this session)

Job `1dfd56c5-dcf`: **done**, 120s, 8 beats, audits narrative=pass /
compliance=pass (after one repair round), 4 claims grounded in the actual
fits (Allentoft 2015, Lazaridis 2016, Lazaridis 2014, Patterson 2006).
Director framing kept the rules: "Experimental similarity only, not proof of
descent", an explicit "YOUR RESULT ENDS HERE | CONTEXT NEXT" separation
beat, era shares quoted with their bootstrap ranges. Spend for the episode:
interpretation $0.0196, director x2 ~$0.055, auditors x2 ~$0.081.

Latency finding: the episode took ~7 minutes wall-clock (two high-effort
director/audit rounds). Fine for a demo run in advance; too slow as a
watch-me-wait default. Future: medium effort for the first director pass or
streaming progress expectations. Recorded, not hidden.

## Under-the-hood status vs the five docs

- AGENT.md / IMAGE.md: the shared image policy (six scenes, repairs,
  auditor) is NOT yet wired to a Muse Image endpoint — director asset IDs
  still resolve to the labelled gradient plates in the viewport. This is the
  one acceptance item from AGENT.md still open; everything else in the
  roster (gatekeeper, extractor, interpretation, director, both auditors,
  assembler via ReelAssembler-equivalent viewport) runs.
- DIRECTOR.md: beat allocation follows the 0-6 hook / method / 26-26-26
  eras / convergence / stamp shape (director produced 8 beats tiling 120s);
  result-vs-context separation enforced by prompt and visible in output.
- ATLAS.md: convergence uses approved site records in the Atlas page; the
  episode itself uses panel sources, not invented coordinates. Map routes in
  the viewport remain context lines per the atlas contract.
- STACK.md: raw genotypes and personal coordinates never reach the server
  (strict-schema enforced + tested); derived summaries are treated as
  personal information; no genotype logging.

Tests: rawEpisode (endpoint contract incl. refusal of coordinates/genotypes),
server, contracts, rawAnalysis, reel all PASS; tsc clean; vite build green.

Self-score: 8/10. Open: Muse Image wiring, episode latency.
