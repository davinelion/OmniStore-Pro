import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
      <p className="text-6xl font-semibold tracking-tight text-fg-subtle">404</p>
      <h1 className="text-2xl font-semibold">We could not find that page</h1>
      <p className="text-muted">
        The app, category or page you asked for may have been renamed or is not indexed by OmniSource.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/apps">Browse apps</ButtonLink>
        <ButtonLink href="/search" variant="outline">
          Search
        </ButtonLink>
      </div>
      <p className="text-2xs text-fg-subtle">
        Looking for something specific?{" "}
        <Link href="/report" className="text-accent hover:underline">
          Report a missing listing
        </Link>
        .
      </p>
    </div>
  );
}
