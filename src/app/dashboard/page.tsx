import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowUpRight, BarChart3, Boxes, GitPullRequest, PackageCheck, Rocket, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getOmnisource } from "@/lib/omnisource";
import { orFallback } from "@/lib/omnisource/with-fallback";
import { formatCompactNumber, formatDateTime } from "@/lib/formatters";
import { AppCard } from "@/components/app/AppCard";
import { Card, SectionHeading } from "@/components/ui/primitives";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Developer dashboard",
  description: "Live OmniSource catalog metrics, releases and submission workspace.",
  robots: { index: false },
};

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const client = getOmnisource();
  const [stats, latest, popular, collections, developers] = await Promise.all([
    orFallback(client.getStats(), null, "dashboard stats"),
    orFallback(client.getRecent(), [], "dashboard releases"),
    orFallback(client.getPopular(6), { items: [], pagination: { page: 1, perPage: 6, total: 0, totalPages: 0 } }, "dashboard apps"),
    orFallback(client.getCollections(1, 12), { items: [], pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 } }, "dashboard collections"),
    orFallback(client.getDevelopers(1), [], "dashboard developers"),
  ]);

  const metrics = [
    { label: t("catalogApps"), value: stats ? formatCompactNumber(stats.apps) : "—", icon: Boxes },
    { label: t("releases"), value: stats ? formatCompactNumber(stats.releases) : "—", icon: Rocket },
    { label: t("developers"), value: stats ? formatCompactNumber(stats.repositories) : "—", icon: Users },
    { label: t("collections"), value: formatCompactNumber(collections.pagination.total), icon: PackageCheck },
  ];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-4xl border border-line bg-gradient-to-br from-accent-soft via-surface to-surface p-6 sm:p-10">
        <div aria-hidden className="absolute -end-20 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{t("description")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/track" className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-transform hover:-translate-y-0.5">
              <GitPullRequest className="h-4 w-4" aria-hidden /> {t("submitApp")}
            </Link>
            <Link href="/developers" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-4 py-2.5 text-sm font-semibold hover:border-accent/50">
              {t("browseDevelopers")} <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="dashboard-metrics" className="space-y-4">
        <SectionHeading id="dashboard-metrics" title={t("overview")} description={t("overviewDescription")} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center justify-between text-muted"><span className="text-sm">{label}</span><Icon className="h-4 w-4 text-accent" aria-hidden /></div>
              <p className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-subtle">{t("fromOmniSource")}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <SectionHeading title={t("myApps")} description={t("myAppsDescription")} action={<Link href="/apps?sort=updated" className="text-sm font-medium text-accent hover:underline">{t("viewCatalog")}</Link>} />
          {popular.items.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {popular.items.map((app) => <AppCard key={app.id} app={app} layout="list" />)}
            </div>
          ) : <Card className="p-6 text-sm text-muted">{t("noApps")}</Card>}
        </div>

        <aside className="space-y-4">
          <SectionHeading title={t("workspace")} description={t("workspaceDescription")} />
          <Card className="divide-y divide-line overflow-hidden">
            {[
              { href: "/track", label: t("submissions"), detail: t("submissionsDetail"), icon: GitPullRequest },
              { href: "/apps?sort=updated", label: t("releases"), detail: t("releasesDetail"), icon: Rocket },
              { href: "/collections", label: t("collections"), detail: `${collections.pagination.total} ${t("liveCollections")}`, icon: Boxes },
            ].map(({ href, label, detail, icon: Icon }) => (
              <Link key={label} href={href} className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon className="h-4 w-4" aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span><span className="block truncate text-xs text-muted">{detail}</span></span>
                <ArrowUpRight className="h-4 w-4 text-subtle" aria-hidden />
              </Link>
            ))}
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-success" aria-hidden /> {t("liveStatus")}</div>
            <p className="mt-2 text-xs leading-relaxed text-muted">{developers.length > 0 ? t("connected", { name: developers[0]?.name ?? "OmniSource" }) : t("waitingForConnection")}</p>
            {latest[0]?.updatedAt ? <p className="mt-3 text-2xs text-subtle">{t("lastUpdate", { date: formatDateTime(latest[0].updatedAt) })}</p> : null}
          </Card>
        </aside>
      </section>

      <section className="rounded-2xl border border-line bg-surface-2/50 p-5 text-sm text-muted">
        <BarChart3 className="mb-2 h-5 w-5 text-accent" aria-hidden />
        <p className="font-semibold text-fg">{t("analyticsTitle")}</p>
        <p className="mt-1 leading-relaxed">{t("analyticsDescription")}</p>
      </section>
    </div>
  );
}
