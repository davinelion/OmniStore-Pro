import { getLatest } from "@/lib/api/catalog";
import { AppCard } from "@/components/app/AppCard";

export const metadata = { title: "Latest" };

export default async function LatestPage() {
  const t = await getLatest();
  return (
    <div className="space-y-10">
      <h1 className="font-display text-3xl font-semibold">Latest</h1>
      <section>
        <h2 className="font-display text-xl font-semibold">Recently Added</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {t.added.map((a) => (
            <AppCard key={a.id} app={a} />
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl font-semibold">Recently Updated</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {t.updated.map((a) => (
            <AppCard key={a.id} app={a} />
          ))}
        </div>
      </section>
    </div>
  );
}
