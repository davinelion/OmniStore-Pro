import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Flag, GitCompare } from "lucide-react";

import { getProvider } from "@/lib/api";
import { AppIcon } from "@/components/app/AppIcon";
import { DownloadPanel } from "@/components/app/DownloadPanel";
import { ScorePanel } from "@/components/app/Scores";
import { ScreenshotGallery } from "@/components/app/ScreenshotGallery";
import { ReleaseHistory } from "@/components/app/ReleaseHistory";
import { SourcePanel, StatisticsPanel, InstallationPanel, AppMetaRow } from "@/components/app/AppMeta";
import { PlatformAvailability, PlatformBadge } from "@/components/platform/PlatformBadge";
import { FavoriteButton, FollowButton, ShareButton, CompareToggle } from "@/components/app/LocalActions";
import { ReportButton } from "@/components/app/ReportDialog";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { CompareSelection } from "@/components/compare/CompareSelection";
import { PLATFORM_INFO } from "@/config/site";
import { absoluteUrl } from "@/config/site";
import { formatDate, NOT_AVAILABLE, packageTypeLabel, platformLabel } from "@/lib/formatters";
import { sanitizeMarkdown, safeHref } from "@/lib/security/urls";
import type { App } from "@/lib/schemas/omnisource";

export const dynamic = "force-dynamic";

type Params = { params: { slug: string } };

