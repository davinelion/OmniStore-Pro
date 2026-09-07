"use client";

import { useId, useState } from "react";
import { Check, Info, Minus, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

import type { App, ScoreFactor } from "@/lib/schemas/omnisource";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Scores are always rendered with their provenance.
 *
 * The value alone would be a claim; the factor breakdown makes it a
 * measurement, and the disclaimer makes clear what it is not.
 */

function Meter({ value }: { value: number | null }) {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500"
        style={{ width: `${value == null ? 0 : clamped}%` }}
      />
    </div>
  );
}

function FactorList({ factors }: { factors: ScoreFactor[] }) {
  return (
    <ul className="space-y-1.5">
      {factors.map((factor) => (
        <li key={factor.key} className="flex items-start gap-2 text-sm">
          <span
            className={cn(
              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
              factor.present ? "bg-success/15 text-success" : "bg-surface-3 text-fg-subtle",
            )}
            aria-hidden
          >
            {factor.present ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-medium">{factor.label}</span>
            <span className="block text-2xs text-fg-subtle">{factor.detail}</span>
          </span>
          <span className="shrink-0 tabular-nums text-2xs text-fg-subtle">
            {factor.points}/{factor.max}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ScoreCard({
  label,
  icon,
  score,
  describedBy,
}: {
  label: string;
  icon: React.ReactNode;
  score: { value: number | null; factors: ScoreFactor[] };
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-2xs uppercase tracking-wide text-fg-subtle">
            {icon}
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {score.value == null ? (
              <span className="text-base font-normal text-fg-muted">Not available</span>
            ) : (
              <>
                {score.value}
                <span className="text-sm font-normal text-fg-muted"> / 100</span>
              </>
            )}
          </p>
        </div>
      </div>

      <Meter value={score.value} />

      {score.factors.length > 0 ? (
        <>
          <button
            type="button"
            className="mt-2 text-2xs font-medium text-accent hover:underline"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Hide explanation" : "Why this score?"}
          </button>
          <div id={panelId} hidden={!open} className="mt-3 border-t border-line pt-3" aria-describedby={describedBy}>
            <FactorList factors={score.factors} />
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ScorePanel({ app, className }: { app: App; className?: string }) {
  const disclaimerId = useId();
  const { scores } = app;

  return (
    <section className={cn("space-y-3", className)} aria-label="Scores">
      <div className="grid gap-3 sm:grid-cols-3">
        <ScoreCard
          label="Trust Score"
          icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}
          score={scores.trust}
          describedBy={disclaimerId}
        />
        <ScoreCard
          label="Quality Score"
          icon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}
          score={scores.quality}
          describedBy={disclaimerId}
        />
        <ScoreCard
          label="Popularity"
          icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden />}
          score={scores.popularity}
          describedBy={disclaimerId}
        />
      </div>

      <p
        id={disclaimerId}
        className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 p-3 text-2xs text-fg-muted"
      >
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          {scores.algorithm.disclaimer} Algorithm{" "}
          <Badge tone="neutral">
            {scores.algorithm.name} {scores.algorithm.version}
          </Badge>
        </span>
      </p>
    </section>
  );
}

/** Inline score chip for cards and comparison tables. */
export function ScoreChip({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="chip" title={`${label}: ${value ?? "Not available"}`}>
      {label} {value ?? "—"}
    </span>
  );
}
