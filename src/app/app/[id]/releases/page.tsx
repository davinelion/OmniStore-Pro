import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getOmnisource } from "@/lib/omnisource";
import { ReleaseTimeline } from "@/components/app/ReleaseTimeline";

export const revalidate = 300;

export default async function ReleasesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getOmnisource();
  const t = await getTranslations("app");

  const app = await client.getApp(decodeURIComponent(id));
  if (!app) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted">
          <a href={`/app/${app.slug}`} className="hover:text-accent hover:underline">
            {app.name}
          </a>
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{t("releases")}</h1>
      </header>
      <ReleaseTimeline releases={app.releases ?? []} />
    </div>
  );
}
