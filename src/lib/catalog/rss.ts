import type { App, Release } from "@/lib/schemas/omnisource";
export function escapeXml(text: string) {
  return text
    .replace(
      /[<>&"']/g,
      (c) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    )
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}
export function releaseRss(
  items: Array<{ app: Pick<App, "id" | "slug" | "name">; release: Release }>,
  origin: string,
) {
  const xml = escapeXml;
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>OmniStore releases</title><link>${xml(origin)}</link><description>Upstream releases. Source validation is not a safety guarantee.</description>${items
    .map(({ app, release }) => {
      const date = Date.parse(release.released_at ?? "");
      return `<item><title>${xml(`${app.name} ${release.version}${release.prerelease ? " (prerelease)" : ""}`)}</title><link>${xml(`${origin}/apps/${encodeURIComponent(app.slug)}/releases`)}</link><guid isPermaLink="false">${xml(JSON.stringify([app.id, release.id]))}</guid>${Number.isFinite(date) ? `<pubDate>${new Date(date).toUTCString()}</pubDate>` : ""}<description>${xml(release.name ?? `New release of ${app.name}`)}</description></item>`;
    })
    .join("")}</channel></rss>`;
}
