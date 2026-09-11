import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getOmnisource } from "@/lib/omnisource";
import { SecurityDashboard } from "@/components/app/SecurityDashboard";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const client = getOmnisource();
  const app = await client.getApp(decodeURIComponent(id));
  return { title: app ? `Security — ${app.name}` : "Security" };
}

/** Security dashboard (Phase 11) — evidence served by OmniSource. */
export default async function SecurityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getOmnisource();
  const t = await getTranslations("security");

  const decoded = decodeURIComponent(id);
  const [app, report] = await Promise.all([client.getApp(decoded), client.getSecurity(decoded)]);
  if (!app && !report) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted">
          {app ? (
            <a href={`/app/${app.slug}`} className="hover:text-accent hover:underline">
              {app.name}
            </a>
          ) : null}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </header>
      <SecurityDashboard report={report} />
    </div>
  );
}
