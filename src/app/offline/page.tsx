import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function OfflinePage() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{t("offline")}</h1>
      <p className="text-sm text-muted">{t("errorHint")}</p>
      <Link href="/" className="text-sm font-medium text-accent hover:underline">
        {t("goHome")}
      </Link>
    </div>
  );
}
