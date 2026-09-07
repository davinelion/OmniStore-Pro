import type { Metadata } from "next";

import { CompareView } from "@/components/compare/CompareView";
import { getProvider } from "@/lib/api";
import { MAX_COMPARE } from "@/lib/compare";
import { absoluteUrl } from "@/config/site";
import type { App } from "@/lib/schemas/omnisource";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare Apps",
  description:
    "Compare open-source applications side by side: platforms, packages, licence, release activity and scores.",
  alternates: { canonical: absoluteUrl("/compare") },
  robots: { index: false, follow: true },
};

/**
 * /compare — the selection lives in the URL, so a shared link must render
 * immediately. Ids (or slugs) are resolved here, server-side, before the
 * client view takes over.
 */
export default async function ComparePage({
  searchParams,
}: {
  searchParams: { ids?: string | string[] };
}) {
  const raw = Array.isArray(searchParams.ids) ? searchParams.ids.join(",") : searchParams.ids ?? "";
  const requested = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE);

  const provider = getProvider();
  const resolved: App[] = requested.length > 0 ? await provider.getAppsByIds(requested) : [];
  // Canonical ids only: slugs are a navigation convenience, not identity.
  const initialIds = resolved.map((app) => app.id).slice(0, MAX_COMPARE);

  // A shared comparison renders its table without waiting for client data.
  return <CompareView initialIds={initialIds} initialApps={resolved.slice(0, MAX_COMPARE)} />;
}
