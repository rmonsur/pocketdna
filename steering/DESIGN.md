# Design Direction

## Aesthetic thesis

"National Geographic documentary meets Apple polish." The app should feel like a produced
film about you, not a dashboard about data. Dark, cinematic ground; warm archival accents;
generous type. If a screen could plausibly belong to a banking app, redesign it.

We want to avoid AI slop. You will use open source references instead of creating things from scratch e.g card, carousel etc. Always ask. Visual polish is critical. 

1 FEATURE DONE WELL beats 3 shoddy poorly made features. 

Optimize for WOW moment/AHA moment. 

## Design tokens

## Colors
Anchor the palette in primary #EEB057, secondary #0A0908, accent #EEB057, background #0A0908, surface #3F3F46, text-primary #FFFFFF. Keep background, surface, text, and border roles distinct so generated layouts retain the same contrast pattern as the source. 

Light mode: skip. One committed cinematic dark look; document the choice.

## Typography
Use Inter for display moments and ui-monospace for body copy unless the HTML clearly demands a compatible fallback. Labels and technical metadata should use ui-monospace or an equivalent mono face.

## Layout
Keep spacing deliberate and stable. Favor the same grid direction, max-width behavior, card density, and responsive stacking seen in the HTML. Do not replace distinctive source structures with generic SaaS sections.
- Base: 8px
- Gap: 16px
- Card Padding: 24px
- Section Padding: 80px

## Radius

- Card: 8px
- Control: 8px
- Pill: 9999px

## Motion
Preserve existing motion cues such as masked reveals, staggered entrance, hover lift, scroll-triggered transitions, and ambient movement. Keep easing smooth and restrained. Slow, confident: cross-fades and parallax on story cards; no bouncy springs

- Level: Moderate 150-200ms
- Easing: ease
- Hover: text/color

## Components
Cards, buttons, badges, navigation, and repeated blocks should preserve the source geometry, border treatment, and hover feel.'

## Iconography 
Thin-line, no emoji anywhere (hard rule) 


## Per-feature quality reference (playbook: one reference per feature)

| Feature | Reference | What to steal |
|---------|-----------|---------------|
| The Reel | Spotify Wrapped x Nat Geo title sequences | Full-bleed pacing, one idea per beat, kinetic type as narration, cinematic reveals |
| Reel motion engine | fil.design html-reel clock pattern | Every element a pure function of t; retiming and MP4 export fall out for free (pattern only — engine written in-event) |
| Narrative + citation layout | NYT scrollytelling features | Evidence anchored beside story, not hidden behind taps |
| Time-slider atlas | Kurzgesagt map sequences / OldMapsOnline | Lineage paths drawn over terrain, era-appropriate map styling |
| Processing screen | Muse Code / terminal agent aesthetics | Live step log that makes the agent's work legible and impressive |
| Upload flow | Things 3 / Linear | One decision per screen, zero clutter |
| Share card | Wrapped share assets | Instantly readable at feed-scroll speed |
| Overall polish bar | Linear | Spacing discipline, restrained color, no decoration without purpose |

## Key screens (specs in USER_FLOW.md)

1. Welcome: one sentence, one CTA. The Reddit-screenshot pain shown as a subtle backdrop collage
2. Upload: two tier cards (screenshot / raw file )
3. Processing: the agent's live step log — THIS IS A DEMO HERO SCREEN. Each step with model
   badge (Muse Spark, projection engine on Modal, Muse Glimmer, Muse Image) lighting up as it runs
4. The Reel (hero output): 30-60s STRICT, 9:16, 7 beats —
   B1 Hook: your oldest/rarest signal, one line, black screen to scene reveal
   B2 Method beat: marker count, N ancient genomes compared, engine credibility (ui-monospace)
   B3-B5 Era beats (Bronze Age -> Middle Ages -> Modern): full-bleed scene from the
   pregenerated Muse Image library (on-the-fly only for uncommon populations) with slow push,
   inset animated d3-geo map path, ONE cited claim in kinetic Inter display type plus a short
   plain-language explainer, citation chip
   B6 Convergence: all map paths animate into the user's present location
   B7 Share stamp: PocketDNA mark + QR
   Core reel is silent; kinetic typography IS the narration. Voiceover (Kokoro-82M + Voice
   Transcribe sync) is STRETCH ONLY, built if everything else is 100%.
   Tap anywhere -> pause + evidence layer
5. Evidence layer (slide-up over paused reel): the beat's claims, compositions with uncertainty
   ranges, closest ancient samples with distances, full citations
6. Evidence sheet: every claim -> citation list (authors, year, link). The credibility surface
7. Share card composer: pick scene, one-line hook, PocketDNA stamp
8. Rejection states: health-panel refusal (clear, respectful, explains why), unsupported vendor,
   failed job — all designed, not default alerts

## Scene generation style guide (Muse Image)

- Locked style prefix for every prompt: painterly archival realism, consistent palette with
  app tokens, no text in image, no identifiable faces, era- and region-accurate dress/landscape
- Negative constraints: no fantasy tropes, no ethnic caricature, no modern artifacts,
  NO battle/war/violence imagery, no weapons as focal subjects, no military iconography —
  migrations are shown as journeys, landscapes, settlements, craft, and daily life
  (hackathon ban: "anything political or involving war" — the scene generator is the
  likeliest place to violate it accidentally)
- 3 candidates per scene; Muse Spark scores against the style guide and beat content,
  picks one (log scores — this is the "AI scores its own work" playbook item made visible)
- Generation strategy (Oct 30): a PREGENERATED library covers era/population combos
  (e.g., Anatolian farmer, Yamnaya pastoralist camp, medieval market town), produced at build
  time with the above process. At $0.01/image be generous with coverage. On-the-fly generation
  exists in Tier 1 only, for uncommon populations, hard-capped; Tier 2 (raw file) is
  library-only so the privacy claim stays absolute. SAM 3.1 parallax masks are cut at build
  time over the library

## Accessibility and credibility

- Citation chips meet contrast on dark ground; all touch targets 44pt
- Confidence language: compositions show ranges, narrative uses "consistent with", never
  deterministic claims — credibility IS the design differentiator vs existing tools
