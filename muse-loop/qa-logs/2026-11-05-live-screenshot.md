# 2026-11-05 live-screenshot — score 8/10
Works: 1/2. Spec: 2/2. Compliant: 2/2. Clean: 2/2. Shippable: 1/2.
Spec refs: STACK 7/8/10, AGENT roster, mockup (layout guide only).
Shots: pending human browser check against the live key.
Manifest: muse-loop/qa-logs/SHA256SUMS-fixtures (27 files appended).
Mistakes seen: UploadCard referenced setNotice before the hook exported it (caught by tsc, fixed); server import paths (prior round).
Fix applied: hook export + stale notice copy; ReelViewport widened to ViewingBundle.
Cost: $0 (all offline; kill-switch R5 path exercised end to end).
Verdict: continue — screenshot path wired upload -> jobs -> SSE -> audits -> live player; offline tests prove the failure lanes. Next gate is one deliberate live run with the key (a few cents), then Playwright/FFmpeg export + atlas.
