import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f8",
          100: "#eceef1",
          200: "#d5dbe1",
          800: "#1c2430",
          900: "#0f141b",
          950: "#0a0d12",
        },
        accent: {
          DEFAULT: "#0f7a62",
          fg: "#e8faf4",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
