import { getProvider } from "@/lib/api";
import { apiError } from "@/lib/api/http";
import { releaseRss } from "@/lib/catalog/rss";
import { site } from "@/config/site";
export const dynamic = "force-dynamic";
/** Public catalog or single-app RSS. Stable only unless prereleases=true. */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const appId = params.get("app");
    const provider = getProvider();
    let items;
    if (appId) {
      if (appId.length > 200) return apiError("invalid_request", 400);
      const app = await provider.getApp(appId);
      if (!app) return apiError("not_found", 404);
      const releases = await provider.getReleases(appId);
      items = releases.map((release) => ({ app, release }));
    } else items = (await provider.getLatest()).releases;
    const body = releaseRss(
      items
        .filter(
          (i) => params.get("prereleases") === "true" || !i.release.prerelease,
        )
        .slice(0, 100),
      site.url,
    );
    return new Response(body, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return apiError("feed_unavailable", 503);
  }
}
