import { queryApps } from "@/lib/api/catalog";
import { AppCard } from "@/components/app/AppCard";
import { CATEGORIES, PLATFORMS } from "@/config/site";
import Link from "next/link";

type SP = { [k: string]: string | string[] | undefined };

function g(sp: SP, k: string) {
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v ?? "";
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const q = g(searchParams, "q");
  const platform = g(searchParams, "platform");
  const category = g(searchParams, "category");
  const license = g(searchParams, "license");
  const architecture = g(searchParams, "architecture");
  const sort = g(searchParams, "sort") || "relevance";
  const minTrust = g(searchParams, "trust");
  const { items, total } = await queryApps({
    q,
    platform,
    category,
    license,
    architecture,
    sort,
    minTrust,
  });

  function href(next: Record<string, string>) {
    const p = new URLSearchParams();
    const merged = { q, platform, category, license, architecture, sort, trust: minTrust, ...next };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    return `/search?${p.toString()}`;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <h1 className="font-display text-2xl font-semibold">Search</h1>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} className="w-full rounded-xl border border-[var(--line)] px-3 py-2" aria-label="Query" />
        </form>
        <Filter label="Platform" values={PLATFORMS.map((p) => p.slug)} current={platform} href={href} keyName="platform" />
        <Filter label="Category" values={CATEGORIES.map((c) => c.slug)} current={category} href={href} keyName="category" />
        <div>
          <p className="text-sm font-medium">Sort</p>
          {["relevance", "popularity", "updated", "newest", "name", "trust"].map((s) => (
            <Link key={s} href={href({ sort: s })} className={`mr-2 text-sm ${sort === s ? "text-accent" : "text-[var(--muted)]"}`}>
              {s}
            </Link>
          ))}
        </div>
      </aside>
      <div>
        <p className="text-sm text-[var(--muted)]">{total} results{q ? ` for “${q}”` : ""}</p>
        {items.length === 0 ? (
          <p className="mt-8">No apps found. Try another search or remove some filters.</p>
        ) : (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {items.map((a) => (
              <AppCard key={a.id} app={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Filter({
  label,
  values,
  current,
  href,
  keyName,
}: {
  label: string;
  values: string[];
  current: string;
  href: (n: Record<string, string>) => string;
  keyName: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link href={href({ [keyName]: "" })} className={!current ? "text-accent text-sm" : "text-sm text-[var(--muted)]"}>
          All
        </Link>
        {values.map((v) => (
          <Link key={v} href={href({ [keyName]: v })} className={current === v ? "text-accent text-sm" : "text-sm text-[var(--muted)]"}>
            {v}
          </Link>
        ))}
      </div>
    </div>
  );
}
