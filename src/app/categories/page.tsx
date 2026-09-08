import type { Metadata } from "next";
import Link from "next/link";

import { getProvider } from "@/lib/api";
import { SectionHeading } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse open-source applications by category across every supported platform.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await getProvider().getCategories();
  const withApps = categories.filter((category) => category.app_count > 0);

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Categories"
        description={`${withApps.length} categories with indexed applications.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {withApps.map((category) => (
          <Link
            key={category.slug}
            href={`/categories/${category.slug}`}
            className="card card-interactive p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold">{category.name}</h2>
              <span className="rounded-full border border-line px-2 py-0.5 text-2xs tabular-nums text-fg-muted">
                {category.app_count}
              </span>
            </div>
            {category.description ? (
              <p className="mt-2 text-sm text-muted">{category.description}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
