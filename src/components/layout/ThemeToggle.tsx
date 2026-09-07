"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const modes = ["system", "light", "dark"] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="h-9 w-9" />;
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const next = modes[(modes.indexOf((theme as (typeof modes)[number]) || "system") + 1) % modes.length];
  return (
    <button
      type="button"
      className="rounded-full border border-[var(--line)] p-2"
      aria-label={`Theme: ${theme}. Switch to ${next}`}
      onClick={() => setTheme(next)}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
