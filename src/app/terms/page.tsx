import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui/primitives";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("terms");
  return { title: t("title") };
}

export default async function TermsPage() {
  const t = await getTranslations("terms");
  const paragraphs = [t("body1"), t("body2"), t("body3")];
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <SectionHeading level={1} title={t("title")} />
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-sm leading-relaxed text-muted">
          {paragraph}
        </p>
      ))}
    </article>
  );
}
