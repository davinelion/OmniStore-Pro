import type { Metadata } from "next";
import Link from "next/link";

import { getProvider } from "@/lib/api";
import { SectionHeading } from "@/components/ui/primitives";
import { platformIcon } from "@/components/platform/PlatformIcon";
import { pluralize } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Platforms",
  description: "Open-source applications available on iOS, iPadOS, Android, Windows, macOS and Linux.",
  alternates: { canonical: "/platforms" },
};

export default async function PlatformsPage() {
  const platforms = await getProvider().getPlatforms();

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Platforms"
        description="Every package OmniStore lists is normalised to a platform, architecture and package type by OmniSource."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {platforms.map((platform) => {
          const Icon = platformIcon(platform.slug);
          return (
            <Link
              key={platform.slug}
              href={`/platforms/${platform.slug}`}
              className="card card-interactive p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="font-semibold">{platform.name}</h2>
                  <p className="text-sm text-muted">{pluralize(platform.app_count, "app")}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted">{platform.description}</p>
              <p className="mt-3 text-2xs text-fg-subtle">
                Install methods: {platform.install_methods.join(" / ") || "Not available"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
