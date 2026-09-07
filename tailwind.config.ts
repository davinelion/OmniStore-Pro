import type { Config } from "tailwindcss";

/**
 * OmniStore design system.
 *
 * Colours resolve to CSS variables so light/dark/system switching is instant
 * and never flashes the wrong theme.
 */

const withOpacity = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/config/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: withOpacity("--bg"),
        surface: {
          DEFAULT: withOpacity("--surface"),
          2: withOpacity("--surface-2"),
          3: withOpacity("--surface-3"),
        },
        line: {
          DEFAULT: withOpacity("--line"),
          strong: withOpacity("--line-strong"),
        },
        fg: {
          DEFAULT: withOpacity("--fg"),
          muted: withOpacity("--fg-muted"),
          subtle: withOpacity("--fg-subtle"),
        },
        accent: {
          DEFAULT: withOpacity("--accent"),
          hover: withOpacity("--accent-hover"),
          soft: withOpacity("--accent-soft"),
          fg: withOpacity("--accent-fg"),
        },
        info: withOpacity("--info"),
        success: withOpacity("--success"),
        warning: withOpacity("--warning"),
        danger: withOpacity("--danger"),
        ring: withOpacity("--ring"),
      },
      fontFamily: {
        sans: [
          "InterVariable",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Noto Sans",
          "Noto Sans Bengali",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom, 0px)",
      },
      maxWidth: {
        content: "88rem",
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--shadow-color) / 0.04), 0 1px 3px rgb(var(--shadow-color) / 0.06)",
        raised:
          "0 4px 6px -1px rgb(var(--shadow-color) / 0.08), 0 10px 24px -12px rgb(var(--shadow-color) / 0.18)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "none" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.98)" },
          to: { opacity: "1", transform: "none" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 220ms ease-out both",
        "scale-in": "scale-in 160ms ease-out both",
        "slide-up": "slide-up 240ms cubic-bezier(0.32, 0.72, 0, 1) both",
      },
      screens: {
        xs: "420px",
        "3xl": "1800px",
      },
    },
  },
  plugins: [],
};

export default config;
