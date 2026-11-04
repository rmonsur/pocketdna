---
name: "PocketDNA Design System"
description: "PocketDNA Design System is designed for adding visual depth with decorative background effects. Key features include layered visual treatments and atmospheric effects. Built with Tailwind CSS, it is suitable for hero backdrops and visual-first layouts. It includes animated visual treatment for stronger visual hierarchy. Interaction states are designed for practical user flows."
aesthetic goal: "National Geographic documentary meets Apple polish. The app should feel like a produced film about you, not a dashboard about data. Dark, cinematic ground; warm archival accents; generous type. If a screen could plausibly belong to a banking app, redesign it. We want to avoid AI slop. You will use open source references instead of creating things from scratch e.g card, carousel etc. Always ask. Visual polish is critical. 1 FEATURE DONE WELL beats 3 shoddy poorly made features. Optimize for WOW moment/AHA moments."

colors:
  primary: "#EEB057"
  secondary: "#000000"
  tertiary: "#C8F45B"
  neutral: "#000000"
  background: "#EEB057"
  surface: "#000000"
  text-primary: "#A3A3A3"
  text-secondary: "#FFFFFF"
  border: "#FFFFFF"
  accent: "#EEB057"
typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: "60px"
    fontWeight: 300
    lineHeight: "79.2px"
    letterSpacing: "-0.05em"
  body-md:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "19.5px"
  label-md:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
rounded:
  md: "0px"
  full: "9999px"
spacing:
  base: "4px"
  sm: "4px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  gap: "8px"
  card-padding: "16px"
  section-padding: "24px"
components:
  button-primary:
    backgroundColor: "#18181B"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "8px"
  button-link:
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "0px"
  card:
    backgroundColor: "#F5F5F5"
    rounded: "2px"
    padding: "24px"
---

## Aesthetic Overview

- **Composition cues:**
  - Layout: Grid
  - Content Width: Full Bleed
  - Framing: Glassy
  - Grid: Strong

## Colors

The color system uses dark mode with #EEB057 as the main accent and #000000 as the neutral foundation.

- **Primary (#EEB057):** Main accent and emphasis color.
- **Secondary (#000000):** Supporting accent for secondary emphasis.
- **Tertiary (#C8F45B):** Reserved accent for supporting contrast moments.
- **Neutral (#000000):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #EEB057; Surface: #000000; Text Primary: #A3A3A3; Text Secondary: #FFFFFF; Border: #FFFFFF; Accent: #EEB057

- **Gradients:** bg-gradient-to-r from-dark to-dark via-transparent

## Typography

Typography relies on Inter across display, body, and utility text.

- **Display (`display-lg`):** Inter, 88px, weight 300, line-height 79.2px, letter-spacing -0.05em.
- **Body (`body-md`):** Inter, 12px, weight 400, line-height 19.5px.
- **Labels (`label-md`):** Inter, 12px, weight 500, line-height 16px.

## Layout

Layout follows a grid composition with reusable spacing tokens. Preserve the grid, full bleed structural frame before changing ornament or component styling. Use 4px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a grid / full bleed composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Grid
- **Content width:** Full Bleed
- **Base unit:** 4px
- **Scale:** 4px, 8px, 10px, 12px, 16px, 20px, 24px, 32px
- **Section padding:** 24px, 40px
- **Card padding:** 16px, 24px
- **Gaps:** 8px, 12px, 24px, 32px

## Elevation & Depth

Depth is communicated through glass, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as glass first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Glass
- **Borders:** 1px #FFFFFF; 1px #EEB057; 1px #D4D4D4
- **Shadows:** rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(238, 176, 87, 0.4) 0px 0px 20px 0px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.25) 0px 25px 50px -12px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(238, 176, 87, 0.1) 0px 0px 15px 0px
- **Blur:** 12px, 4px

### Techniques
- **Gradient border shell:** Use a thin gradient border shell around the main card. Wrap the surface in an outer shell with 0px padding and a 0px radius. Drive the shell with linear-gradient(to right, rgb(10, 9, 8), rgba(0, 0, 0, 0), rgb(10, 9, 8)) so the edge reads like premium depth instead of a flat stroke. Keep the actual stroke understated so the gradient shell remains the hero edge treatment. Inset the real content surface inside the wrapper with a slightly smaller radius so the gradient only appears as a hairline frame.

## Shapes

Shapes rely on a tight radius system anchored by 2px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 2px, 4px, 8px, 9999px
- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Anchor interactions to the detected button styles. Reuse the existing card surface recipe for content blocks.

### Buttons
- **Primary:** background #18181B, text #FFFFFF, radius 9999px, padding 8px, border 1px solid rgba(0, 0, 0, 0).
- **Links:** text #A3A3A3, radius 0px, padding 0px, border 0px solid rgb(229, 231, 235).

### Cards and Surfaces
- **Card surface:** background #F5F5F5, border 0px solid rgb(229, 231, 235), radius 2px, padding 24px, shadow none.

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 4px rhythm.
- Do reuse the Glass surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 2px, 4px, 8px, 9999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 150ms and 2000ms. Easing favors ease and 0. Hover behavior focuses on text and opacity changes.

**Motion Level:** moderate

**Durations:** 150ms, 2000ms, 6000ms

**Easings:** ease, 0, 0.2, 1), cubic-bezier(0.4, cubic-bezier(0

**Hover Patterns:** text, opacity, color

