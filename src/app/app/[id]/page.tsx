import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BookOpen, ExternalLink, FolderGit2, Globe, Tag } from "lucide-react";

import type { App, RecommendationItem, SecurityReport, TrustReport } from "@omnistore/shared-models";
import { getOmnisource } from "@/lib/omnisource";
import { absoluteUrl, site } from "@/config/site";
import { formatDate, formatCompactNumber } from "@/lib/formatters";
import { safeHref } from "@/lib/security/urls";
import { AppIcon } from "@/components/app/AppIcon";
import { TrustBadgeList } from "@/components/app/TrustBadges";
import { SecurityBadge } from "@/components/app/SecurityBadge";
import { SourcePanel } from "@/components/app/SourcePanel";
import { InstallPanel } from "@/components/app/InstallPanel";
import { TrustPanel } from "@/components/app/TrustPanel";
import { ScreenshotGallery } from "@/components/app/ScreenshotGallery";
import { ReleaseTimeline } from "@/components/app/ReleaseTimeline";
import { FavoriteButton, AddToCollectionButton } from "@/components/app/FavoriteButton";
import { RecommendationRow } from "@/components/app/RecommendationRow";
import { detectPlatformHeader } from "@/lib/platform/header";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const client = getOmnisource();
  const app = await client.getApp(decodeURIComponent(id));
  if (!app) return { title: "Not found" };
  return {
    title: `${app.name}${app.developer ? ` — ${app.developer}` : ""}`,
    description: app.shortDescription || app.description || site.description,
    alternates: { canonical: `/app/${app.slug}` },
    openGraph: {
      title: app.name,
      description: app.shortDescription || app.description || undefined,
      images: app.banner ? [{ url: app.banner }] : undefined,
      type: "website",
    },
  };
}

