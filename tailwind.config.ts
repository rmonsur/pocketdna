/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "background-obsidian": "#080706",
        "surface-charcoal": "#12110F",
        surface: "#141311",
        "surface-container-high": "#2B2A27",
        "surface-container": "#211F1D",
        "surface-container-lowest": "#0F0E0C",
        "surface-translucent": "rgba(24, 23, 21, 0.75)",
        "border-glass": "rgba(255, 255, 255, 0.12)",
        "archival-amber": "#EEB057",
        "bio-lime": "#C8F45B",
        primary: "#FFCF91",
        "on-surface": "#E6E2DE",
        "on-surface-variant": "#D5C4B2",
        "text-primary": "#FFFFFF",
        "text-muted": "#A3A3A3",
      },
    },
  },
  plugins: [],
};
