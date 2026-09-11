/**
 * Trust badge prefetching for card surfaces.
 *
 * Badges always come from OmniSource's trust engine — this helper simply
 * batches the lookups (bounded concurrency) so server components can hand
 * AppCards real badge sets without N+1 waterfall requests.
 */

import type { TrustBadge } from "@omnistore/shared-models";
import { TrustResponseSchema } from "@omnistore/shared-models";
import { getOmnisource } from "./index";

export async function fetchBadges(
  ids: string[],
  concurrency = 6,
): Promise<Map<string, readonly TrustBadge[]>> {
  const unique = [...new Set(ids)].slice(0, 24);
  const result = new Map<string, readonly TrustBadge[]>();
  if (unique.length === 0) return result;

  const client = getOmnisource();
  let cursor = 0;

  async function worker() {
    while (cursor < unique.length) {
      const id = unique[cursor++]!;
      try {
        const report = await client.request(`/trust/${encodeURIComponent(id)}`, TrustResponseSchema, {
          revalidate: 600,
          tags: ["trust", `app:${id}`],
        });
        result.set(
          id,
          (report.badges ?? []).filter((badge): badge is TrustBadge =>
            [
              "verified",
              "trusted",
              "security_audited",
              "community_verified",
              "experimental",
              "deprecated",
            ].includes(badge),
          ),
        );
      } catch {
        /* badge unavailable — render without */
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, unique.length) }, () => worker()),
  );
  return result;
}
