import { useTranslations } from "next-intl";
import {
  Blocks,
  Download,
  GitBranch,
  Library,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";

import { sectionSlug } from "@/lib/section";
import { SectionHeading } from "@/components/ui/primitives";

const FEATURES = [
  { key: "featureTrust", Icon: ShieldCheck },
  { key: "featureSecurity", Icon: ScanSearch },
  { key: "featurePlatforms", Icon: Blocks },
  { key: "featureLocal", Icon: Library },
  { key: "featureTrack", Icon: GitBranch },
  { key: "featurePwa", Icon: Download },
] as const;

type FeatureKey = (typeof FEATURES)[number]["key"];

/**
 * FeaturesGrid — "Why OmniStore": the product's differentiators.
 *
 * Static presentation content (like the footer) — every string lives in the
 * message catalogue; no catalog data is rendered here.
 */
export function FeaturesGrid() {
  const t = useTranslations("home");

  return (
    <section aria-labelledby={sectionSlug(t("featuresTitle"))} className="space-y-6">
      <SectionHeading
        id={sectionSlug(t("featuresTitle"))}
        title={
          <span className="text-gradient-brand text-2xl font-bold sm:text-3xl">
            {t("featuresTitle")}
          </span>
        }
        description={t("featuresSubtitle")}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ key, Icon }, index) => (
          <FeatureCard key={key} index={index} Icon={Icon} name={t(`${key}Name`)} description={t(`${key}Description`)} />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({
  name,
  description,
  Icon,
  index,
}: {
  name: string;
  description: string;
  Icon: (typeof FEATURES)[number]["Icon"];
  index: number;
}) {
  void index;
  return (
    <article
      className={
        "group relative isolate overflow-hidden rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur-sm " +
        "transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-glow"
      }
    >
      {/* Hover wash */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(120%_100%_at_50%_0%,rgb(var(--accent)/0.1),transparent_60%)]"
      />
      <span
        className={
          "flex h-11 w-11 items-center justify-center rounded-xl " +
          "border border-accent/25 bg-gradient-to-br from-accent/15 to-accent-2/10 text-accent " +
          "transition-transform duration-200 ease-spring group-hover:scale-105"
        }
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-4 font-display text-base font-semibold tracking-tight">{name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
    </article>
  );
}
