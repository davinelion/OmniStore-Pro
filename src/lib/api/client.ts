import type { App } from "@/lib/schemas/omnisource";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { accept: "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) {
    throw new Error("request_failed");
  }
  return res.json() as Promise<T>;
}

export const omniClient = {
  getApps: (qs = "") => api<{ items: App[]; total: number; freshness?: string }>(`/api/v1/apps${qs}`),
  getApp: (id: string) => api<App>(`/api/v1/apps/${id}`),
  searchApps: (qs: string) =>
    api<{ items: App[]; total: number; freshness?: string }>(`/api/v1/search?${qs}`),
  getCategories: () => api<{ items: { slug: string; name: string; count: number }[] }>(`/api/v1/categories`),
  getPlatforms: () => api<{ items: { slug: string; name: string }[] }>(`/api/v1/platforms`),
  getTrending: () => api<{ today: App[]; week: App[]; growing: App[] }>(`/api/v1/trending`),
  getLatest: () => api<{ added: App[]; updated: App[] }>(`/api/v1/latest`),
  getReleases: (id: string) => api<{ items: App["releases"] }>(`/api/v1/apps/${id}/releases`),
  getAlternatives: (id: string) => api<{ items: App[] }>(`/api/v1/apps/${id}/alternatives`),
  getHome: () =>
    api<{
      featured: App[];
      trending: App[];
      updated: App[];
      newest: App[];
      cross: App[];
      freshness?: string;
    }>(`/api/v1/home`),
  getDeveloper: (slug: string) => api<{ developer: App["developer"]; apps: App[] }>(`/api/v1/developers/${slug}`),
  compare: (ids: string[]) =>
    api<{ items: App[] }>(`/api/v1/compare?ids=${ids.map(encodeURIComponent).join(",")}`),
  report: (body: unknown) =>
    api<{ ok: boolean }>(`/api/v1/reports`, { method: "POST", body: JSON.stringify(body) }),
};
