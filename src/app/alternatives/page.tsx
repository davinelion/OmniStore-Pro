import type { Metadata } from "next";
import Link from "next/link";
import { getProvider } from "@/lib/api";
import { ALTERNATIVE_GUIDES } from "@/config/alternatives";
import { AppCard } from "@/components/app/AppCard";
import { PLATFORM_IDS, PlatformSchema } from "@/lib/schemas/omnisource";
import { platformLabel } from "@/lib/formatters";
import { safeHref } from "@/lib/security/urls";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Find an open-source alternative",
  alternates: { canonical: "/alternatives" },
};
export default async function AlternativesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; platform?: string; tool?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const q = (
    typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : ""
  )
    .slice(0, 200)
    .trim()
    .toLowerCase();
  const platform = PlatformSchema.safeParse(resolvedSearchParams.platform);
  const guides = ALTERNATIVE_GUIDES.filter(
    (g) =>
      (!resolvedSearchParams.tool || g.slug === resolvedSearchParams.tool) &&
      (!q || `${g.name} ${g.task}`.toLowerCase().includes(q)),
  );
  const provider = getProvider();
  const results = await Promise.all(
    guides.map(async (guide) => ({
      guide,
      apps: (
        await Promise.all(guide.candidates.map((slug) => provider.getApp(slug)))
      ).filter(
        (app) =>
          app &&
          app.open_source &&
          (!platform.success || app.platforms.includes(platform.data)),
      ),
    })),
  );
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-widest text-accent">
          Make the switch, thoughtfully
        </p>
        <h1 className="mt-2 text-4xl font-semibold">
          Find your open-source alternative
        </h1>
        <p className="mt-3 max-w-3xl text-muted">
          Start with a tool you know. Explore editorial candidates, inspect real
          upstream metadata, and compare trade-offs—not imaginary feature
          parity.
        </p>
      </header>
      <form
        className="card flex flex-wrap items-end gap-4 p-5"
        action="/alternatives"
      >
        <label className="flex-1">
          Tool or workflow
          <input
            name="q"
            defaultValue={q}
            placeholder="Notion, Postman, password…"
            className="mt-2 block w-full rounded-lg border border-line bg-bg p-3"
            maxLength={200}
          />
        </label>
        <label>
          Platform
          <select
            name="platform"
            defaultValue={platform.success ? platform.data : ""}
            className="mt-2 block rounded-lg border border-line bg-bg p-3"
          >
            <option value="">Any platform</option>
            {PLATFORM_IDS.map((p) => (
              <option key={p} value={p}>
                {platformLabel(p)}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-full bg-accent px-5 py-3 font-medium text-accent-fg">
          Find alternatives
        </button>
      </form>
      {!results.length && (
        <section className="card p-6">
          <h2 className="text-xl font-semibold">No editorial guide yet</h2>
          <p className="my-2 text-muted">
            Search the full catalog or suggest a sourced comparison.
          </p>
          <Link
            className="text-accent underline"
            href={`/search?q=${encodeURIComponent(q)}`}
          >
            Search all apps
          </Link>{" "}
          ·{" "}
          <Link className="text-accent underline" href="/contribute">
            Suggest a guide
          </Link>
        </section>
      )}
      {results.map(({ guide, apps }) => (
        <section key={guide.slug} className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">
                Alternatives to {guide.name}
              </h2>
              <p className="text-muted">{guide.task}</p>
            </div>
            <Link
              className="text-sm text-accent underline"
              href={`/alternatives?tool=${guide.slug}${platform.success ? `&platform=${platform.data}` : ""}`}
            >
              Link to this guide
            </Link>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="font-semibold">Before you migrate</h3>
            <p className="mt-2 text-sm text-muted">
              {guide.tradeoff} Back up your data, test an export/import on a
              copy, and validate your essential workflow before deleting the
              original.
            </p>
          </div>
          {!apps.length && (
            <p>
              No catalog candidates match this platform. Try another platform.
            </p>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {apps.map(
              (app) =>
                app && (
                  <div key={app.id} className="space-y-2">
                    <AppCard app={app} />
                    <p className="px-2 text-sm text-muted">
                      Editorial match for {guide.task.toLowerCase()}. Confirm
                      capabilities in{" "}
                      {safeHref(app.links.repository) ? (
                        <a
                          className="text-accent underline"
                          href={safeHref(app.links.repository)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          upstream documentation
                        </a>
                      ) : (
                        "upstream documentation"
                      )}
                      ; collaboration, offline support, and import compatibility
                      are not independently verified here.
                    </p>
                  </div>
                ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
