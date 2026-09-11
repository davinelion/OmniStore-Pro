"use client";

import { cn } from "@/lib/utils";

/**
 * Deterministic score ring (pure SVG — no layout shift, no JS measurement).
 * `value === null` renders an explicit empty state, never a fake number.
 */
export function ScoreRing({
  value,
  label,
  max = 100,
  size = 72,
  className,
}: {
  value: number | null;
  label?: string;
  max?: number;
  size?: number;
  className?: string;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = value != null && max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const color =
    value == null
      ? "rgb(var(--fg-subtle))"
      : ratio >= 0.8
        ? "rgb(var(--success))"
        : ratio >= 0.5
          ? "rgb(var(--warning))"
          : "rgb(var(--danger))";

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ? `${label}: ${value ?? "—"}` : String(value ?? "—")}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--surface-3))"
          strokeWidth={5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-semibold tabular-nums leading-none">
          {value ?? "—"}
        </span>
        {label ? <span className="mt-0.5 text-[0.6rem] text-subtle">{label}</span> : null}
      </span>
    </div>
  );
}
