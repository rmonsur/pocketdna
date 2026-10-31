# 2026-10-31 tier2-unpark — score 9/10
Works: 2/2. Spec: 2/2. Compliant: 2/2. Clean: 2/2. Shippable: 1/2.
Spec refs: CHECKLIST 6 (unparked), STACK.md pipeline detail, AGENTS_PIPELINE.md ENGINE + Tier 2 agents.
Shots: n/a (engine + API).
Manifest: muse-loop/qa-logs/SHA256SUMS-fixtures (engine, parsers, openweights, jobs, tests appended).
Mistakes seen: (1) ancestry header guard skipped all rs lines; (2) lowercase rsid header counted as data in both parsers; (3) test tolerance tighter than the quantization noise floor (fixed expectation with documented floor, added exact-continuous test). All caught by the suite, fixed, suite green.
Fix applied: parsers fixed + 2000-SNP fixture + noise-floor-aware assertions + api/jobs split so orchestration tests run without multipart.
Cost: $0.
Verdict: continue — 25 pass + 1 skip (sample endpoint needs python-multipart: `pip3 install -r backend/requirements.txt`). Engine math exact to 1e-16, weights recover within 0.06, Tier 2 runs end to end on the labeled mini panel. Remaining for production Tier 2: real AADR panel via build_panel.py, Glimmer endpoint deploy (serve.py unverified), smartpca oracle CI (r > 0.99).
