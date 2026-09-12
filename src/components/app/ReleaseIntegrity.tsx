import { getTranslations } from "next-intl/server";
import { CheckCircle2, CircleAlert, Fingerprint, Package, Store } from "lucide-react";

import type { App } from "@omnistore/shared-models";
import { Badge, Card } from "@/components/ui/primitives";

/** Honest release provenance: every value is read from OmniSource assets. */
export async function ReleaseIntegrity({ app }: { app: App }) {
  const t = await getTranslations("integrity");
  const assets = app.latestRelease?.assets ?? [];
  const valid = assets.filter((asset) => asset.status === "VALID").length;
  const verified = assets.length > 0 && valid === assets.length;
  const stores = [...new Set(assets.map((asset) => asset.source).filter((source): source is string => Boolean(source)))];
  const platforms = [...new Set(assets.map((asset) => asset.platform).filter((platform): platform is NonNullable<typeof platform> => Boolean(platform)))];

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Fingerprint className="h-4 w-4 text-accent" aria-hidden /> {t("title")}</h2>
        <Badge tone={verified ? "success" : assets.length > 0 ? "warning" : "neutral"}>
          {verified ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <CircleAlert className="h-3 w-3" aria-hidden />}
          {assets.length === 0 ? t("notReported") : verified ? t("verifiedAssets") : t("reviewRequired")}
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-surface-2 p-3"><p className="text-2xs uppercase tracking-wide text-subtle">{t("sourceStatus")}</p><p className="mt-1 text-sm font-semibold">{app.openSource === true ? t("openSource") : app.openSource === false ? t("notMarkedOpenSource") : t("notReported")}</p></div>
        <div className="rounded-xl bg-surface-2 p-3"><p className="text-2xs uppercase tracking-wide text-subtle">{t("supportedStores")}</p><p className="mt-1 text-sm font-semibold">{stores.length > 0 ? stores.join(", ") : t("notReported")}</p></div>
        <div className="rounded-xl bg-surface-2 p-3"><p className="text-2xs uppercase tracking-wide text-subtle">{t("platforms")}</p><p className="mt-1 text-sm font-semibold">{platforms.length > 0 ? platforms.join(", ") : t("notReported")}</p></div>
      </div>
      {assets.length > 0 ? <div className="space-y-2"><p className="flex items-center gap-2 text-xs font-semibold"><Package className="h-3.5 w-3.5 text-muted" aria-hidden /> {t("checksums")}</p><ul className="divide-y divide-line rounded-xl border border-line">{assets.map((asset) => <li key={asset.id} className="space-y-1 p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{asset.packageType}{asset.architecture ? ` · ${asset.architecture}` : ""}</span><span className={asset.status === "VALID" ? "text-success" : "text-warning"}>{asset.status}</span></div><code className="block break-all font-mono text-2xs text-muted">{asset.sha256 ?? t("noChecksum")}</code></li>)}</ul></div> : <p className="text-xs leading-relaxed text-muted">{t("noAssets")}</p>}
      {stores.length > 0 ? <p className="flex items-center gap-2 text-2xs text-subtle"><Store className="h-3.5 w-3.5" aria-hidden /> {t("storeNote")}</p> : null}
    </Card>
  );
}
