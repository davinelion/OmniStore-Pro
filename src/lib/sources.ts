/**
 * Source taxonomy — the upstreams OmniSource can index.
 *
 * This mirrors `SourceType` in OmniSource (`omnisource/core/models/source.py`)
 * and the connector registry. It is presentation-only: OmniStore never
 * contacts these hosts itself, it only explains where metadata came from and
 * how to read a repository URL the user pastes.
 */

export type SourceId =
  | "github"
  | "gitlab"
  | "codeberg"
  | "forgejo"
  | "fdroid"
  | "flathub"
  | "winget"
  | "homebrew"
  | "other";

export const SOURCE_LABELS: Record<SourceId, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  codeberg: "Codeberg",
  forgejo: "Forgejo",
  fdroid: "F-Droid",
  flathub: "Flathub",
  winget: "Winget",
  homebrew: "Homebrew",
  other: "Other",
};

/** Hostnames that unambiguously identify a hosted service. */
const EXACT_HOSTS: Record<string, SourceId> = {
  "github.com": "github",
  "gitlab.com": "gitlab",
  "codeberg.org": "codeberg",
  "gitea.com": "forgejo",
  "flathub.org": "flathub",
  "f-droid.org": "fdroid",
};

/**
 * Leading-label → source, for self-hosted forges.
 * `gitlab.gnome.org`, `gitea.example.com` and friends are common enough that
 * guessing them is better than labelling them "Other".
 */
const SUBDOMAIN_LABELS: Record<string, SourceId> = {
  gitlab: "gitlab",
  gitea: "forgejo",
  forgejo: "forgejo",
  codeberg: "codeberg",
};

/** Host suffixes for package-manager pages that are not forge paths. */
const HOST_SUFFIXES: ReadonlyArray<readonly [string, SourceId]> = [
  ["formulae.brew.sh", "homebrew"],
  ["brew.sh", "homebrew"],
  ["winget.run", "winget"],
  ["izzyondroid.de", "fdroid"],
  ["apt.izzysoft.de", "fdroid"],
  ["flathub.org", "flathub"],
  ["f-droid.org", "fdroid"],
];

function sourceForHost(host: string): SourceId {
  const exact = EXACT_HOSTS[host];
  if (exact) return exact;

  const label = host.split(".")[0] ?? "";
  const byLabel = SUBDOMAIN_LABELS[label];
  if (byLabel) return byLabel;

  for (const [suffix, source] of HOST_SUFFIXES) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return source;
  }
  return "other";
}

export interface ParsedSource {
  /** Which upstream this looks like. */
  source: SourceId;
  /** `owner/name` for forges, or the package path for package managers. */
  slug: string | null;
  /** Canonical URL, normalised (no trailing slash, no `.git`). */
  url: string;
  /** Human label, e.g. "GitHub". */
  label: string;
}

const FORGES: ReadonlySet<SourceId> = new Set<SourceId>(["github", "gitlab", "codeberg", "forgejo"]);

const SCHEME = /^([a-z][a-z0-9+.\-]*):/i;

/**
 * Parse a repository / package URL into a normalised source reference.
 *
 * Accepts bare `owner/name`, full `https://` URLs, `git@host:owner/name.git`,
 * and known package-manager pages. Returns `null` when the input cannot be
 * understood — the caller decides what to tell the user.
 */
export function parseSourceUrl(input: string): ParsedSource | null {
  const raw = input.trim();
  if (!raw) return null;

  // Anything already carrying a scheme must be http(s). This keeps
  // `javascript:`, `file:` and `data:` URLs out of every downstream path.
  const scheme = SCHEME.exec(raw);
  if (scheme && !/^https?$/i.test(scheme[1]!)) return null;

  // Bare `owner/name` — assume GitHub, the overwhelmingly common case.
  const bare = /^([A-Za-z0-9_.\-]+)\/([A-Za-z0-9_.\-]+)$/.exec(raw);
  if (bare) {
    return {
      source: "github",
      slug: `${bare[1]}/${bare[2]}`,
      url: `https://github.com/${bare[1]}/${bare[2]}`,
      label: SOURCE_LABELS.github,
    };
  }

  // scp-style `git@host:owner/name.git`
  const scp = /^git@([^:/]+):(.+?)(?:\.git)?$/.exec(raw);
  if (scp) {
    const host = scp[1]!.toLowerCase();
    const path = scp[2]!.replace(/^\/+|\/+$/g, "").replace(/\.git$/, "");
    const source = sourceForHost(host);
    return {
      source,
      slug: FORGES.has(source) ? normaliseSlug(path) : path || null,
      url: `https://${host}/${path}`,
      label: SOURCE_LABELS[source],
    };
  }

  // Full URL (add a scheme when the user omitted one).
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const path = parsed.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/, "");
  const source = sourceForHost(host);

  return {
    source,
    slug: FORGES.has(source) ? normaliseSlug(path) : path || null,
    url: `https://${host}/${path}`,
    label: SOURCE_LABELS[source],
  };
}

function normaliseSlug(path: string): string | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return `${parts[0]}/${parts[1]}`;
}

/** Best-effort source id for an app already in the catalog. */
export function sourceFromRepository(repository: string | null | undefined): SourceId {
  if (!repository) return "other";
  const parsed = parseSourceUrl(repository);
  return parsed?.source ?? "other";
}
