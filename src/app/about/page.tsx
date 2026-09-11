import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui/primitives";
import { site } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return { title: t("title") };
}

export default async function AboutPage() {
  const t = await getTranslations("about");
  const sections = [
    { title: t("architectureTitle"), body: t("architectureBody") },
    { title: t("sourcesTitle"), body: t("sourcesBody") },
    { title: t("trustTitle"), body: t("trustBody") },
    { title: t("honestyTitle"), body: t("honestyBody") },
  ];
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SectionHeading title={t("title")} description={t("intro")} />
      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
          <p className="text-sm leading-relaxed text-muted">{section.body}</p>
        </section>
      ))}
      <section className="space-y-2 border-t border-line pt-6 text-sm">
        <a href={site.omnisourceRepoUrl} target="_blank" rel="noopener noreferrer external" className="block font-medium text-accent hover:underline">
          OmniSource Pro →
        </a>
        <a href={site.repoUrl} target="_blank" rel="noopener noreferrer external" className="block font-medium text-accent hover:underline">
          OmniStore Pro →
        </a>
      </section>
    </article>
  );
}
