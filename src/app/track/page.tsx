import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TrackPanel } from "@/components/track/TrackPanel";

/**
 * /track — add any source and let OmniSource watch it for you.
 *
 * Server-rendered shell only; all state lives in the client panel so the
 * tracked list can be read from IndexedDB without a round trip.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("track");
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function TrackPage() {
  return <TrackPanel />;
}
