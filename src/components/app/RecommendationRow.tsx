"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import type { App } from "@omnistore/shared-models";
import { AppCard } from "./AppCard";

/**
 * Horizontal recommendation row. Reasons come from OmniSource's engine and
 * are surfaced as accessible descriptions — nothing is ranked client-side.
 */
export function RecommendationRow({
  title,
  subtitle,
  apps,
  reasons,
}: {
  title: string;
  subtitle?: string;
  apps: App[];
  reasons?: Map<string, string>;
}) {
  if (apps.length === 0) return null;
  return (
    <section aria-label={title} className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Sparkles className="h-4.5 w-4.5 text-accent" aria-hidden />
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {apps.slice(0, 10).map((app) => (
          <div key={app.id} className="w-[15.5rem] shrink-0 snap-start sm:w-[16.5rem]">
            <AppCard
              app={app}
              aria-describedby={reasons?.get(app.id) ? `${app.id}-reason` : undefined}
            />
            {reasons?.get(app.id) ? (
              <p id={`${app.id}-reason`} className="mt-1 px-1 text-2xs text-subtle">
                {reasons.get(app.id)}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecommendationLinkCard({ app }: { app: App }) {
  return (
    <Link href={`/app/${app.slug}`} className="card p-3 text-sm hover:shadow-card">
      {app.name}
    </Link>
  );
}
