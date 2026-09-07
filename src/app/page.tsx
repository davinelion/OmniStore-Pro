import Link from "next/link";
import { getHome, getCategories } from "@/lib/api/catalog";
import { AppCard } from "@/components/app/AppCard";
import { PLATFORMS } from "@/config/site";
import { relativeTime } from "@/lib/utils";

export default async function HomePage() {
  const home = await getHome();
  const cats = await getCategories();
  return (
    <div className="space-y-16">
      <section className="grid gap-8 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-accent">Universal open-source discovery</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight md:text-5xl">
            Discover Open-Source Apps
          </h1>
          <p className="mt-4 max-w-xl text-lg text-[var(--muted)]">
            Find trusted open-source software for all your devices.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/apps" className="rounded-full bg-accent px-5 py-2.5 text-white">
              Explore Apps
            </Link>
            <Link href="/platforms" className="rounded-full border border-[var(--line)] px-5 py-2.5">
              Browse Platforms
            </Link>
          </div>
          {home.freshness && (
            <p className="mt-4 text-xs text-[var(--muted)]">Catalog {relativeTime(home.freshness)}</p>
          )}
        </div>
        <form action="/search" className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
          <label htmlFor="home-q" className="text-sm font-medium">
            Search across every platform
          </label>
          <input
            id="home-q"
            name="q"
            placeholder="music, password, maps…"
            className="mt-3 w-full rounded-2xl border border-[var(--line)] bg-transparent px-4 py-3"
          />
          <button className="mt-4 rounded-full bg-ink-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-ink-900">
            Search
          </button>
        </form>
      </section>
      <Section title="Featured Apps" href="/apps">
        {home.featured.map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </Section>
      <Section title="Trending" href="/trending">
        {home.trending.map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </Section>
      <Section title="Recently Updated" href="/latest">
        {home.updated.map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </Section>
      <section>
        <h2 className="font-display text-2xl font-semibold">Popular Categories</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {cats
            .filter((c) => c.count)
            .map((c) => (
              <Link key={c.slug} href={`/categories/${c.slug}`} className="rounded-2xl border border-[var(--line)] p-4">
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-[var(--muted)]">{c.count} apps</p>
              </Link>
            ))}
        </div>
      </section>
      <Section title="Cross-Platform Apps" href="/discover/cross-platform">
        {home.cross.map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </Section>
      <Section title="New Releases" href="/latest">
        {home.newest.map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </Section>
      <section>
        <h2 className="font-display text-2xl font-semibold">Explore by Platform</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {PLATFORMS.map((p) => (
            <Link key={p.slug} href={`/platforms/${p.slug}`} className="rounded-full border border-[var(--line)] px-4 py-2">
              {p.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <Link href={href} className="text-sm text-accent">
          View all
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}
