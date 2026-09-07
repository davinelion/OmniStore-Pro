import { notFound } from "next/navigation";
import { queryApps } from "@/lib/api/catalog";
import { PLATFORMS } from "@/config/site";
import { AppCard } from "@/components/app/AppCard";

export default async function PlatformPage({ params }: { params: { slug: string } }) {
  const p = PLATFORMS.find((x) => x.slug === params.slug);
  if (!p) notFound();
  const popular = await queryApps({ platform: p.slug, sort: "popularity" });
  const latest = await queryApps({ platform: p.slug, sort: "newest" });
  const updated = await queryApps({ platform: p.slug, sort: "updated" });
  return (
    <div className="space-y-10">
      <h1 className="font-display text-3xl font-semibold">{p.name}</h1>
      <Block title="Popular Apps" items={popular.items} />
      <Block title="Latest Apps" items={latest.items} />
      <Block title="Recently Updated" items={updated.items} />
    </div>
  );
}

function Block({ title, items }: { title: string; items: Awaited<ReturnType<typeof queryApps>>["items"] }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {items.slice(0, 6).map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </div>
    </section>
  );
}
