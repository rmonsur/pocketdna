# 2026-11-05 export-atlas — score 8/10
Works: 1/2. Spec: 2/2. Compliant: 2/2. Clean: 2/2. Shippable: 1/2.
Spec refs: STACK 8/9, ATLAS.md, AGENT.md export step.
Shots: pending (exporter runs against the live local app).
Manifest: muse-loop/qa-logs/SHA256SUMS-fixtures (8 files appended).
Mistakes seen: exporter fetch guard missed connection-refused throws (fixed, exit 2 verified).
Fix applied: try/catch around replay fetch; frame math + manifest unit-tested (3600 frames @30fps, DOIs, replay limitations).
Cost: $0.
Verdict: continue — atlas (Three.js globe + SVG fallback + wheel of time + verifier-tested sites) and export (deterministic t-stepping + manifest) are in. Full MP4 needs the app running locally; all prereqs (playwright, chromium, ffmpeg) now installed. Next: one deliberate live screenshot run, then the first real MP4.