/**
 * App detail page.
 *
 * Everything rendered here comes from OmniSource. Fields upstream does not
 * publish are shown as "Not available" rather than filled with placeholders.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const app = await getProvider().getApp(params.slug);
  if (!app) return { title: "App not found" };

  const description =
    app.summary ??
    (app.description ? `${app.description.slice(0, 155)}…` : `${app.name} on OmniStore`);
  const canonical = `/apps/${app.slug}`;
  const platformNames = app.platforms.map(platformLabel).join(", ");

  return {
    title: app.name,
    description: `${description}${platformNames ? ` Available on ${platformNames}.` : ""}`,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: `${app.name} · OmniStore`,
      description,
      url: absoluteUrl(canonical),
      siteName: "OmniStore",
    },
    twitter: {
      card: "summary_large_image",
      title: `${app.name} · OmniStore`,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function AppPage({ params }: Params) {
  const provider = getProvider();
  const app = await provider.getApp(params.slug);
  if (!app) notFound();

  const [alternatives, similar] = await Promise.all([
    provider.getAlternatives(app.id),
    provider.getSimilar(app.id),
  ]);

  const similarOnly = similar.filter((item) => !alternatives.some((alt) => alt.id === item.id)).slice(0, 6);
  const latest = app.latest_release;
  const platforms = PLATFORM_INFO.map((platform) => ({
    slug: platform.slug,
    name: platform.name,
    installMethods: platform.installMethods,
    handoff: platform.handoff,
  }));

  const jsonLd = buildStructuredData(app);

  return (
    <article className="space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ---------------------------------------------------------------- */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <AppIcon name={app.name} src={app.icon_url} size="xl" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{app.name}</h1>
            {app.open_source ? (
              <Badge tone="success">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                Open Source
              </Badge>
            ) : null}
            {app.active_development ? <Badge tone="accent">Active Development</Badge> : null}
            {app.signals.archived ? <Badge tone="warning">Archived upstream</Badge> : null}
            {latest?.prerelease ? <Badge tone="warning">Latest is a pre-release</Badge> : null}
          </div>

          <p className="mt-2 max-w-2xl text-lg text-muted">
            {app.summary ?? "Description unavailable"}
          </p>

          <div className="mt-3">
            <AppMetaRow app={app} />
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {app.platforms.map((platform) => (
              <PlatformBadge key={platform} platform={platform} />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <ButtonLink href="#get" size="lg">
              Get App
            </ButtonLink>
            <FavoriteButton appId={app.id} name={app.name} withLabel />
            <FollowButton appId={app.id} name={app.name} />
            <ShareButton title={`${app.name} · OmniStore`} text={app.summary} path={`/apps/${app.slug}`} />
            <CompareSelection appId={app.id} name={app.name} />
          </div>
        </div>
      </header>

      <ScorePanel app={app} />

      <ScreenshotGallery screenshots={app.screenshots} appName={app.name} />

      <div className="grid gap-8 lg:grid-cols-[1.5fr_0.85fr] lg:items-start">
        {/* -------------------------------------------------------------- */}
        {/* Main column                                                     */}
        {/* -------------------------------------------------------------- */}
        <div className="space-y-10">
          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="text-lg font-semibold">
              About
            </h2>
            <div className="release-notes mt-2 text-sm text-muted">
              {app.description ? sanitizeMarkdown(app.description) : "Description unavailable"}
            </div>
          </section>

          {app.features.length > 0 ? (
            <section aria-labelledby="features-heading">
              <h2 id="features-heading" className="text-lg font-semibold">
                Features
              </h2>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {app.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="platforms-heading">
            <h2 id="platforms-heading" className="text-lg font-semibold">
              Supported Platforms
            </h2>
            <div className="mt-3">
              <PlatformAvailability platforms={app.platforms} />
            </div>
            {app.package_types.length > 0 ? (
              <p className="mt-3 text-sm text-muted">
                Packages: {app.package_types.map(packageTypeLabel).join(", ")}
              </p>
            ) : null}
          </section>

          <section aria-labelledby="release-heading">
            <SectionHeading
              id="release-heading"
              title="Latest Release"
              description={
                latest?.released_at ? `Released ${formatDate(latest.released_at)}` : "Release date not available"
              }
              action={
                <Link href={`/apps/${app.slug}/releases`} className="text-sm text-accent hover:underline">
                  Release history
                </Link>
              }
            />
            {latest ? (
              <div className="mt-3 rounded-2xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">v{latest.version}</p>
                  {latest.url ? (
                    <a
                      href={safeHref(latest.url) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer external"
                      className="text-sm text-accent hover:underline"
                    >
                      View release
                    </a>
                  ) : null}
                </div>
                <div className="release-notes mt-2 max-h-64 overflow-y-auto">
                  {sanitizeMarkdown(latest.notes) || "No release notes were published for this version."}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">{NOT_AVAILABLE}</p>
            )}
          </section>

          <section aria-labelledby="history-heading">
            <h2 id="history-heading" className="text-lg font-semibold">
              Release History
            </h2>
            <div className="mt-3">
              <ReleaseHistory releases={app.releases} limit={3} showAllHref={`/apps/${app.slug}/releases`} />
            </div>
          </section>

          {alternatives.length > 0 ? (
            <section aria-labelledby="alternatives-heading">
              <h2 id="alternatives-heading" className="text-lg font-semibold">
                Alternatives
              </h2>
              <p className="mt-1 text-sm text-muted">
                Computed by OmniSource from categories, tags, platforms and licence — never hand-picked.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {alternatives.map((item) => (
                  <AlternativeCard key={item.id} app={item} />
                ))}
              </div>
            </section>
          ) : null}

          {similarOnly.length > 0 ? (
            <section aria-labelledby="similar-heading">
              <h2 id="similar-heading" className="text-lg font-semibold">
                Similar Apps
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {similarOnly.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/apps/${item.slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm transition-colors hover:border-accent/50 hover:text-accent"
                    >
                      <AppIcon name={item.name} src={item.icon_url} size="sm" className="h-5 w-5 rounded-md text-2xs" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Sidebar                                                         */}
        {/* -------------------------------------------------------------- */}
        <aside className="space-y-6 lg:sticky lg:top-24">
          <DownloadPanel app={app} />
          <InstallationPanel app={app} platforms={platforms} />
          <SourcePanel app={app} />
          <StatisticsPanel app={app} />
          <ReportIssueCard app={app} />
        </aside>
      </div>
    </article>
  );
}

function AlternativeCard({ app }: { app: App }) {
  return (
    <Link href={`/apps/${app.slug}`} className="card card-interactive flex items-center gap-3 p-3">
      <AppIcon name={app.name} src={app.icon_url} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{app.name}</p>
        <p className="truncate text-2xs text-fg-subtle">{app.summary ?? "Description unavailable"}</p>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <span className="text-2xs tabular-nums text-fg-subtle">
          {app.scores.trust.value == null ? NOT_AVAILABLE : `Trust ${app.scores.trust.value}`}
        </span>
        <span className="text-2xs text-fg-subtle">
          {app.platforms.length} platform{app.platforms.length === 1 ? "" : "s"}
        </span>
      </div>
    </Link>
  );
}

function ReportIssueCard({ app }: { app: App }) {
  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Flag className="h-4 w-4 text-fg-subtle" aria-hidden />
        Spot a problem?
      </h2>
      <p className="mt-2 text-sm text-muted">
        If a package, version or platform is wrong, tell us and we will correct the OmniSource record.
      </p>
      <ReportButton
        appId={app.id}
        appName={app.name}
        className="mt-3 inline-flex h-9 items-center rounded-full border border-line px-3 text-sm transition-colors hover:bg-surface-2"
      />
    </section>
  );
}

/**
 * Schema.org SoftwareApplication.
 *
 * Only fields OmniSource actually supplies are emitted — no invented prices,
 * ratings or review counts (Schema.org star ratings require real reviews).
 */
function buildStructuredData(app: App) {
  const canonical = absoluteUrl(`/apps/${app.slug}`);
  const downloadUrl = pickCanonicalAsset(app);

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    description: app.summary ?? app.description ?? undefined,
    applicationCategory: app.categories[0] ? toSchemaCategory(app.categories[0]) : "UtilitiesApplication",
    operatingSystem: app.platforms.map(platformLabel).join(", ") || undefined,
    url: canonical,
    ...(downloadUrl ? { downloadUrl } : {}),
    softwareVersion: app.latest_release?.version ?? undefined,
    dateModified: app.updated_at ?? undefined,
    license: app.license?.url ?? app.license?.id ?? undefined,
    author: app.developer
      ? {
          "@type": app.developer.type === "User" ? "Person" : "Organization",
          name: app.developer.name,
          url: app.developer.url ?? undefined,
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "OmniStore",
      url: absoluteUrl("/"),
    },
    keywords: app.tags.join(", ") || undefined,
    screenshot: app.screenshots[0]?.url ?? undefined,
    isAccessibleForFree: app.open_source ? true : undefined,
  };
}

/**
 * Canonical download URL for structured data.
 *
 * Prefers a desktop installer over a large mobile bundle, then the smallest
 * artefact, so the link is representative of the release.
 */
function pickCanonicalAsset(app: App): string | undefined {
  const assets = (app.latest_release?.assets ?? []).filter((asset) => asset.status === "VALID");
  if (assets.length === 0) return undefined;
  const platformRank = (platform: string) => (platform === "android" || platform === "ios" ? 1 : 0);
  const installerBonus = (packageType: string, filename?: string) => {
    const installer = ["EXE", "MSI", "MSIX", "DMG", "PKG", "APPIMAGE", "DEB", "RPM", "APK"].includes(packageType);
    return (installer ? 0 : 1) + (/unsigned|debug|nightly/.test(filename ?? "") ? 2 : 0);
  };
  return [...assets].sort(
    (a, b) =>
      platformRank(a.platform) - platformRank(b.platform) ||
      installerBonus(a.package_type, a.filename) - installerBonus(b.package_type, b.filename) ||
      (a.size_bytes ?? 0) - (b.size_bytes ?? 0),
  )[0]?.url;
}

function toSchemaCategory(slug: string): string {
  const map: Record<string, string> = {
    audio: "MultimediaApplication",
    video: "MultimediaApplication",
    photography: "MultimediaApplication",
    productivity: "BusinessApplication",
    "developer-tools": "DeveloperApplication",
    education: "EducationalApplication",
    communication: "CommunicationApplication",
    social: "SocialNetworkingApplication",
    internet: "WebApplication",
    browsers: "BrowserApplication",
    security: "SecurityApplication",
    networking: "CommunicationApplication",
    utilities: "UtilitiesApplication",
    gaming: "GameApplication",
    books: "UtilitiesApplication",
    finance: "FinanceApplication",
    science: "EducationalApplication",
    "system-tools": "UtilitiesApplication",
    ai: "DeveloperApplication",
  };
  return map[slug] ?? "UtilitiesApplication";
}
