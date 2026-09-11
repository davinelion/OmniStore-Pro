import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getOmnisource } from "@/lib/omnisource";
import { CategoryCard } from "@/components/category/CategoryCard";
import { SectionHeading } from "@/components/ui/primitives";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Categories",
  description: "The catalog taxonomy maintained by OmniSource.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const t = await getTranslations("categories");
  const client = getOmnisource();
  const categories = await client.getCategories();

  return (
    <div className="space-y-6">
      <SectionHeading level={1} title={t("title")} description={t("description")} />
      {categories.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">{t("empty")}</p>
      )}
    </div>
  );
}
