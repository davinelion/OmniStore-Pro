import type { Metadata } from "next";
import { site } from "@/config/site";
export const metadata: Metadata = {
  title: "Contribute to OmniStore",
  alternates: { canonical: "/contribute" },
};
const actions = [
  {
    title: "Suggest an app",
    template: "app-submission.yml",
    description:
      "Submit the official repository, license, supported platforms, and release source.",
  },
  {
    title: "Correct metadata or add evidence",
    template: "metadata-correction.yml",
    description:
      "Add official documentation, permitted screenshots, checksums, or a sourced alternative guide.",
  },
  {
    title: "Report a broken download",
    template: "broken-download.yml",
    description:
      "Tell us the app, version, platform, asset URL, and observed error. Never upload executables.",
  },
];
export default function ContributePage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-widest text-accent">
          A better catalog, together
        </p>
        <h1 className="mt-2 text-4xl font-semibold">Contribute to OmniStore</h1>
        <p className="mt-3 text-muted">
          Every addition is reviewed. Submitting a link does not automatically
          publish it or certify a download.
        </p>
      </header>
      <div className="grid gap-5 md:grid-cols-3">
        {actions.map((a) => (
          <section key={a.template} className="card space-y-4 p-6">
            <h2 className="text-xl font-semibold">{a.title}</h2>
            <p className="text-sm text-muted">{a.description}</p>
            <a
              href={`${site.repoUrl}/issues/new?template=${a.template}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-accent px-4 py-2 text-sm text-accent-fg"
            >
              Open GitHub submission
            </a>
          </section>
        ))}
      </div>
      <section className="card space-y-4 p-6">
        <h2 className="text-xl font-semibold">How review works</h2>
        <ol className="list-decimal space-y-2 pl-5 text-muted">
          <li>
            Supply official HTTPS sources and factual, reproducible evidence.
          </li>
          <li>
            Maintainers review licensing, identity, platform claims, and
            metadata provenance.
          </li>
          <li>
            Feed changes pass schema validation and tests before publication.
          </li>
          <li>Approved changes appear after the next published snapshot.</li>
        </ol>
        <p className="text-sm text-muted">
          GitHub sign-in is required for submissions. Issues are public: do not
          include passwords, access tokens, private URLs, or personal data.
          Screenshot contributions must include attribution and a license or
          permission basis. Security concerns should not include exploit
          instructions or private credentials in a public issue.
        </p>
      </section>
    </div>
  );
}
