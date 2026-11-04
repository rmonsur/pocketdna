# 2026-10-31 review-fixes + web-only pivot — score 9/10
Works: 2/2. Spec: 2/2. Compliant: 2/2. Clean: 2/2. Shippable: 1/2 (not yet committed; Glimmer fix 6 unverified without GPU).
Spec refs: ../pocketdna-fixes.md items 1-10, steering/PIVOT-2026-10-31.md, RULES.md privacy + error handling.
Fixtures: demo/fixtures/sample-reel.json (b4 rewritten to match c-viking-margaryan2020), pipeline/fixtures/mini-genome.txt.
Shots: none (backend + config change; screens unchanged).
Evidence: pytest 29 passed (3 new regression tests: job status 200 with events, A1 error branch -> R2,
call_open refuses hosted provider); tsc --noEmit clean; live uvicorn smoke: sample 200, raw upload runs
engine steps 1-4 then honest R5 under kill switch, GET job 200 with 7 events, PNG under kill switch ->
typed R4, junk -> R2.
Mistakes seen: og:image fix as written in the review would have thrown on local export (judges run
locally per pivot); changed to warn-and-stay-relative when EXPO_PUBLIC_SITE_URL is unset.
Fix applied: all ten items; item 6 (vLLM init_app_state) applied but needs `modal deploy` + curl smoke.
Cost: 0 paid calls (KILL_PAID_CALLS=1 throughout).
Verdict: commit
