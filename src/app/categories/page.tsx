import Link from "next/link";
import { getCategories } from "@/lib/api/catalog";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const items = await getCategories();
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Categories</h1>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {items.map((c) => (
          <Link key={c.slug} href={`/categories/${c.slug}`} className="rounded-2xl border border-[var(--line)] p-5">
            <p className="font-medium">{c.name}</p>
            <p className="text-sm text-[var(--muted)]">{c.count} apps</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
