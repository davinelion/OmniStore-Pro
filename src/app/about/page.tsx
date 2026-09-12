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
      {/* Branded page header — matches the storefront's visual identity. */}
      <header className="relative isolate overflow-hidden rounded-3xl border border-line/80 p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-12 h-48 w-48 rounded-full bg-accent-2/15 blur-3xl" />
          <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
        </div>
        <SectionHeading level={1} title={t("title")} description={t("intro")} />
      </header>
      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">{section.title}</h2>
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
