"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const MODES = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

/**
 * Theme selector: system / light / dark, persisted by next-themes.
 *
 * The button renders a stable placeholder until mounted so the server-rendered
 * markup matches the client and the wrong theme never flashes.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className={cn("h-9 w-9 rounded-full border border-line", className)} aria-hidden />;
  }

  const current = MODES.find((mode) => mode.value === theme) ?? MODES[0];

  return (
    <div
      className={cn("inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5", className)}
      role="group"
      aria-label="Colour theme"
    >
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const active = mode.value === current.value;
        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => setTheme(mode.value)}
            aria-pressed={active}
            aria-label={mode.label}
            title={mode.label}
            className={cn(
              "rounded-full p-1.5 transition-colors",
              active ? "bg-accent-soft text-accent" : "text-fg-subtle hover:text-fg",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
