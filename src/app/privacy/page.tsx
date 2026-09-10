import { AnalyticsConsent } from "@/components/layout/AnalyticsConsent";
import type { Metadata } from "next";
import Link from "next/link";

import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What OmniStore stores, what it does not, and how your data is handled.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
        <p className="text-muted">Last updated {new Date("2026-09-11").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">No account required</h2>
        <p className="text-muted">
          Browsing, searching, comparing and downloading from OmniStore never requires an account. We
          do not ask for your name, email address or any other identifier.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What is stored on your device</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>
            <strong>Favorites and followed apps</strong> — saved in your browser’s local storage. They
            are not synchronised. App IDs are sent to the catalog API to load their current metadata.
          </li>
          <li><strong>Personal library and inbox</strong> — collection names, private notes, read state, and preferences stay in local storage. Share links include names and app IDs but exclude notes. JSON backups include notes; share them carefully. Importing a backup adds lists without replacing existing ones.</li>
          <li>
            <strong>Comparison selection</strong> — stored locally so the comparison tray survives
            navigation.
          </li>
          <li>
            <strong>Theme and language</strong> — stored locally (and in a cookie for language) so the
            site loads the way you left it.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <p className="text-muted">
          Analytics require deployment enablement and your explicit opt-in below. OmniStore records
          anonymous, aggregated product events only — for example that a search was performed or a
          download button was clicked. No cookies, no advertising identifiers, no personal data, no
          cross-site tracking, and no third-party analytics scripts.
        </p>
      </section>

      <AnalyticsConsent />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Downloads go upstream</h2>
        <p className="text-muted">
          OmniStore does not host application binaries. When you download, your browser connects
          directly to the upstream release host, whose own privacy policy applies to that request.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Reports</h2>
        <p className="text-muted">
          Issue reports contain the reason you selected, any details you type, and the app they refer
          to. Contact details are optional — leave the field empty to stay anonymous.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Your choices</h2>
        <p className="text-muted">
          Clearing site data in your browser removes personal lists, notes, inbox read state, consent, favorites, follows, theme and language
          preferences immediately. You can use OmniStore fully without ever saving anything.
        </p>
      </section>

      <p className="text-sm text-muted">
        Questions? Open an issue on the{" "}
        <a href={site.repoUrl} target="_blank" rel="noopener noreferrer external" className="text-accent hover:underline">
          OmniStore repository
        </a>{" "}
        or read the <Link href="/terms" className="text-accent hover:underline">terms</Link>.
      </p>
    </div>
  );
}
