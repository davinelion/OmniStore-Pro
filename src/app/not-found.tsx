import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-accent/40" aria-hidden>
        404
      </p>
      <h1 className="text-2xl font-bold tracking-tight">{t("notFound")}</h1>
      <p className="max-w-md text-sm text-muted">{t("notFoundHint")}</p>
      <ButtonLink href="/">{t("goHome")}</ButtonLink>
    </div>
  );
}