export default async function AppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getOmnisource();
  const [t, tSecurity] = await Promise.all([getTranslations("app"), getTranslations("security")]);

  const app = await client.getApp(decodeURIComponent(id));
  if (!app) notFound();

  const [trust, security, recommendations, similar, preferredPlatform] = await Promise.all([
    client.getTrust(app.id),
    client.getSecurity(app.id),
    client.getRecommendations(app.id, 8),
    client.getSimilar(app.id, 8),
    detectPlatformHeader(),
  ]);

  // Recommendations may duplicate similar items — split by kind, drop dups.
  const items: RecommendationItem[] =
    recommendations && recommendations.items.length > 0
      ? recommendations.items
      : (similar?.items ?? []);
  const similarApps = dedupe(items.filter((item) => item.kind !== "alternative").map((item) => item.app));
  const alternativeApps = dedupe(items.filter((item) => item.kind === "alternative").map((item) => item.app));
  const reasons = new Map(items.map((item) => [item.app.id, item.reasons[0] ?? ""]));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    applicationCategory: app.category || "UtilitiesApplication",
    operatingSystem: (app.platforms ?? []).join(", ") || "Cross-platform",
    description: app.shortDescription || app.description || undefined,
    softwareVersion: app.version ?? undefined,
    author: app.developer ? { "@type": "Organization", name: app.developer } : undefined,
    url: absoluteUrl(`/app/${app.slug}`),
    license: app.license ?? undefined,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        // JSON-LD is generated from validated API data; no user markup flows here.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden rounded-4xl border border-line">
        {app.banner ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={app.banner}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-20"
              fetchPriority="high"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/40" />
          </>
        ) : (
          <div aria-hidden className="absolute inset-0">
            <div className="absolute -left-16 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
            <div className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-accent-2/20 blur-3xl" />
            <div
              className="absolute left-1/2 top-0 h-56 w-[36rem] max-w-full -translate-x-1/2 -translate-y-1/3 rounded-full"
              style={{
                background:
                  "radial-gradient(closest-side, rgb(var(--accent) / 0.18), rgb(var(--accent-2) / 0.08) 55%, transparent 75%)",
              }}
            />
            <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
            <div className="bg-noise absolute inset-0 opacity-[0.04] mix-blend-overlay" />
          </div>
        )}
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:p-8">
          <AppIcon
            name={app.name}
            src={app.icon}
            size="xl"
            rounded="rounded-3xl"
            className="h-24 w-24 shadow-raised ring-1 ring-line/60 sm:h-28 sm:w-28"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-4xl">{app.name}</h1>
            {app.developer && app.developerId ? (
              <Link
                href={`/developers/${app.developerId}`}
                className="mt-1 inline-block text-sm font-medium text-accent hover:underline"
              >
                {app.developer}
              </Link>
            ) : app.developer ? (
              <p className="mt-1 text-sm font-medium text-accent">{app.developer}</p>
            ) : null}
            <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
              {app.shortDescription || app.description || t("emptyDescription")}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TrustBadgeList badges={trust?.badges ?? []} />
              <SecurityBadge report={security} />
            </div>
          </div>
          <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-stretch">
            <FavoriteButton appId={app.id} kind="favorites" withLabel />
            <FavoriteButton appId={app.id} kind="watchlist" />
            <AddToCollectionButton appId={app.id} />
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* ---------------- Main column ---------------- */}
        <div className="min-w-0 space-y-8">
          <ScreenshotGallery screenshots={app.screenshots ?? []} appName={app.name} />

          {app.description && app.description !== app.shortDescription ? (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight">{t("description")}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                {app.description}
              </p>
            </section>
          ) : null}

          {(app.features?.length ?? 0) > 0 ? (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight">{t("features")}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {app.features!.map((feature) => (
                  <li key={feature} className="card px-3 py-2 text-sm text-muted">
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {(app.latestRelease || (app.releases?.length ?? 0) > 0) ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">{t("whatsNew")}</h2>
                {app.version ? (
                  <span className="rounded-full bg-surface-3 px-2.5 py-0.5 font-mono text-xs text-muted">
                    v{app.version}
                  </span>
                ) : null}
              </div>
              <ReleaseTimeline releases={app.releases ?? []} limit={3} />
              {(app.releases?.length ?? 0) > 3 ? (
                <Link
                  href={`/app/${app.slug}/releases`}
                  className="inline-block text-sm font-medium text-accent hover:underline"
                >
                  {t("allReleases")}
                </Link>
              ) : null}
            </section>
          ) : null}

          <RecommendationRow
            title={t("similar")}
            subtitle={t("alsoInstalled")}
            apps={similarApps}
            reasons={reasons}
          />
          {alternativeApps.length > 0 ? (
            <RecommendationRow title={t("alternatives")} apps={alternativeApps} reasons={reasons} />
          ) : null}
        </div>

        {/* ---------------- Sidebar ---------------- */}
        <aside className="space-y-5">
          <SourcePanel app={app} />
          <InstallPanel app={app} preferredPlatform={preferredPlatform} />
          <TrustPanel report={trust as TrustReport | null} />

          {/* Security summary → full dashboard */}
          <div className="card space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{tSecurity("title")}</h2>
              <SecurityBadge report={security} />
            </div>
            <Link
              href={`/app/${app.slug}/security`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              {t("viewDashboard")}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          <div className="card divide-y divide-line text-sm">
            <MetaRow label={t("version")} value={app.version} mono />
            <MetaRow label={t("updated")} value={app.updatedAt ? formatDate(app.updatedAt) : null} />
            <MetaRow label={t("license")} value={app.license} mono />
            <MetaRow
              label={t("popularity")}
              value={app.popularityScore != null ? `${app.popularityScore}/100` : null}
            />
            <MetaRow
              label={t("downloads")}
              value={app.downloadCount != null ? formatCompactNumber(app.downloadCount) : null}
            />
            <MetaRow label={t("source")} value={app.source} />
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="shrink-0 text-xs text-muted">{t("category")}</span>
              {app.category ? (
                <Link
                  href={`/categories/${app.category}`}
                  className="truncate text-xs font-medium text-accent hover:underline"
                >
                  {app.category}
                </Link>
              ) : (
                <span className="text-xs text-subtle">{t("notAvailable")}</span>
              )}
            </div>
            <div className="space-y-2 px-4 py-3">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Tag className="h-3.5 w-3.5" aria-hidden /> {t("tags")}
              </span>
              <ul className="flex flex-wrap gap-1.5">
                {(app.tags ?? []).slice(0, 10).map((tag) => (
                  <li key={tag} className="chip">
                    {tag}
                  </li>
                ))}
                {(app.tags ?? []).length === 0 ? (
                  <li className="text-xs text-subtle">{t("notAvailable")}</li>
                ) : null}
              </ul>
            </div>
          </div>

          <div className="card space-y-1 p-2 text-sm">
            {app.homepage ? (
              <ExternalLinkRow
                href={app.homepage}
                icon={<Globe className="h-4 w-4" aria-hidden />}
                label={t("website")}
              />
            ) : null}
            {app.repository ? (
              <ExternalLinkRow
                href={app.repository}
                icon={<FolderGit2 className="h-4 w-4" aria-hidden />}
                label={t("repository")}
              />
            ) : null}
            {app.documentation ? (
              <ExternalLinkRow
                href={app.documentation}
                icon={<BookOpen className="h-4 w-4" aria-hidden />}
                label={t("documentation")}
              />
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ExternalLinkRow({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  const safe = safeHref(href);
  if (!safe) return null;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer external"
      className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-surface-2"
    >
      <span className="text-muted">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      <ExternalLink className="h-3.5 w-3.5 text-subtle" aria-hidden />
    </a>
  );
}

function MetaRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="shrink-0 text-xs text-muted">{label}</span>
      {value ? (
        <span className={mono ? "truncate font-mono text-xs" : "truncate text-xs font-medium"}>
          {value}
        </span>
      ) : (
        <span className="text-xs text-subtle">—</span>
      )}
    </div>
  );
}

function dedupe(apps: App[]): App[] {
  const seen = new Set<string>();
  return apps.filter((app) => {
    if (seen.has(app.id)) return false;
    seen.add(app.id);
    return true;
  });
}
