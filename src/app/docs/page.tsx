import type { Metadata } from "next";
import Link from "next/link";

import { getProvider } from "@/lib/api";
import { PLATFORM_INFO } from "@/config/site";
import { relativeTime } from "@/lib/formatters";
import { SCORE_ALGORITHM } from "@/lib/scores/compute";
import { site } from "@/config/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "How OmniStore sources, verifies and presents open-source software: data pipeline, verification, scoring, installation and the client API contract.",
  alternates: { canonical: "/docs" },
};

export default async function DocsPage() {
  const provider = getProvider();
  const [meta, stats, platforms] = await Promise.all([
    provider.getFeedMeta(),
    provider.getStats(),
    provider.getPlatforms(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Documentation</h1>
        <p className="text-lg text-muted">
          How OmniStore sources, verifies and presents open-source software.
        </p>
        <p className="text-2xs text-fg-subtle">
          Catalog snapshot {relativeTime(meta.generated_at)} · {stats.apps} apps · provider{" "}
          <code className="rounded bg-surface-2 px-1">{provider.name}</code>
        </p>
      </header>

      {/* ---------------------------------------------------------------- */}
      <Section id="what" title="1 · What OmniStore is">
        <p>
          OmniStore is a discovery and distribution interface. It indexes upstream open-source
          projects, normalises their release artefacts, and helps you choose and download the right
          package for your platform. It is not an app store of record, does not host binaries, and
          does not take ownership of third-party software.
        </p>
        <p>
          The data layer is <strong>OmniSource</strong>; OmniStore Web is the first client built on
          its versioned API.
        </p>
      </Section>

      <Section id="sourcing" title="2 · How apps are sourced">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            A curated registry (<code className="rounded bg-surface-2 px-1 text-2xs">data/sources.json</code>)
            lists upstream repositories. It contains only repository identifiers and taxonomy — never
            versions, sizes or scores.
          </li>
          <li>
            The ingestion pipeline (<code className="rounded bg-surface-2 px-1 text-2xs">npm run ingest</code>)
            fetches live repository metadata, releases and artefacts from the upstream API.
          </li>
          <li>
            Every artefact is normalised to a platform, architecture and package type. Files that
            cannot be classified with confidence — source archives, checksum files, unlabelled
            archives — are excluded rather than mislabelled.
          </li>
          <li>
            The result is validated against the OmniSource v1 schema and written to a versioned feed.
            A feed that fails validation is rejected, so a bad ingest can never ship.
          </li>
        </ol>
        <p>
          Categories come from OmniStore’s taxonomy; tags come from the upstream project’s own topics.
          Descriptions are taken from the upstream README.
        </p>
      </Section>

      <Section id="verification" title="3 · How verification works">
        <p>
          Each package carries a validation status reported by OmniSource:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Valid</strong> — the artefact is served over HTTPS from a release host accepted by
            OmniSource. It appears as a normal download.
          </li>
          <li>
            <strong>Review required</strong> — the artefact is hosted outside the accepted release
            hosts. It is not offered as a download.
          </li>
          <li>
            <strong>Quarantined / Invalid</strong> — the artefact failed validation. It is never shown
            as a download.
          </li>
          <li>
            <strong>Verification unavailable</strong> — OmniSource could not establish a status. The UI
            says so plainly instead of implying safety.
          </li>
        </ul>
        <p className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm">
          Verification confirms <em>where a package comes from</em>. It is not a malware scan and not a
          security guarantee. Always review what you install.
        </p>
        <p>
          Checksums are shown when the upstream project publishes them. Many projects do not, in which
          case OmniStore shows “Not published upstream” rather than inventing one.
        </p>
      </Section>

      <Section id="trust" title="4 · What the Trust Score means">
        <p>
          Trust, Quality and Popularity are computed by the{" "}
          <code className="rounded bg-surface-2 px-1 text-2xs">{SCORE_ALGORITHM.name}</code> algorithm
          (version {SCORE_ALGORITHM.version}) from public upstream signals only. Open any score on an
          app page to see every contributing factor and the points it added.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Trust</strong> — licence, share of validated assets, release recency, repository
            activity, project size, release history and metadata completeness.
          </li>
          <li>
            <strong>Quality</strong> — documentation, maintenance cadence, release consistency,
            metadata completeness and community activity.
          </li>
          <li>
            <strong>Popularity</strong> — stars, forks, watchers and release recency on a logarithmic
            scale, so a project cannot buy its way to the top.
          </li>
        </ul>
        <p className="rounded-xl border border-line bg-surface-2/40 p-3 text-sm text-muted">
          {SCORE_ALGORITHM.disclaimer}
        </p>
        <p>
          OmniStore has no user ratings and no review system. Fabricated ratings would tell you
          nothing, so none are shown.
        </p>
      </Section>

      <Section id="developers" title="5 · How developers are represented">
        <p>
          A developer is the upstream account or organisation that publishes the repository. Developer
          pages show their applications, the platforms they ship for, the licences they use and their
          latest releases — all derived from catalog data, never edited by hand.
        </p>
        <p>
          Every app page links back to the repository, homepage, documentation and releases, because
          OmniStore should send attention upstream rather than absorb it.
        </p>
      </Section>

      <Section id="installation" title="6 · How installation works">
        <p>
          The web client cannot install software; your operating system does that. OmniStore opens the
          upstream download and tells you what to expect for each platform.
        </p>
        <ul className="space-y-2">
          {platforms.map((platform) => (
            <li key={platform.slug} className="rounded-xl border border-line p-3">
              <p className="text-sm font-medium">{platform.name}</p>
              <p className="mt-1 text-2xs text-muted">
                Method: {platform.install_methods.join(" / ") || "Not available"}
              </p>
              <p className="mt-1 text-2xs text-fg-subtle">
                {
                  PLATFORM_INFO.find((entry) => entry.slug === platform.slug)?.handoff ??
                  "Installation is handled by your operating system."
                }
              </p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          Future native OmniStore clients will implement platform-specific installation and update
          flows. The web implementation simply performs the supported download handoff.
        </p>
      </Section>

      <Section id="reporting" title="7 · How to report incorrect information">
        <p>
          Every app page has a <strong>Report an Issue</strong> control. Choose a reason — broken
          download, incorrect metadata, wrong platform, incorrect version, duplicate app, licence
          issue, security concern or other — add detail, and the report is recorded against the
          OmniSource record for correction.
        </p>
        <p>
          You can also open an issue on the{" "}
          <a
            href={site.repoUrl}
            target="_blank"
            rel="noopener noreferrer external"
            className="text-accent hover:underline"
          >
            OmniStore repository
          </a>{" "}
          or the{" "}
          <a
            href={site.omnisourceRepoUrl}
            target="_blank"
            rel="noopener noreferrer external"
            className="text-accent hover:underline"
          >
            OmniSource repository
          </a>
          .
        </p>
      </Section>

      <Section id="privacy" title="8 · Privacy">
        <p>
          Browsing requires no account. Favorites and followed apps are stored in your own browser
          (local storage) and never leave your device. Analytics are off by default and, when enabled,
          record anonymous product events only — no identifiers, cookies or personal data.
        </p>
        <p>
          See the <Link href="/privacy" className="text-accent hover:underline">privacy notice</Link>{" "}
          and <Link href="/terms" className="text-accent hover:underline">terms</Link>.
        </p>
      </Section>

      <Section id="api" title="9 · Client API contract">
        <p>
          OmniStore serves a versioned JSON API at <code className="rounded bg-surface-2 px-1 text-2xs">/api/v1/</code>.
          Native clients should consume these endpoints and the shared schemas — the web UI and future
          mobile and desktop clients use exactly the same resources.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {[
            "/api/v1/apps",
            "/api/v1/apps/{id}",
            "/api/v1/apps/{id}/releases",
            "/api/v1/apps/{id}/alternatives",
            "/api/v1/apps/{id}/similar",
            "/api/v1/search",
            "/api/v1/categories",
            "/api/v1/platforms",
            "/api/v1/collections",
            "/api/v1/developers",
            "/api/v1/trending",
            "/api/v1/latest",
            "/api/v1/stats",
            "/api/v1/health",
          ].map((endpoint) => (
            <li key={endpoint}>
              <code className="rounded bg-surface-2 px-1 text-2xs">{endpoint}</code>
            </li>
          ))}
        </ul>
        <p>
          Full architecture notes for future clients live in{" "}
          <code className="rounded bg-surface-2 px-1 text-2xs">docs/CLIENT_ARCHITECTURE.md</code>.
        </p>
      </Section>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-muted">{children}</div>
    </section>
  );
}
