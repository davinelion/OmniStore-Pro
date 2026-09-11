import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getOmnisource } from "@/lib/omnisource";
import { BrowseView, type BrowseQuery } from "@/components/search/BrowseView";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Browse apps",
  description: "The full open-source catalog with platform, category and trust filters.",
  alternates: { canonical: "/apps" },
};

export default async function AppsPage({
  searchParams,
}: {
  searchParams: Promise<BrowseQuery>;
}) {
  const [query, client] = await Promise.all([searchParams, getOmnisource()]);
  const [categories, platforms] = await Promise.all([client.getCategories(), client.getPlatforms()]);
  return (
    <BrowseView query={query} mode="browse" categories={categories} platforms={platforms} />
  );
}
