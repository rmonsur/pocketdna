/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#EEB057",
        ink: "#0A0908",
        surface: "#3F3F46",
      },
      borderRadius: { card: 8, control: 8, pill: 9999 },
    },
  },
  plugins: [],
};
