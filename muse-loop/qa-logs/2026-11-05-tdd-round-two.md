# TDD round two — 2026-11-05

Second test round under the Pocock `tdd` skill: behavior at public seams,
expected values from the spec/docs, no internal mocking.

Added:
- `tests/round-two.test.ts` (27 assertions):
  - Contracts: 89s/151s plans rejected (the 90–150s rule), unknown evidence
    kind rejected, provider evidence requires a vendor, JobStatus defaults.
  - Film engine: time clamping, beat-boundary ownership, fade alpha 0 at beat
    start and 1 mid-beat, camera push 1.09 at beat midpoint.
  - Export: frame counts (120s@10fps = 1200, last frame 119.9), manifest
    carries 1080x1920/silent spec and mirrors claim citations.
  - Atlas: approved sites verify; duplicate ids and unknown claim refs are
    reported by name.
  - Harmonization: duplicated rsid keeps the first call; CRLF, comments, and
    space-separated rows parse.
  - Bundle validation rejects shape mismatches (QcError); bootstrap is
    deterministic under a fixed seed and its range brackets the fit; a target
    placed exactly on a panel centroid fits that source at weight 1.
- `tests/rateLimit.test.ts` (own process): first 10 job attempts pass the
  limiter, the 11th inside a minute returns a typed 429.

Result: all 13 Node test files + experimentalProjection pass, `tsc` clean,
`vite build` green, Python 34 passed. Nothing in production code changed this
round; the suite simply got harder to regress against.

Self-score: 8/10.
