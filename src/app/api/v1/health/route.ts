import { NextResponse } from "next/server";
import { getProvider } from "@/lib/api";
import { json } from "@/lib/api/http";
import { site } from "@/config/site";

export const dynamic = "force-dynamic";

/** GET /api/v1/health — liveness plus which OmniSource backend is in use. */
export async function GET() {
  try {
    const provider = getProvider();
    const meta = await provider.getFeedMeta();
    const stats = await provider.getStats();
    return json({
      status: "ok",
      service: "omnistore-web",
      version: site.version,
      provider: { name: provider.name, origin: provider.origin },
      meta,
      stats,
    });
  } catch (error) {
    // Report an unhealthy dependency rather than a generic 500: operators need
    // to know the feed, not the app, is the problem.
    return NextResponse.json(
      {
        status: "degraded",
        service: "omnistore-web",
        error: { code: "feed_unavailable", message: "OmniSource feed could not be read." },
      },
      { status: 503 },
    );
  }
}
