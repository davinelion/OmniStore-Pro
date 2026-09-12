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
          2: withOpacity("--accent-2"),
          hover: withOpacity("--accent-hover"),
          soft: withOpacity("--accent-soft"),
          fg: withOpacity("--accent-fg"),
        },
        glass: withOpacity("--glass"),
        info: withOpacity("--info"),
        success: withOpacity("--success"),
        warning: withOpacity("--warning"),
        danger: withOpacity("--danger"),
        ring: withOpacity("--ring"),
      },
      fontFamily: {
        display: [
          "Space Grotesk Variable",
          "Space Grotesk",
          "Inter Variable",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        sans: [
          "Inter Variable",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI Variable Display",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Noto Sans",
          "Noto Sans Bengali",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono Variable",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
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
        glass:
          "0 1px 2px rgb(var(--shadow-color) / 0.06), 0 8px 32px -12px rgb(var(--shadow-color) / 0.3)",
        glow: "0 0 0 1px rgb(var(--accent) / 0.25), 0 8px 40px -8px rgb(var(--accent) / 0.45)",
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
        "aurora-drift": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(3%,-4%,0) scale(1.08)" },
          "66%": { transform: "translate3d(-3%,3%,0) scale(0.95)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 220ms ease-out both",
        "scale-in": "scale-in 160ms ease-out both",
        "slide-up": "slide-up 240ms cubic-bezier(0.32, 0.72, 0, 1) both",
        aurora: "aurora-drift 24s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
      },
      screens: {
        xs: "420px",
        "3xl": "1800px",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
