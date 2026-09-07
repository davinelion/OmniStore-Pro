import { getTrending } from "@/lib/api/catalog";
import { AppCard } from "@/components/app/AppCard";

export const metadata = { title: "Trending" };

export default async function TrendingPage() {
  const t = await getTrending();
  return (
    <div className="space-y-10">
      <h1 className="font-display text-3xl font-semibold">Trending</h1>
      <Block title="Trending Today" items={t.today} />
      <Block title="Trending This Week" items={t.week} />
      <Block title="Fast Growing" items={t.growing} />
    </div>
  );
}

function Block({ title, items }: { title: string; items: Awaited<ReturnType<typeof getTrending>>["today"] }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </div>
    </section>
  );
}
