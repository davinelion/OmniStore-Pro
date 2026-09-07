import { queryApps } from "@/lib/api/catalog";
import { AppCard } from "@/components/app/AppCard";

export const metadata = { title: "Apps" };

export default async function AppsPage() {
  const { items } = await queryApps({ sort: "name" });
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Apps</h1>
      <p className="mt-2 text-[var(--muted)]">{items.length} applications from OmniSource.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </div>
    </div>
  );
}
