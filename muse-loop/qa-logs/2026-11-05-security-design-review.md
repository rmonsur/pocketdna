# Security hardening + design review — 2026-11-05 (addendum)

Skills used: `security-and-hardening` (Addy Osmani agent-skills) and `impeccable`
(pbakaus/impeccable), both installed at user scope this session.

## Security and hardening (security-and-hardening skill)

Threat model (5-minute pass). Trust boundaries: browser → Hono API (multipart upload,
SSE), Hono → Meta Model API (screenshot bytes leave the machine; raw genotypes never
do), LLM output → Zod schemas → DOM, filesystem (`.env`, `.local/` cache + cost log,
`dataset/`). Assets: Meta API key, user DNA screenshots, personal genome file, paid-call
budget. STRIDE highlights: spoofing/tampering are low on a 127.0.0.1 single-user server;
information disclosure (secrets, genome, upstream error bodies) and denial of wallet
(unbounded paid jobs) are the real risks.

Applied this session:
- Security headers on every API/static response (CSP `default-src 'self'`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
  no-referrer`) in `src/server/app.ts`; asserted in `tests/server.test.ts`.
- Error bodies genericized: upstream `ModelCallError` detail no longer reaches the
  client (it stays in `.local/last-model-failure.json`).

Verified against the skill checklist: input validated at boundary (Zod + magic-byte
sniff + 10 MB cap, previous session); LLM output treated as untrusted (strict JSON
schemas + Zod parse before any use; rendered via React escaping; no `eval`/`innerHTML`
anywhere in `src/`); secrets env-only, `.env`/`.local/` ignored; raw genotypes rejected
server-side; model fetch now time-bounded; server bound to 127.0.0.1; no secrets or PII
in LLM context beyond the user-submitted screenshot itself (its stated purpose).
No SQL/shell anywhere. `localStorage` holds only the Library poster wall (no tokens).

Open, accepted for a local single-user hackathon build (revisit before any hosting):
no rate limit / concurrency cap on `POST /api/jobs` (each job can spend paid credits;
127.0.0.1 binding is the current mitigation); zod 3→4 upgrade for GHSA-mrhx-c7xc-m3w5;
no auth (by design locally — mandatory before any non-localhost deployment).

## Impeccable audit (technical scan; document-only per playbook)

Scores 0–4 per dimension, from measured evidence (grep counts, detector, bundle):

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 1 | 0 `focus-visible` styles, 0 `prefers-reduced-motion`, 7 aria attrs total, 9–10px text (detector) |
| 2 | Performance | 2 | Single 786 KB JS bundle (Three.js not split); no lazy loading; CSS-gradient plates are cheap |
| 3 | Theming | 2 | Token system exists but drifts from DESIGN.md; 15 hard-coded hex lines in components |
| 4 | Responsive | 2 | No ≥44px touch-target sizing on controls; fixed-height reel; tiny mono labels |
| 5 | Implementation integrity | 2 | Detector: 12 anti-patterns + 2 advisories on the live page (oversized H1, dark glow, pulsing dots) |
| **Total** | | **9/20** | **Poor — major overhaul of the a11y/motion layer, not of the concept** |

## Impeccable critique (two isolated sub-agents, synthesized)

Provenance: Assessment A (design review) and Assessment B (detector + measured
evidence) ran as separate sub-agents; neither saw the other's output. Detector ran
successfully against the live page (exit 2, findings above) — not a degraded run.

A's verdict: "Partially grounded, drifting template" — the obsidian/amber/lime world
and era chapters are product-specific, but gradient plates + decorative waveform would
fit any AI-video tool. Nielsen scores: status 3, real-world match 3, control 2,
consistency 2, error prevention 2, recognition 3, flexibility 2, minimalism 2,
error recovery 3, help 1. Priority issues (A): privacy vacuum at the dropzone;
evidence tooltip under-delivers the required drawer; dishonest affordances (waveform
implies narration; "Export 9:16" shares a link); no processing cancel; autoplay without
reduced-motion respect. B corroborates the mechanical layer: no focus styles, no
reduced-motion guards, undersized text/targets.

Convergent top three: (1) privacy statement at the dropzone, (2) evidence drawer,
(3) focus + reduced-motion + text-size floor. These overlap the earlier code-review
Spec findings (evidence drawer, deferred audio) — three independent passes agree.

Self-score: 7/10. Reviews are evidence-backed and the security fixes are tested, but
the design findings are documented, not yet fixed (audit playbook is document-only).
