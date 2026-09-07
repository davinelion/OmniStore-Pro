import Link from "next/link";
import { collections } from "@/config/collections";

export const metadata = { title: "Collections" };

export default function CollectionsPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Collections</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {collections.map((c) => (
          <Link key={c.slug} href={`/collections/${c.slug}`} className="rounded-2xl border border-[var(--line)] p-5">
            <h2 className="font-medium">{c.name}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
