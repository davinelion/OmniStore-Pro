import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppBySlug } from "@/lib/api/catalog";
import { formatDate } from "@/lib/utils";
import { sanitizeMarkdown } from "@/lib/security/urls";

export default async function ReleasesPage({ params }: { params: { slug: string } }) {
  const app = await getAppBySlug(params.slug);
  if (!app) notFound();
  return (
    <div>
      <Link href={`/apps/${app.slug}`} className="text-sm text-accent">
        ← {app.name}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold">Releases</h1>
      <ol className="mt-8 space-y-4">
        {(app.releases ?? []).map((r) => (
          <li key={r.version} className="rounded-2xl border border-[var(--line)] p-4">
            <details>
              <summary className="cursor-pointer font-medium">
                v{r.version} · {formatDate(r.released_at)}
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--muted)]">
                {sanitizeMarkdown(r.notes) || "Not available"}
              </p>
            </details>
          </li>
        ))}
        {!(app.releases ?? []).length && <p>Not available</p>}
      </ol>
    </div>
  );
}
