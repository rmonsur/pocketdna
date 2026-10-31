/** Design tokens (DESIGN.md). Single source for raw values; NativeWind mirrors in tailwind.config.js. */

export const colors = {
  primary: "#EEB057",
  secondary: "#0A0908",
  accent: "#EEB057",
  background: "#0A0908",
  surface: "#3F3F46",
  textPrimary: "#FFFFFF",
} as const;

export const spacing = {
  base: 8,
  gap: 16,
  cardPadding: 24,
  sectionPadding: 80,
} as const;

export const radius = {
  card: 8,
  control: 8,
  pill: 9999,
} as const;

export const motion = {
  durationMs: 175,
  easing: "ease",
} as const;

export const fonts = {
  display: "Inter",
  body: "ui-monospace",
} as const;
