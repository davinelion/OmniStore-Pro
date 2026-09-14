import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BookOpen, ExternalLink, FolderGit2, Globe, Tag, Download, Github, ShieldCheck, Sparkles, Monitor, Laptop, Terminal, Smartphone, Layers } from "lucide-react";

import type { App, RecommendationItem, SecurityReport, TrustReport } from "@omnistore/shared-models";
import { getOmnisource } from "@/lib/omnisource";
import { absoluteUrl, site } from "@/config/site";
import { formatDate, formatCompactNumber, platformLabel } from "@/lib/formatters";
import { safeHref, safeImageUrl } from "@/lib/security/urls";
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
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { ReleaseIntegrity } from "@/components/app/ReleaseIntegrity";
import { PlatformDownloadMatrix, StickyDownloadBar } from "@/components/store/PlatformDownloadMatrix";
import { StoreAppGrid } from "@/components/store/StoreAppCard";
import { TrackAppButton } from "@/components/app/TrackAppButton";
import { cn } from "@/lib/utils";

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
    title: `${app.name}${app.developer ? ` — ${app.developer}` : ""} — Direct Download + Source | OmniStore`,
    description: `Download ${app.name} directly — ${app.platforms?.join(", ") ?? "cross-platform"} • ${app.shortDescription || app.description?.slice(0, 150) || site.description} • Source: ${app.repository ?? "open source"} • Verified assets`,
    alternates: { canonical: `/app/${app.slug}` },
    openGraph: {
      title: `${app.name} — Direct Download`,
      description: app.shortDescription || app.description || undefined,
      images: safeImageUrl(app.banner)
        ? [{ url: safeImageUrl(app.banner)!, alt: app.name }]
        : [{ url: absoluteUrl("/og.png"), width: 1200, height: 630, alt: app.name }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: app.name,
      description: app.shortDescription || app.description || undefined,
      images: [safeImageUrl(app.banner) ?? absoluteUrl("/og.png")],
    },
  };
}

