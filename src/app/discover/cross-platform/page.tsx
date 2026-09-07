import { queryApps } from "@/lib/api/catalog";
import { AppCard } from "@/components/app/AppCard";
import { PLATFORMS } from "@/config/site";
import Link from "next/link";

export const metadata = { title: "Cross-Platform Apps" };

export default async function CrossPage({ searchParams }: { searchParams: { platforms?: string } }) {
  const selected = (searchParams.platforms ?? "").split(",").filter(Boolean);
  const { items } = await queryApps(
    selected.length ? { allPlatforms: selected.join(",") } : {}
  );
  const list = selected.length ? items : items.filter((a) => a.platforms.length >= 3);
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Cross-Platform Apps</h1>
      <p className="mt-2 text-[var(--muted)]">Available on all selected platforms</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {PLATFORMS.map((p) => {
          const next = selected.includes(p.slug)
            ? selected.filter((s) => s !== p.slug)
            : [...selected, p.slug];
          return (
            <Link
              key={p.slug}
              href={`/discover/cross-platform?platforms=${next.join(",")}`}
              className={`rounded-full px-3 py-1 text-sm ${selected.includes(p.slug) ? "bg-accent text-white" : "border border-[var(--line)]"}`}
            >
              {p.name}
            </Link>
          );
        })}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </div>
    </div>
  );
}
