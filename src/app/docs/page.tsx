export const metadata = { title: "Documentation" };

export default function DocsPage() {
  return (
    <div className="max-w-3xl space-y-6 text-[var(--muted)]">
      <h1 className="font-display text-3xl font-semibold text-[var(--fg)]">Documentation</h1>
      <section>
        <h2 className="text-xl font-medium text-[var(--fg)]">What OmniStore is</h2>
        <p>A discovery interface. It does not own third-party applications.</p>
      </section>
      <section>
        <h2 className="text-xl font-medium text-[var(--fg)]">How apps are sourced</h2>
        <p>Metadata comes from OmniSource APIs and feeds. When OmniSource is not configured, a local catalog feed is used.</p>
      </section>
      <section>
        <h2 className="text-xl font-medium text-[var(--fg)]">Verification and Trust Score</h2>
        <p>
          Only assets marked VALID are offered as normal downloads. Trust Score is an explainable signal, not a
          malware-free guarantee.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-medium text-[var(--fg)]">Installation</h2>
        <p>The web client opens upstream downloads. Operating systems perform installation.</p>
      </section>
      <section>
        <h2 className="text-xl font-medium text-[var(--fg)]">Reporting</h2>
        <p>Use Report an Issue on any app page for broken downloads or incorrect metadata.</p>
      </section>
    </div>
  );
}
