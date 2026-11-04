# Design fixes — 2026-11-05

Built the three convergent findings from the code review, security pass, and
impeccable critique (user: "in any order go ahead").

1. **Evidence drawer** (`src/components/EvidenceDrawer.tsx`, replaces the deleted
   `EvidenceTooltip.tsx`): bottom sheet inside the reel with DESIGN's five sections —
   what your report says, why it reports that, historical context, sources (with DOI
   links), limitations. Shows all claims attached to the beat, not just the first.
   Accessible: `role="dialog"`, `aria-modal`, labelled title, Escape closes, Tab cycles
   inside, focus moves to Close on open and returns to the headline button on close.
   Opening pauses playback; closing never resumes it (resume is player-only, per spec).
2. **Dropzone privacy statement** (`UploadCard.tsx`): per-tab, at the moment of need.
   Screenshot copy states the image goes to Meta's Muse API, that PocketDNA keeps
   nothing (no account/database/analytics), and that health screens are refused. Raw
   copy states the designed on-device model, and honestly that the browser engine has
   not shipped yet so raw files are currently refused on-device.
3. **Accessibility floor**: global `:focus-visible` lime outline; `prefers-reduced-motion`
   block (animations/transitions near-instant, end states preserved) plus the reel no
   longer autoplays under reduced motion; all 9–10px text in the viewport raised to
   11px; beat segments now 24px hit areas, era pills 36px, player controls 40px,
   drawer close 44px.

Verification: `npx tsc --noEmit` PASS, `npx vite build` PASS, all eight Node test
files PASS (server, contracts, reel, client, atlas, export, modelJson,
extractor-rejection), 30 Python tests PASS (previous run). No DOM test harness exists
in this repo, so drawer behavior was verified by typecheck, build, and code-level
focus/ARIA inspection rather than a browser automation run — recorded honestly.

Self-score: 8/10. Remaining design debt from the audit (786 KB bundle split, privacy
copy in footer/help surfaces, detector's oversized-H1/glow items) is documented in
2026-11-05-security-design-review.md, not hidden.
