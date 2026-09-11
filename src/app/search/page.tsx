import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getOmnisource } from "@/lib/omnisource";
import { BrowseView, type BrowseQuery } from "@/components/search/BrowseView";

export const revalidate = 120;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<BrowseQuery>;
}): Promise<Metadata> {
  const query = await searchParams;
  return {
    title: query.q ? `“${query.q}” — Search` : "Search",
    robots: query.q ? { index: false, follow: true } : undefined,
  };
}

/** Search page — the engine is OmniSource's, results are never re-ranked. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<BrowseQuery>;
}) {
  const [query, client] = await Promise.all([searchParams, getOmnisource()]);
  const [categories, platforms] = await Promise.all([client.getCategories(), client.getPlatforms()]);
  return (
    <BrowseView query={query} mode="search" categories={categories} platforms={platforms} />
  );
}
