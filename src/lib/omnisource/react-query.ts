"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { App, Category, Paginated } from "@omnistore/shared-models";
import { getOmnisource } from "@/lib/omnisource";

/** Shared query keys keep interactive surfaces cache-compatible with RSC data. */
export const omniQueryKeys = {
  apps: (params: Record<string, unknown> = {}) => ["omnisource", "apps", params] as const,
  app: (id: string) => ["omnisource", "app", id] as const,
  categories: () => ["omnisource", "categories"] as const,
  trending: () => ["omnisource", "trending"] as const,
  collections: () => ["omnisource", "collections"] as const,
  recommendations: (id: string) => ["omnisource", "recommendations", id] as const,
};

export function useAppsQuery(options?: UseQueryOptions<Paginated<App>, Error>) {
  return useQuery({
    queryKey: omniQueryKeys.apps(),
    queryFn: () => getOmnisource().getApps(),
    ...options,
  });
}

export function useAppQuery(id: string, options?: UseQueryOptions<App | null, Error>) {
  return useQuery({
    queryKey: omniQueryKeys.app(id),
    queryFn: () => getOmnisource().getApp(id),
    enabled: Boolean(id) && options?.enabled !== false,
    ...options,
  });
}

export function useTrendingQuery(options?: UseQueryOptions<App[], Error>) {
  return useQuery({ queryKey: omniQueryKeys.trending(), queryFn: () => getOmnisource().getTrending(), ...options });
}

export function useCategoriesQuery(options?: UseQueryOptions<Category[], Error>) {
  return useQuery({ queryKey: omniQueryKeys.categories(), queryFn: () => getOmnisource().getCategories(), ...options });
}