export default async function AppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getOmnisource();
  const [t, tSecurity] = await Promise.all([getTranslations("app"), getTranslations("security")]);

  const app = await client.getApp(decodeURIComponent(id));
  if (!app) notFound();

  const [trustResult, securityResult, recommendationsResult, similarResult, platformResult] = await Promise.allSettled([
    client.getTrust(app.id),
    client.getSecurity(app.id),
    client.getRecommendations(app.id, 12),
    client.getSimilar(app.id, 12),
    detectPlatformHeader(),
  ]);
  const trust = trustResult.status === "fulfilled" ? trustResult.value : null;
  const security = securityResult.status === "fulfilled" ? securityResult.value : null;
  const recommendations = recommendationsResult.status === "fulfilled" ? recommendationsResult.value : null;
  const similar = similarResult.status === "fulfilled" ? similarResult.value : null;
  const preferredPlatform = platformResult.status === "fulfilled" ? platformResult.value : null;

  const items: RecommendationItem[] =
    recommendations && recommendations.items.length > 0
      ? recommendations.items
      : (similar?.items ?? []);
  const similarApps = dedupe(items.filter((item) => item.kind !== "alternative").map((item) => item.app));
  const alternativeApps = dedupe(items.filter((item) => item.kind === "alternative").map((item) => item.app));
  const reasons = new Map(items.map((item) => [item.app.id, item.reasons[0] ?? ""]));

  const validAssets = app.latestRelease?.assets?.filter(a => a.status === "VALID") ?? [];
  const platforms = app.platforms ?? [];
  const isCrossPlatform = platforms.length >= 3;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    applicationCategory: app.category || "UtilitiesApplication",
    operatingSystem: platforms.join(", ") || "Cross-platform",
    description: app.shortDescription || app.description || undefined,
    softwareVersion: app.version ?? undefined,
    author: app.developer ? { "@type": "Organization", name: app.developer } : undefined,
    url: absoluteUrl(`/app/${app.slug}`),
    license: app.license ?? undefined,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    downloadUrl: validAssets[0]?.url,
    isAccessibleForFree: true,
  };

  return (
    <div className="space-y-8 pb-20 sm:pb-0">
      <AnalyticsTracker type="app_view" appId={app.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ---------- App Store Hero with Direct Download ---------- */}
      <section className="relative overflow-hidden rounded-4xl border border-line">
        {safeImageUrl(app.banner) ? (
          <>
            <Image
              src={safeImageUrl(app.banner)!}
              alt=""
              fill
              sizes="100vw"
              priority
              className="object-cover opacity-20"
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
        <div className="relative p-5 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <AppIcon
              name={app.name}
              src={app.icon}
              size="xl"
              rounded="rounded-3xl"
              className="h-24 w-24 shadow-raised ring-1 ring-line/60 sm:h-28 sm:w-28"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight sm:text-4xl">{app.name}</h1>
                {isCrossPlatform ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft border border-accent/20 px-2.5 py-1 text-2xs font-bold text-accent">
                    <Layers className="h-3 w-3" />
                    Cross-Platform
                  </span>
                ) : null}
                {app.openSource ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 border border-success/20 px-2.5 py-1 text-2xs font-bold text-success">
                    <Github className="h-3 w-3" />
                    Open Source
                  </span>
                ) : null}
              </div>
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
              
              {/* Platform chips like App Store */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {platforms.map(p => {
                  const Icon = p === "windows" ? Monitor : p === "macos" ? Laptop : p === "linux" ? Terminal : Smartphone;
                  return (
                    <span key={p} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2/50 px-2.5 py-1 text-xs font-medium">
                      <Icon className="h-3.5 w-3.5" />
                      {platformLabel(p)}
                    </span>
                  );
                })}
                {validAssets.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {validAssets.length} verified assets
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <TrustBadgeList badges={trust?.badges ?? []} />
                <SecurityBadge report={security} />
              </div>

              {/* Direct Download CTA like Play Store */}
                {validAssets.length > 0 ? (
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <a
                    href={safeHref(validAssets[0]!.url) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-white shadow-glow hover:bg-accent-hover hover:-translate-y-0.5 transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Download v{app.version ?? validAssets[0]!.version}
                  </a>
                  {app.repository && safeHref(app.repository) ? (
                    <a
                      href={safeHref(app.repository)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold hover:bg-surface-2 transition-colors"
                    >
                      <Github className="h-4 w-4" />
                      Source
                    </a>
                  ) : null}
                  <span className="text-2xs text-muted">
                    Direct from GitHub • {validAssets[0]!.packageType.toUpperCase()} • {validAssets[0]!.platform ? platformLabel(validAssets[0]!.platform) : "any"}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-stretch">
              <TrackAppButton app={app} />
              <FavoriteButton appId={app.id} kind="favorites" withLabel />
              <FavoriteButton appId={app.id} kind="watchlist" />
              <AddToCollectionButton appId={app.id} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* ---------------- Main column ---------------- */}
        <div className="min-w-0 space-y-8">
          {/* AI-Powered Cross-Platform Banner for this app */}
          {isCrossPlatform ? (
            <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent-soft to-accent-2/10 p-4">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {validAssets.length > 0
                      ? "Cross-Platform Champion"
                      : "Cross-Platform — build from source"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {validAssets.length > 0 ? (
                      <>
                        This app runs natively on {platforms.map((p) => platformLabel(p)).join(", ")}.
                        OmniStore indexed {validAssets.length} validated{" "}
                        {validAssets.length === 1 ? "asset" : "assets"} for the latest release —
                        download any of them directly, with the source always visible like F-Droid.
                      </>
                    ) : (
                      <>
                        This app runs natively on {platforms.map((p) => platformLabel(p)).join(", ")},
                        but its latest release publishes no installers OmniStore can validate. Use the
                        source repository below for build instructions or official download channels.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <ScreenshotGallery screenshots={app.screenshots ?? []} appName={app.name} />

          {/* Obtainium-style Direct Update Banner */}
          <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent-soft to-accent-2/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-glow">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold flex items-center gap-2">
                    Direct Updates — Like Obtainium
                    <span className="rounded-full bg-accent px-2 py-0.5 text-2xs text-white">NEW</span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted max-w-xl">
                    Track this app and get updates directly from {app.repository ? new URL(app.repository).hostname : "GitHub"} — no store middleman. Background checks every 6h, notifications, skip version, rollback, import/export. Like Obtainium for Android but for all platforms.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-2xs">Direct APK/EXE/DMG</span>
                    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-2xs">Background checks</span>
                    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-2xs">Skip & rollback</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <TrackAppButton app={app} />
                <Link href="/updates" className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium hover:border-accent/40">
                  <Layers className="h-3.5 w-3.5" />
                  Open Updates Center
                </Link>
              </div>
            </div>
          </div>

          {/* Platform Download Matrix — direct + source like F-Droid */}
          <PlatformDownloadMatrix app={app} />

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

          {/* AI-Powered Similar Apps with Store Cards */}
          {similarApps.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight">AI Recommends — Similar Apps</h2>
                <span className="rounded-full bg-surface-3 px-2 py-0.5 text-2xs text-muted">{similarApps.length} apps</span>
              </div>
              <p className="text-xs text-muted">Based on category {app.category}, tags, and trust signals — each with direct download + source.</p>
              <StoreAppGrid apps={similarApps.slice(0, 6)} preferredPlatform={preferredPlatform ?? undefined} />
            </section>
          ) : null}

          <RecommendationRow
            title={t("similar")}
            subtitle={t("alsoInstalled")}
            apps={similarApps}
            reasons={reasons}
          />
          {alternativeApps.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight">Alternatives — AI Ranked</h2>
              <StoreAppGrid apps={alternativeApps.slice(0, 6)} preferredPlatform={preferredPlatform ?? undefined} />
            </section>
          ) : null}
        </div>

        {/* ---------------- Sidebar ---------------- */}
        <aside className="space-y-5">
          <SourcePanel app={app} />
          <InstallPanel app={app} preferredPlatform={preferredPlatform} />
          <ReleaseIntegrity app={app} />
          <TrustPanel report={trust as TrustReport | null} />

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
            <MetaRow label={t("sourceLabel")} value={app.source} />
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

      <StickyDownloadBar app={app} />
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
