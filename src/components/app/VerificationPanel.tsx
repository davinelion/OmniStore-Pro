import Link from "next/link";
import type { App } from "@/lib/schemas/omnisource";
import { appQuality } from "@/lib/catalog/quality";
import { formatDate } from "@/lib/formatters";
export function VerificationPanel({ app }: { app: App }) {
  const quality = appQuality(app);
  return (
    <section className="card space-y-3 p-5" aria-labelledby="evidence-heading">
      <h2 id="evidence-heading" className="text-lg font-semibold">
        Verification evidence
      </h2>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-muted">Metadata fetched</dt>
          <dd>
            {formatDate(app.source.fetched_at)}
            {quality.stale ? " · Refresh needed" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Upstream URL validation</dt>
          <dd>
            {quality.validatedAssets} of {quality.assets} assets marked VALID
          </dd>
        </div>
        <div>
          <dt className="text-muted">Published SHA-256</dt>
          <dd>
            {quality.publishedChecksums} of {quality.assets} assets
          </dd>
        </div>
        <div>
          <dt className="text-muted">
            Independent binary / signature verification
          </dt>
          <dd>Not performed by this client</dd>
        </div>
        <div>
          <dt className="text-muted">Malware scanning</dt>
          <dd>Not performed</dd>
        </div>
      </dl>
      {app.metadata_evidence && (
        <p className="text-sm text-muted">
          Metadata reviewed {formatDate(app.metadata_evidence.reviewed_at)} ·{" "}
          <a
            className="text-accent underline"
            href={app.metadata_evidence.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Review evidence
          </a>
        </p>
      )}
      <p className="text-xs text-muted">
        Checksums identify bytes; they do not establish safety. Source
        timestamps are not binary verification timestamps. Keep operating-system
        protections enabled.
      </p>
      <Link className="text-sm text-accent underline" href="/catalog-health">
        View catalog transparency
      </Link>
    </section>
  );
}
