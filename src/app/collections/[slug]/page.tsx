import { notFound } from "next/navigation";
import { collections } from "@/config/collections";
import { getRelated } from "@/lib/api/catalog";
import { AppCard } from "@/components/app/AppCard";

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const c = collections.find((x) => x.slug === params.slug);
  if (!c) notFound();
  const apps = await getRelated(c.apps);
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">{c.name}</h1>
      <p className="mt-2 text-[var(--muted)]">{c.description}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {apps.map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </div>
    </div>
  );
}
