import type { Metadata } from "next";
import Link from "next/link";
import { getProvider } from "@/lib/api";
import { catalogApps, catalogQuality } from "@/lib/catalog/quality";
import { formatDate } from "@/lib/formatters";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Catalog transparency",
  alternates: { canonical: "/catalog-health" },
};
export default async function CatalogHealthPage() {
  const provider = getProvider();
  const [apps, meta] = await Promise.all([
    catalogApps(provider),
    provider.getFeedMeta(),
  ]);
  const quality = catalogQuality(apps);
  const stats = [
    ["Apps in catalog", quality.apps],
    ["Missing screenshots", quality.missingScreenshots],
    ["Incomplete checksums", quality.missingChecksums],
    ["Stale / unknown sources", quality.stale],
    ["Archived projects", quality.archived],
    ["No release assets", quality.noAssets],
  ];
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-widest text-accent">
          Evidence, not promises
        </p>
        <h1 className="mt-2 text-4xl font-semibold">Catalog transparency</h1>
        <p className="mt-3 text-muted">
          Snapshot generated {formatDate(meta.generated_at)} · {provider.name}
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <section className="card space-y-3 p-6">
        <h2 className="text-xl font-semibold">What these signals mean</h2>
        <p>
          {quality.checksums} of {quality.assets} unique assets have a published
          SHA-256. {quality.validated} have a VALID source status.
        </p>
        <p className="text-muted">
          VALID means upstream URL policy validation, not malware scanning or
          independent binary verification. A published checksum is not a
          verified signature. Sources are stale after 14 days without a fetch;
          unknown timestamps are included. These figures describe metadata, not
          live download availability.
        </p>
        <Link className="text-accent underline" href="/contribute">
          Help improve the catalog
        </Link>
      </section>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <caption className="p-4 text-left font-semibold">
            Per-app coverage
          </caption>
          <thead className="bg-surface-2">
            <tr>
              {[
                "App",
                "Source fetched",
                "Screenshots",
                "Published checksums",
                "Attention",
              ].map((t) => (
                <th key={t} scope="col" className="p-3">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quality.rows.map((row) => (
              <tr key={row.app.id} className="border-t border-line">
                <th scope="row" className="p-3">
                  <Link className="text-accent" href={`/apps/${row.app.slug}`}>
                    {row.app.name}
                  </Link>
                </th>
                <td className="p-3">{formatDate(row.app.source.fetched_at)}</td>
                <td className="p-3">{row.screenshots}</td>
                <td className="p-3">
                  {row.publishedChecksums} / {row.assets}
                </td>
                <td className="p-3">
                  {[
                    row.archived && "Archived",
                    row.stale && "Refresh needed",
                    !row.assets && "No assets",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "None flagged"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
