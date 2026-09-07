import { notFound } from "next/navigation";
import { queryApps } from "@/lib/api/catalog";
import { CATEGORIES } from "@/config/site";
import { AppCard } from "@/components/app/AppCard";

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const cat = CATEGORIES.find((c) => c.slug === params.slug);
  if (!cat) notFound();
  const { items } = await queryApps({ category: cat.slug, sort: "popularity" });
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">{cat.name}</h1>
      {items.length === 0 ? (
        <p className="mt-6">No apps found.</p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((a) => (
            <AppCard key={a.id} app={a} />
          ))}
        </div>
      )}
    </div>
  );
}
