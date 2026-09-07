import type { Metadata } from "next";
import { Info } from "lucide-react";

import { getProvider } from "@/lib/api";
import { AppCard } from "@/components/app/AppCard";
import { SectionHeading } from "@/components/ui/primitives";
import { relativeTime } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trending",
  description: "Popular, recently released and fast-moving open-source applications, ranked from upstream signals.",
  alternates: { canonical: "/trending" },
};

export default async function TrendingPage() {
  const trending = await getProvider().getTrending();

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Trending</h1>
        <p className="text-muted">
          Ranked from real upstream signals — release activity, repository activity and popularity.
        </p>
        {trending.freshness ? (
          <p className="text-2xs text-fg-subtle">Catalog snapshot {relativeTime(trending.freshness)}</p>
        ) : null}
      </header>

      <p className="flex items-start gap-2 rounded-xl border border-line bg-surface-2/40 p-3 text-sm text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        OmniStore does not publish daily or weekly deltas it cannot measure. Rankings below are
        computed from the current catalog snapshot.
      </p>

      <section aria-labelledby="popular-heading" className="space-y-4">
        <SectionHeading id="popular-heading" title="Most Popular" description="Highest popularity score." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trending.popular.slice(0, 6).map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </section>

      <section aria-labelledby="released-heading" className="space-y-4">
        <SectionHeading id="released-heading" title="Recently Released" description="Newest upstream releases." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trending.released.slice(0, 6).map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </section>

      <section aria-labelledby="fast-heading" className="space-y-4">
        <SectionHeading
          id="fast-heading"
          title="Fast Moving"
          description="Projects with the shortest gap between releases."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trending.fastMoving.slice(0, 6).map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </section>
    </div>
  );
}
