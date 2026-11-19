import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a1020",        // page background (deep navy)
        surface: "#111a2e",    // cards
        raised: "#16223a",     // inputs, hovered rows
        line: "#243252",       // borders
        fg: "#e6ecf7",         // main text
        muted: "#93a1bd",      // secondary text (passes AA on ink)
        cyan: { DEFAULT: "#38d4f2" },
        blue: { DEFAULT: "#4c7dff" },
        violet: { DEFAULT: "#8b6cff" },
        ok: "#34d399", warn: "#fbbf24", bad: "#f87171",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
