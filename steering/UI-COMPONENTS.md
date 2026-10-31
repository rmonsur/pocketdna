# PocketDNA UI Components (spec sheet)

Build order: P1-P7 primitives first, then U1-U8 in demo-path order (U3 processing + U4 reel are the heroes).
One exported component per file. TS strict, Zod props at boundaries, no emoji, thin-line icons only.

Tokens (DESIGN.md): bg #0A0908, surface #3F3F46, primary/accent #EEB057, text #FFFFFF.
Type: Inter display moments, ui-monospace body/labels/metadata. Dark only.
Spacing: 8 base, gap 16, card pad 24, section 80. Radius: card 8, control 8, pill 9999.
Motion: 150-200ms ease, cross-fade + parallax, no springs. Touch targets 44pt.
Rule: check SKILLS.md open-source refs (MengTo UI, ECC react-native-patterns) before building from scratch. Ask.

## Primitives

### P1 Button (primary / secondary / pill)
Props: `label, onPress, variant, disabled`. Full-width on mobile, 8px control radius (pill 9999 for CTAs).
Accept: 44pt target, disabled state visible on dark ground, no emoji, haptic on iOS.

### P2 Card (tier card / poster card)
Props: `title, body, badge?, onPress`. Surface #3F3F46 on bg, 8px radius, pad 24, hover lift (web).
Accept: one decision per card, badge slot top-left, text never collides with badge at 390px wide.

### P3 ModelBadge + PrivacyBadge
Props: `model` (Spark | Glimmer | Image | SAM | Engine), `state` (idle | running | done | fail).
PrivacyBadge is static: Glimmer mark + "Always private". Pill, mono 11px, accent border when running.
Accept: running pulses (no spinner), done shows check + one-line artifact, fail shows retry affordance.

### P4 CitationChip
Props: `authors, year, venue?, url`. Mono 11px, meets contrast on dark ground, tap opens link.
Accept: truncated to one line with ellipsis, full cite visible in evidence sheet.

### P5 ProcessingLogRow
Props: `step, title, badge, status, artifact?`. Terminal-agent aesthetic (Muse Code ref): mono title, badge right, artifact line appears on completion.
Accept: 7 rows max visible without scroll on 844pt height; each done row shows a real artifact string.

### P6 ReelToolbar (Replay / Atlas / Share / Library)
Props: `onReplay, onAtlas, onShare, onLibrary, disabled?`. Minimal, bottom-anchored, 44pt targets.
Accept: reachable one-handed, never overlaps B7 share stamp.

### P7 BottomSheet (evidence / consent / rejection)
Props: `title, children, onClose`. Slide-up over paused content, scrim behind, swipe-to-dismiss on iOS.
Accept: reel pauses underneath, sheet scrolls independently, close restores playback state.

## Screens

### U1 UploadHub (USER_FLOW 2)
Three P2 cards: screenshot / raw file / sample. Raw card carries P3 PrivacyBadge + one-line explainer. Format list upfront (PNG/JPEG; .txt/.zip 23andMe + AncestryDNA).
Accept: judge understands both tiers in <5s; no toggle anywhere (privacy is default for raw).

### U2 ConsentSheet (USER_FLOW 3, uses P7)
Detected vendor, what happens next, data-handling one-liner ("raw file deleted after processing"), [Build my episode].
Accept: health-panel input never reaches here (R1 fires first); malformed raw shows R3 naming the cause.

### U3 Processing (USER_FLOW 4 — demo hero)
Header: "Directing your story". P5 rows x7 with P3 badges lighting up live via TanStack Query polling of orchestrator events. Completed rows show artifacts (e.g. "closest Bronze Age sample: Sintashta").
Accept: every step emits a visible event; failure degrades to partial path (R4), never a dead spinner.

### U4 ReelPlayer (USER_FLOW 5 — hero output)
9:16 stage driven by `window.__frame(t)`. 7 beats per DESIGN.md B1-B7: hook reveal, method (mono counts), 3 era beats (full-bleed scene + slow push, inset d3-geo path, ONE cited claim in kinetic Inter + plain-language explainer + P4 chip), convergence map, share stamp + QR. Silent; tap pauses + opens U5. P6 toolbar persistent.
Accept: 30-60s strict, autoplay on arrival, one idea per beat, legible at feed-scroll speed, deterministic t->frame for MP4 parity.

### U5 EvidenceLayer (USER_FLOW 5, uses P7)
Per-beat: claims -> compositions with uncertainty ranges, closest ancient samples + distances, full citations (authors, year, venue, link). NYT-scrollytelling anchoring: evidence beside story.
Accept: every kinetic claim in U4 has a matching entry here; ranges shown, "consistent with" language, no deterministic claims.

### U6 Atlas (USER_FLOW 6)
react-globe.gl offline bundle + era slider snapping to Bronze / Middle / Modern; node tap jumps to U4 beat. Degrade path: 3 static per-era maps.
Accept: zero network calls; slider snap <200ms; if globe slips, static maps ship instead.

### U7 Share (USER_FLOW 7)
MP4 export progress (Modal job) -> OS share sheet. Reel is the viral asset (IG/FB/Threads reels + stories).
Accept: export progress visible; failure keeps reel playable + retry; zero Graph API imports in repo (grep-clean).

### U8 Library + Welcome + Landing (USER_FLOW 1, 1b, 8)
Welcome: "Your DNA results have a story. Watch it." + [Make your Reel] + [Watch a sample Reel]. Landing adds drag/paste-anywhere -> Tier 1 + sample above fold + OG tags. Library: poster wall keyed by local device ID, sample always present. No auth.
Accept: link-to-processing in one gesture on web; cold open with no DNA still plays sample.

### U9 RejectionStates (R1-R5, all via P7 or inline)
R1 health: respectful ancestry-only refusal + why-link. R2 illegible: ask for composition screen + example crop. R3 malformed: named cause + re-export help. R4 partial: available beats + retry. R5 open-weights down: wait/retry OR explicit hosted consent (never silent/default).
Accept: each state has copy, next action, and a fixture test; no default alerts.

## Build order (strict)

1. P1, P2, P3 (everything else needs them)
2. U8 Welcome + sample reel stub (unblocks daily demo)
3. U1, U2, U9-R1/R2/R3 (intake loop closable)
4. U3 processing log with mocked events (demo hero early)
5. U4 reel player + P6 (real engine as it lands)
6. U5 evidence, P4, P7 (credibility layer)
7. U7 share + export wiring
8. U8 landing/OG + Library
9. U6 atlas (or static degrade)
10. U9-R4/R5 + full pass: 44pt targets, contrast, 390x844 fixture screenshots for A6 QA
