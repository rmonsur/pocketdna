# PocketDNA design system

National Geographic documentary meets Apple polish: a dark, cinematic film with warm archival accents, generous type and a clear “why” experience. This is the canonical visual specification for [STACK.md](STACK.md), [DIRECTOR.md](DIRECTOR.md), [IMAGE.md](IMAGE.md) and [ATLAS.md](ATLAS.md). Scope and delivery priorities are in [ABOUT.md](ABOUT.md).

## Tokens

| Role | Value |
| --- | --- |
| Background | `#000000` / warm charcoal `#0A0908` |
| Surface | `#18181B`, optionally translucent over the dark background |
| Primary text | `#FFFFFF` |
| Secondary text | `#A3A3A3` |
| Historical emphasis | Amber `#EEB057` |
| Primary action / status accent | Lime `#C8F45B`, dark text |
| Border | `rgba(255,255,255,0.16)`; restrained amber emphasis where needed |
| Font | Locally bundled Inter throughout |
| Display | Responsive 48–88 px desktop, 36–48 px mobile; weight 300; line-height 1.05; tracking −0.05em |
| Body | 16 px; weight 400; line-height 1.5 |
| Utility labels | 12–14 px; weight 500; line-height 1.35 |
| Spacing | 4 px base; 4, 8, 12, 16, 20, 24, 32, 40, 48 px |
| Radii | 8 px controls; 16 px cards; 24 px main panels; 9999 px pills |
| Icons | Locally bundled Solar outlines |

Amber is an emphasis color; page backgrounds and cards stay dark. Lime identifies the principal action. Use readable contrast, paired labels/patterns for color-coded evidence, and visible keyboard focus. Do not use unsupported confidence percentages as visual decoration.

## Layout and controls

Preserve a generous headline, upload card, clear generation action and large portrait preview. Use a responsive grid on desktop; stack upload and player on mobile. Use full-bleed imagery inside the 9:16 film. Keep page controls outside its export-safe region.

Use accessible shadcn/ui/Radix primitives where appropriate, with licenses recorded. Reuse one component system and token scale. Main panels use restrained glass blur (4–12 px), subtle hairline borders and moderate shadows; avoid opaque white cards and excessive glow. Primary buttons use lime, dark text and generous touch targets. Secondary buttons use dark surfaces and white text.

Build in dependency order: shell and tokens → upload/sample selection → extraction correction and raw QC → generation status → player/chapter controls → evidence drawer → export/download. These are planned components, not a claim that the prototype already implements them.

## Film and evidence experience

The film is 90–150 seconds, default 120, silent-first. Apply [DIRECTOR.md](DIRECTOR.md)'s caption timing and [IMAGE.md](IMAGE.md)'s composition-safe regions. Historical illustrations are labelled reconstructions. Map labels and routes come from [ATLAS.md](ATLAS.md)'s approved records.

Clicking a claim pauses playback and opens an accessible drawer, or a sheet on mobile. Explain what the report/model says, why it reports that result, the related historical context, sources and limitations. Restore focus on close; resume only through an explicit player action. A tooltip alone does not fulfill this requirement. MP4 exports include readable source cues and a companion evidence manifest, since exported video is not interactive.

Present actual provider labels or measured QC values. Never show fabricated “99.8% confidence,” IBD phases, exact personal migration dates or unsupported vendor versions. The convergence scene groups approved locations/affinities with a legend; it does not trace paths to a personal location.

## Motion

Film animation is a pure function of the absolute scene time, including seeking and export. Use controlled 2–6 second camera moves and readable caption holds; duration comes from the ReelPlan. UI transitions can use 150–200 ms CSS motion with `ease` or `cubic-bezier(0.4, 0, 0.2, 1)`. Respect reduced-motion preferences for interface behavior; provide pause, scrub and replay.

## Required states and review

Design empty/sample selection, drag/drop, invalid file, unsupported vendor/build, rejected health panel, extraction correction, low-overlap/poor-fit result, progress, cancellation, retry, service failure, budget exhaustion, live/cache/replay labels, no-WebGL fallback, export progress and download. Every failure has a specific recovery action; no indefinite spinner.

Review the actual phone-size player muted, keyboard navigation, focus order, readable contrast, caption clearance and exported chapter-boundary frames. Follow [RULES.md](RULES.md)'s ancestry-only, no-battle and no-political-framing constraints in both imagery and copy.
