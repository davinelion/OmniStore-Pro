import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for OmniStore, and the relationship between OmniStore, OmniSource and upstream projects.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Terms</h1>
        <p className="text-muted">
          Last updated {new Date("2026-09-08").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">OmniStore is a discovery interface</h2>
        <p className="text-muted">
          OmniStore indexes and presents metadata about open-source applications. It is not an app
          store of record, does not host or mirror application binaries, and is not a party to any
          licence between you and an upstream project.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Applications belong to their authors</h2>
        <p className="text-muted">
          Every application listed remains the work of its upstream authors and is governed by that
          project’s own licence. OmniStore displays licence information supplied by OmniSource and
          links to the canonical licence text where it is known. Where a licence is not published
          upstream, OmniStore says so rather than guessing.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Scores are signals, not guarantees</h2>
        <p className="text-muted">
          Trust, Quality and Popularity scores are computed from public upstream signals and are shown
          with their full factor breakdown. They are not security guarantees, not malware scans, and
          not endorsements. You are responsible for reviewing software before you install it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Verification limits</h2>
        <p className="text-muted">
          A “verified” package means OmniSource established that the artefact is served over HTTPS
          from an accepted upstream release host. It does not mean the software has been audited.
          Packages that fail validation, are quarantined or cannot be verified are never presented as
          ordinary downloads.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Accuracy and corrections</h2>
        <p className="text-muted">
          OmniStore reflects what upstream projects publish and may lag behind them or contain errors.
          Use the Report an Issue control on any app page to flag incorrect metadata, broken downloads
          or licensing problems so the record can be corrected.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Availability</h2>
        <p className="text-muted">
          OmniStore is provided as-is, without warranty. Listings, scores and availability may change
          as upstream projects and OmniSource data change.
        </p>
      </section>

      <p className="text-sm text-muted">
        See also the <Link href="/privacy" className="text-accent hover:underline">privacy notice</Link>{" "}
        and the <Link href="/docs" className="text-accent hover:underline">documentation</Link>.
      </p>
    </div>
  );
}
