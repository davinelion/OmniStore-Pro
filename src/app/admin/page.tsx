import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2, FolderKanban, ListChecks, ShieldCheck, Tags, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getOmnisource } from "@/lib/omnisource";
import { orFallback } from "@/lib/omnisource/with-fallback";
import { formatCompactNumber } from "@/lib/formatters";
import { AppCard } from "@/components/app/AppCard";
import { Card, SectionHeading } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/primitives";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Admin portal",
  description: "Live OmniSource moderation, collections and catalog operations.",
  robots: { index: false },
};

export default async function AdminPage() {
  const t = await getTranslations("admin");
  const client = getOmnisource();
  const [stats, apps, collections, categories, developers] = await Promise.all([
    orFallback(client.getStats(), null, "admin stats"),
    orFallback(client.getApps({ perPage: 8, sort: "updated" }), { items: [], pagination: { page: 1, perPage: 8, total: 0, totalPages: 0 }, freshness: null }, "admin moderation"),
    orFallback(client.getCollections(1, 30), { items: [], pagination: { page: 1, perPage: 30, total: 0, totalPages: 0 } }, "admin collections"),
    orFallback(client.getCategories(), [], "admin categories"),
    orFallback(client.getDevelopers(8), [], "admin developers"),
  ]);

  const operationTone = {
    accent: "bg-accent/10 text-accent",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
    neutral: "bg-surface-2 text-muted",
  } as const;

  const operations = [
    { label: t("moderation"), detail: t("moderationDetail"), href: "/apps?sort=updated", icon: ListChecks, tone: "accent" as const },
    { label: t("reports"), detail: t("reportsDetail"), href: "/track", icon: AlertTriangle, tone: "warning" as const },
    { label: t("featuredApps"), detail: t("featuredDetail", { count: collections.items.filter((item) => item.slug.includes("featured")).length }), href: "/collections", icon: CheckCircle2, tone: "success" as const },
    { label: t("collectionManagement"), detail: t("collectionDetail", { count: collections.pagination.total }), href: "/collections", icon: FolderKanban, tone: "info" as const },
    { label: t("categoryManagement"), detail: t("categoryDetail", { count: categories.length }), href: "/categories", icon: Tags, tone: "neutral" as const },
  ];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-4xl border border-line bg-surface p-6 sm:p-10">
        <div aria-hidden className="absolute end-0 top-0 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2"><Badge tone="success"><ShieldCheck className="h-3 w-3" aria-hidden /> {t("live")}</Badge><span className="text-xs text-subtle">{t("readOnlyNotice")}</span></div>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{t("description")}</p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("inventory")}>
        {[
          [t("apps"), stats?.apps ?? 0],
          [t("developers"), stats?.repositories ?? developers.length],
          [t("collections"), collections.pagination.total],
          [t("categories"), categories.length],
        ].map(([label, value]) => <Card key={String(label)} className="p-4"><p className="text-sm text-muted">{label}</p><p className="mt-2 font-display text-3xl font-bold tabular-nums">{formatCompactNumber(Number(value))}</p><p className="mt-1 text-xs text-subtle">{t("liveFromOmniSource")}</p></Card>)}
      </section>

      <section className="space-y-4">
        <SectionHeading title={t("operations")} description={t("operationsDescription")} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {operations.map(({ label, detail, href, icon: Icon, tone }) => <Link key={label} href={href} className="card card-interactive group p-5"><div className="flex items-center justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${operationTone[tone]}`}><Icon className="h-5 w-5" aria-hidden /></span><ArrowUpRight className="h-4 w-4 text-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden /></div><h2 className="mt-4 font-semibold">{label}</h2><p className="mt-1 text-sm leading-relaxed text-muted">{detail}</p></Link>)}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title={t("recentlyChanged")} description={t("recentlyChangedDescription")} action={<Link href="/apps?sort=updated" className="text-sm font-medium text-accent hover:underline">{t("viewAll")}</Link>} />
        {apps.items.length > 0 ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{apps.items.map((app) => <AppCard key={app.id} app={app} />)}</div> : <Card className="p-6 text-sm text-muted">{t("noRecentApps")}</Card>}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <Card className="p-5"><h2 className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-accent" aria-hidden /> {t("developersTitle")}</h2><div className="mt-4 divide-y divide-line">{developers.slice(0, 5).map((developer) => <Link key={developer.id} href={`/developers/${developer.slug}`} className="flex items-center justify-between py-3 text-sm hover:text-accent"><span>{developer.name}</span><ArrowUpRight className="h-4 w-4 text-subtle" aria-hidden /></Link>)}</div></Card>
        <Card className="p-5"><h2 className="flex items-center gap-2 font-semibold"><FolderKanban className="h-4 w-4 text-accent" aria-hidden /> {t("collectionsTitle")}</h2><div className="mt-4 divide-y divide-line">{collections.items.slice(0, 5).map((collection) => <Link key={collection.id} href={`/collection/${collection.slug}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-accent"><span className="truncate">{collection.name}</span><span className="shrink-0 text-xs text-subtle">{collection.itemCount}</span></Link>)}</div></Card>
      </section>
    </div>
  );
}
