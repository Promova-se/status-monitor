import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#17121C",
        surface: "#221A2A",
        "surface-2": "#2B2233",
        line: "#3A2E42",
        text: "#F4E9EF",
        muted: "#A99FB0",
        coral: "#FF8A5C",
        rose: {
          50: "#fff0f6",
          100: "#ffd9e7",
          200: "#ffb0cd",
          300: "#ff87b2",
          400: "#ff6a9f",
          500: "#ff4d8d",
          600: "#e63578",
          700: "#c02463",
          800: "#8f1a4a",
          900: "#5c1030",
        },
        good: "#3ddc97",
        warn: "#ffcc4d",
        bad: "#ff5470",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.3), 0 12px 32px rgba(0,0,0,0.25)",
        glow: "0 0 0 1px rgba(255,77,141,0.25), 0 8px 30px rgba(255,77,141,0.20)",
      },
      backgroundImage: {
        "rose-glow":
          "radial-gradient(60% 60% at 50% 0%, rgba(255,77,141,0.12) 0%, rgba(23,18,28,0) 70%)",
      },
    },
  },
  plugins: [],
};

export default config;
