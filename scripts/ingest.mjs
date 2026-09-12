#!/usr/bin/env node
/**
 * OmniStore ingest — rebuilds data/omnisource-feed.json from live upstreams.
 *
 * Reads data/sources.json, resolves every repository through the GitHub API,
 * normalises platforms / architectures / package types from the *real* release
 * assets each project publishes, derives trust / quality / popularity scores
 * from public signals, and writes a feed that OmniStore serves directly.
 *
 *   npm run ingest                       # full rebuild
 *   npm run ingest -- --only=owner/repo  # one source
 *   npm run ingest -- --limit=40         # first N sources (smoke test)
 *   npm run ingest -- --out=tmp.json     # write elsewhere
 *   npm run ingest -- --force            # write even if some sources failed
 *
 * A partial run (expired credentials, network failure, many 404s) refuses to
 * overwrite an existing good feed unless --force is passed, so a flaky network
 * can never silently shrink the catalog.
 *
 * Requires Node 22.12+ (native fetch, AbortSignal.timeout).
 * Auth is optional: GITHUB_TOKEN, GH_TOKEN or `gh auth login`. Unauthenticated
 * runs are rate-limited to 60 req/h — use a token for a full rebuild.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const ONLY = opt("only");
const LIMIT = opt("limit") ? Number.parseInt(opt("limit"), 10) : null;
const OUT = opt("out") ? path.resolve(ROOT, opt("out")) : path.join(ROOT, "data/omnisource-feed.json");
const FORCE = flag("force");
const CONCURRENCY = Number.parseInt(opt("concurrency") ?? "8", 10);

const FEED_PATH = path.join(ROOT, "data/omnisource-feed.json");
const SOURCES_PATH = path.join(ROOT, "data/sources.json");

const GH = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

/** Failures that must not shrink an existing feed. */
const HARD_LIMIT = 0.35; // >35% of sources unavailable ⇒ treat the run as partial

/* ------------------------------------------------------------------ */
/* Fetch layer — timeout, backoff, honest rate-limit handling          */
/* ------------------------------------------------------------------ */

let requests = 0;
let rateLimited = 0;

async function gh(pathname, { attempt = 0 } = {}) {
  requests += 1;
  let response;
  try {
    response = await fetch(`${GH}${pathname}`, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "OmniStore-ingest/1.0",
        ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
      },
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
  } catch (error) {
    if (attempt < 3) {
      await sleep(600 * 2 ** attempt);
      return gh(pathname, { attempt: attempt + 1 });
    }
    return { status: 0, body: null, error: error.message };
  }

  // 204 No Content (e.g. a repo with no releases) — a legitimate empty result.
  if (response.status === 204) return { status: 204, body: null, error: null };

  if (response.status === 403 || response.status === 429) {
    rateLimited += 1;
    const retryAfter = Number(response.headers.get("retry-after"));
    const reset = Number(response.headers.get("x-ratelimit-reset"));
    const waitMs = Number.isFinite(retryAfter)
      ? retryAfter * 1000
      : Number.isFinite(reset) && reset * 1000 > Date.now()
        ? Math.min(120_000, reset * 1000 - Date.now())
        : 5000 * (attempt + 1);
    if (attempt < 4) {
      process.stdout.write(`\n  … rate limited, waiting ${Math.round(waitMs / 1000)}s\n`);
      await sleep(waitMs);
      return gh(pathname, { attempt: attempt + 1 });
    }
    return { status: response.status, body: null, error: "rate limited" };
  }

  if (response.status >= 500 && attempt < 3) {
    await sleep(800 * 2 ** attempt);
    return gh(pathname, { attempt: attempt + 1 });
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body, error: null };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/* Normalisation — platforms, architectures, package types             */
/* ------------------------------------------------------------------ */

/** Map a release asset filename onto the OmniStore platform taxonomy. */
function detectAsset(name, url) {
  const n = name.toLowerCase();
  const ext = (n.match(/\.([a-z0-9]+)(?:\.(gz|xz|zst))?$/) || [])[1] ?? "";

  let platform = null;
  let packageType = ext;

  if (ext === "apk" || ext === "aab") platform = "android";
  else if (ext === "ipa") platform = "ios";
  else if (ext === "dmg") {
    platform = "macos";
    packageType = "dmg";
  } else if (ext === "pkg") platform = "macos";
  else if (["exe", "msi", "msix", "appx", "appxbundle"].includes(ext)) platform = "windows";
  else if (ext === "appimage") {
    platform = "linux";
    packageType = "appimage";
  } else if (ext === "deb") platform = "linux";
  else if (ext === "rpm") platform = "linux";
  else if (ext === "flatpakref" || n.includes("flatpak")) platform = "linux";
  else if (ext === "snap") platform = "linux";
  else if (ext === "appref-ms" || ext === "nupkg") platform = "windows";
  else if (["zip", "tar", "gz", "xz", "zst", "7z"].includes(ext)) {
    // Containers are ambiguous — decide on filename hints, else fall back to
    // the platform named anywhere in the asset name.
    if (/(win|windows|win64|win32|x86_64-pc-windows)/.test(n)) platform = "windows";
    else if (/(mac|macos|darwin|osx|universal)/.test(n)) platform = "macos";
    else if (/(linux|ubuntu|debian|fedora|arch|appimage|\.deb|\.rpm|gnu)/.test(n)) platform = "linux";
    else if (/(android|arm64-v8a|armeabi)/.test(n)) platform = "android";
    else return null; // unknown container ⇒ not offered as an install target
    packageType = ext;
  } else {
    return null; // .sha256, .sig, .asc, source tarballs, checksums — not installers
  }

  // Skip source archives and signature/checksum sidecars that slipped through.
  if (/^(source-code|.*-src\.|.*-source\.)/.test(n)) return null;
  if (/\.(sha256|sha512|sig|asc|md5)$/.test(n)) return null;

  const architecture = detectArchitecture(n);
  return { platform, architecture, packageType };
}

function detectArchitecture(n) {
  if (/(universal2|universal)/.test(n)) return "universal";
  if (/(aarch64|arm64|armv8|arm64e)/.test(n)) return "arm64";
  if (/(armv7|armhf|arm32|armeabi)/.test(n)) return "armv7";
  if (/(x86_64|amd64|x64|win64)/.test(n)) return "x86_64";
  if (/(i[36]86|x86|win32|ia32|32-?bit)/.test(n)) return "x86";
  return "any";
}

/** Platforms a project supports, inferred from assets plus repo hints. */
function inferPlatforms(assets, repo) {
  const set = new Set(assets.map((a) => a.platform));
  const blob = `${repo.name} ${repo.description ?? ""} ${repo.topics?.join(" ") ?? ""}`.toLowerCase();
  // Topic hints only *add* platforms the project documents; assets win.
  if (set.size === 0) {
    if (/\b(android|fdroid)\b/.test(blob)) set.add("android");
    if (/\b(ios|ipados)\b/.test(blob)) set.add("ios");
    if (/\b(windows|win32|\.exe)\b/.test(blob)) set.add("windows");
    if (/\b(macos|darwin|homebrew)\b/.test(blob)) set.add("macos");
    if (/\b(linux|appimage|flatpak|snap|\.deb)\b/.test(blob)) set.add("linux");
  }
  return [...set].sort();
}

/* ------------------------------------------------------------------ */
/* Scoring — every number traces back to a public signal               */
/* ------------------------------------------------------------------ */

const LICENSE_SPDX = {
  "Apache License 2.0": "Apache-2.0",
  "MIT License": "MIT",
  "GNU General Public License v3.0": "GPL-3.0",
  "GNU General Public License v2.0": "GPL-2.0",
  "GNU Affero General Public License v3.0": "AGPL-3.0",
  "GNU Lesser General Public License v3.0": "LGPL-3.0",
  "GNU Lesser General Public License v2.1": "LGPL-2.1",
  "Mozilla Public License 2.0": "MPL-2.0",
  "BSD 3-Clause \"New\" or \"Revised\" License": "BSD-3-Clause",
  "BSD 2-Clause \"Simplified\" License": "BSD-2-Clause",
  "The Unlicense": "Unlicense",
  "Boost Software License 1.0": "BSL-1.0",
  "Eclipse Public License 2.0": "EPL-2.0",
  "European Union Public License 1.2": "EUPL-1.2",
  "Creative Commons Zero v1.0 Universal": "CC0-1.0",
  "Other": "Other",
};

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/** Trust: is this a release you can rely on? Public signals only. */
function trustScore(repo, releases, assets) {
  let score = 40;
  const factors = {};

  // An OSI-recognised licence is the baseline for "open source".
  if (repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION") {
    score += 18;
    factors.oss_license = 1;
  } else {
    factors.oss_license = 0;
  }

  // Archived / disabled repos are frozen: they will never be patched.
  if (repo.archived || repo.disabled) {
    score -= 25;
    factors.active_repository = 0;
  } else {
    factors.active_repository = 1;
  }

  // Validated installers mean users do not have to build from source.
  const assetScore = assets.length === 0 ? 0 : clamp(assets.length / 8, 0, 1);
  score += assetScore * 16;
  factors.validated_assets = Number(assetScore.toFixed(2));

  // Release cadence over the last 18 months.
  const window = Date.now() - 548 * 86_400_000;
  const recent = releases.filter((r) => r.published_at && Date.parse(r.published_at) > window);
  const cadence = clamp(recent.length / 6, 0, 1);
  score += cadence * 14;
  factors.recent_releases = Number(cadence.toFixed(2));

  // Community maintenance: contributors and forks.
  const community = clamp(Math.log10(Math.max(1, repo.forks_count)) / 3.5, 0, 1);
  score += community * 8;
  factors.established_contributors = Number(community.toFixed(2));

  // Pushed within the last 12 months.
  const pushedDays = repo.pushed_at ? (Date.now() - Date.parse(repo.pushed_at)) / 86_400_000 : 9999;
  const freshness = clamp(1 - pushedDays / 365, 0, 1);
  score += freshness * 6;
  factors.recent_activity = Number(freshness.toFixed(2));

  return { score: Math.round(clamp(score, 0, 100)), factors };
}

/** Quality: how well maintained and documented is the project? */
function qualityScore(repo, releases) {
  let score = 35;

  if (repo.description && repo.description.trim().length > 12) score += 10;
  if (repo.homepage && /^https?:\/\//.test(repo.homepage)) score += 8;
  if ((repo.topics ?? []).length > 0) score += 5;
  if (repo.has_wiki || repo.has_pages) score += 4;
  if (repo.open_issues_count >= 0) {
    // A very high issue-to-star ratio usually means triage has stalled.
    const ratio = repo.stargazers_count > 0 ? repo.open_issues_count / repo.stargazers_count : 1;
    score += clamp((1 - ratio) * 12, 0, 12);
  }
  if (releases.length > 0 && releases[0]?.body) score += 8;
  if (!repo.archived && !repo.disabled) score += 8;
  score += clamp(Math.log10(Math.max(1, repo.stargazers_count)) * 2.5, 0, 12);

  return Math.round(clamp(score, 0, 100));
}

/** Popularity: log-scaled stars + forks, normalised to 0–100. */
function popularityScore(repo) {
  const signal = Math.log10(Math.max(1, repo.stargazers_count)) * 1.6 + Math.log10(Math.max(1, repo.forks_count)) * 0.9;
  return Math.round(clamp(signal * 12, 1, 100));
}

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** GitHub's release bodies are noisy — trim to plain readable prose. */
function cleanNotes(body) {
  if (!body) return null;
  const text = String(body)
    .replace(/<!--[\s\S]*?-->/g, "") // HTML comments
    .replace(/<[^>]+>/g, "") // tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → label
    .replace(/^\s*#{1,6}\s*/gm, "") // headings
    .replace(/[*_`>]/g, "") // emphasis / quotes
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return null;
  return text.length > 2400 ? `${text.slice(0, 2400).trimEnd()}…` : text;
}

/** Split a README-less description into a short blurb + long description. */
function summarise(repo) {
  const description = (repo.description ?? "").trim();
  const topics = (repo.topics ?? []).slice(0, 12);
  if (!description) return { short: null, long: null };
  const short = description.length > 160 ? `${description.slice(0, 157).trimEnd()}…` : description;
  const longParts = [description];
  if (topics.length > 0) {
    longParts.push(`Topics: ${topics.join(", ")}.`);
  }
  const lang = repo.language ? `Primary language: ${repo.language}.` : null;
  if (lang) longParts.push(lang);
  const stars = repo.stargazers_count ?? 0;
  const forks = repo.forks_count ?? 0;
  if (stars > 0) {
    longParts.push(
      `${stars.toLocaleString("en-US")} stars and ${forks.toLocaleString("en-US")} forks on ${repo.html_url?.startsWith("https://gitlab") ? "GitLab" : "GitHub"}.`,
    );
  }
  return { short, long: longParts.join(" ") };
}

/* ------------------------------------------------------------------ */
/* Presentation — display names + version normalisation                */
/* ------------------------------------------------------------------ */

/**
 * Storefront display names, keyed by lowercased `owner/repo`.
 *
 * A repository name is an identifier, not a product name: `bitwarden/clients`
 * is "Bitwarden", `home-assistant/core` is "Home Assistant", `vuejs/core` is
 * "Vue". The catalog is a storefront, so it shows the name the project calls
 * itself. Entries are hand-curated; anything unlisted falls back to the
 * repository name untouched — we never invent a name.
 */
const DISPLAY_NAMES = {
  "actualbudget/actual": "Actual Budget",
  "adguardteam/adguardhome": "AdGuard Home",
  "toeverything/affine": "AFFiNE",
  "filosottile/age": "age",
  "alacritty/alacritty": "Alacritty",
  "ankitects/anki": "Anki",
  "ant-design/ant-design": "Ant Design",
  "antennapod/antennapod": "AntennaPod",
  "standardnotes/app": "Standard Notes",
  "appflowy-io/appflowy": "AppFlowy",
  "appimage/appimagekit": "AppImageKit",
  "archivebox/archivebox": "ArchiveBox",
  "ardour/ardour": "Ardour",
  "arduino/arduino": "Arduino IDE",
  "arduino/arduino-ide": "Arduino IDE",
  "argoproj/argo-cd": "Argo CD",
  "aria2/aria2": "aria2",
  "aseprite/aseprite": "Aseprite",
  "atom/atom": "Atom",
  "audacity/audacity": "Audacity",
  "autohotkey/autohotkey": "AutoHotkey",
  "bambulab/bambustudio": "Bambu Studio",
  "sharkdp/bat": "bat",
  "beekeeper-studio/beekeeper-studio": "Beekeeper Studio",
  "bevyengine/bevy": "Bevy",
  "bitcoin/bitcoin": "Bitcoin Core",
  "blender/blender": "Blender",
  "twbs/bootstrap": "Bootstrap",
  "clementtsang/bottom": "bottom",
  "erincatto/box2d": "Box2D",
  "aristocratos/bpytop": "bpytop",
  "brave/brave-browser": "Brave",
  "homebrew/brew": "Homebrew",
  "usebruno/bruno": "Bruno",
  "bulletphysics/bullet3": "Bullet Physics",
  "oven-sh/bun": "Bun",
  "caddyserver/caddy": "Caddy",
  "kovidgoyal/calibre": "calibre",
  "chakra-ui/chakra-ui": "Chakra UI",
  "chocolatey/choco": "Chocolatey",
  "chroma-core/chroma": "Chroma",
  "clementine-player/clementine": "Clementine",
  "httpie/cli": "HTTPie",
  "snyk/cli": "Snyk CLI",
  "keybase/client": "Keybase",
  "bitwarden/clients": "Bitwarden",
  "comfy-org/comfyui": "ComfyUI",
  "swordfish90/cool-retro-term": "cool-retro-term",
  "hluk/copyq": "CopyQ",
  "libreoffice/core": "LibreOffice",
  "home-assistant/core": "Home Assistant",
  "opnsense/core": "OPNsense",
  "vuejs/core": "Vue",
  "owncloud/core": "ownCloud Server",
  "sigstore/cosign": "cosign",
  "cryptomator/cryptomator": "Cryptomator",
  "crystal-lang/crystal": "Crystal",
  "ultimaker/cura": "UltiMaker Cura",
  "cypress-io/cypress": "Cypress",
  "darktable-org/darktable": "darktable",
  "dbeaver/dbeaver": "DBeaver",
  "defold/defold": "Defold",
  "denoland/deno": "Deno",
  "desktop/desktop": "GitHub Desktop",
  "zen-browser/desktop": "Zen Browser",
  "nextcloud/desktop": "Nextcloud Desktop",
  "onlyoffice/desktopeditors": "ONLYOFFICE Desktop Editors",
  "docmost/docmost": "Docmost",
  "dogecoin/dogecoin": "Dogecoin Core",
  "jgraph/drawio-desktop": "draw.io",
  "duckdb/duckdb": "DuckDB",
  "elastic/elasticsearch": "Elasticsearch",
  "electron/electron": "Electron",
  "elixir-lang/elixir": "Elixir",
  "endless-sky/endless-sky": "Endless Sky",
  "ente-io/ente": "Ente Photos",
  "frappe/erpnext": "ERPNext",
  "espressif/esp-idf": "ESP-IDF",
  "balena-io/etcher": "balenaEtcher",
  "excalidraw/excalidraw": "Excalidraw",
  "fail2ban/fail2ban": "Fail2Ban",
  "rem0o/fancontrol.releases": "Fan Control",
  "systran/faster-whisper": "faster-whisper",
  "fastfetch-cli/fastfetch": "fastfetch",
  "sharkdp/fd": "fd",
  "ffmpeg/ffmpeg": "FFmpeg",
  "filebrowser/filebrowser": "File Browser",
  "files-community/files": "Files",
  "firefly-iii/firefly-iii": "Firefly III",
  "mozilla-mobile/firefox-ios": "Firefox for iOS",
  "fish-shell/fish-shell": "fish",
  "flameshot-org/flameshot": "Flameshot",
  "flatpak/flatpak": "Flatpak",
  "flutter/flutter": "Flutter",
  "fontforge/fontforge": "FontForge",
  "freecad/freecad": "FreeCAD",
  "freetubeapp/freetube": "FreeTube",
  "freshrss/freshrss": "FreshRSS",
  "fritzing/fritzing-app": "Fritzing",
  "fyroxengine/fyrox": "Fyrox",
  "junegunn/fzf": "fzf",
  "ghostfolio/ghostfolio": "Ghostfolio",
  "git/git": "Git",
  "gitextensions/gitextensions": "Git Extensions",
  "gitleaks/gitleaks": "Gitleaks",
  "gleam-lang/gleam": "Gleam",
  "glfw/glfw": "GLFW",
  "gnucash/gnucash": "GnuCash",
  "gnuradio/gnuradio": "GNU Radio",
  "golang/go": "Go",
  "godotengine/godot": "Godot",
  "grafana/grafana": "Grafana",
  "greenshot/greenshot": "Greenshot",
  "anchore/grype": "Grype",
  "handbrake/handbrake": "HandBrake",
  "hashcat/hashcat": "hashcat",
  "htop-dev/htop": "htop",
  "hydrogen-music/hydrogen": "Hydrogen",
  "immich-app/immich": "Immich",
  "inkscape/inkscape": "Inkscape",
  "insomnia/insomnia": "Insomnia",
  "iv-org/invidious": "Invidious",
  "jellyfin/jellyfin": "Jellyfin",
  "joplinapp/joplin": "Joplin",
  "laurent22/joplin": "Joplin",
  "jupyterlab/jupyterlab-desktop": "JupyterLab Desktop",
  "kiwix/kiwix-desktop": "Kiwix",
  "krita/krita": "Krita",
  "kde/krita": "Krita",
  "lapce/lapce": "Lapce",
  "libresprite/libresprite": "LibreSprite",
  "localsend/localsend": "LocalSend",
  "logseq/logseq": "Logseq",
  "lmms/lmms": "LMMS",
  "lucasg/dependencies": "Dependencies",
  "luanti-org/luanti": "Luanti",
  "marktext/marktext": "MarkText",
  "mattermost/mattermost": "Mattermost",
  "maybe-finance/maybe": "Maybe",
  "meilisearch/meilisearch": "Meilisearch",
  "metabase/metabase": "Metabase",
  "microsoft/powertoys": "PowerToys",
  "microsoft/playwright": "Playwright",
  "microsoft/terminal": "Windows Terminal",
  "microsoft/winget-cli": "winget",
  "milvus-io/milvus": "Milvus",
  "miniflux/v2": "Miniflux",
  "moneymanagerex/moneymanagerex": "Money Manager Ex",
  "monero-project/monero": "Monero",
  "mpv-player/mpv": "mpv",
  "musescore/musescore": "MuseScore",
  "mrousavy/react-native-vision-camera": "Vision Camera",
  "mui/material-ui": "MUI",
  "n8n-io/n8n": "n8n",
  "nativefier/nativefier": "Nativefier",
  "navidrome/navidrome": "Navidrome",
  "neovim/neovim": "Neovim",
  "netdata/netdata": "Netdata",
  "nextcloud/server": "Nextcloud Server",
  "nocodb/nocodb": "NocoDB",
  "notepad-plus-plus/notepad-plus-plus": "Notepad++",
  "nushell/nushell": "Nushell",
  "obsproject/obs-studio": "OBS Studio",
  "octoprint/octoprint": "OctoPrint",
  "official-stockfish/stockfish": "Stockfish",
  "ollama/ollama": "Ollama",
  "open-webui/open-webui": "Open WebUI",
  "opencpn/opencpn": "OpenCPN",
  "opensearch-project/opensearch": "OpenSearch",
  "openstreetmap/openstreetmap-website": "OpenStreetMap",
  "openttd/openttd": "OpenTTD",
  "opentofu/opentofu": "OpenTofu",
  "organicmaps/organicmaps": "Organic Maps",
  "osmandapp/osmand": "OsmAnd",
  "outline/outline": "Outline",
  "pbatard/rufus": "Rufus",
  "pdfarranger/pdfarranger": "PDF Arranger",
  "penpot/penpot": "Penpot",
  "peazip/peazip": "PeaZip",
  "pgadmin-org/pgadmin4": "pgAdmin",
  "pi-hole/pi-hole": "Pi-hole",
  "platformio/platformio-core": "PlatformIO Core",
  "portainer/portainer": "Portainer",
  "prusa3d/prusaslicer": "PrusaSlicer",
  "pulsar-edit/pulsar": "Pulsar",
  "qbittorrent/qbittorrent": "qBittorrent",
  "qdrant/qdrant": "Qdrant",
  "qgis/qgis": "QGIS",
  "quodlibet/quodlibet": "Quod Libet",
  "raspberrypi/rpi-imager": "Raspberry Pi Imager",
  "raysan5/raylib": "raylib",
  "redis/redis": "Redis",
  "redlib-org/redlib": "Redlib",
  "rocketchat/rocket.chat": "Rocket.Chat",
  "rust-lang/rust-analyzer": "rust-analyzer",
  "rustdesk/rustdesk": "RustDesk",
  "sailfish-os/sailfish-browser": "Sailfish Browser",
  "sagemath/sage": "SageMath",
  "scoopinstaller/scoop": "Scoop",
  "scribusproject/scribus": "Scribus",
  "searxng/searxng": "SearXNG",
  "seleniumhq/selenium": "Selenium",
  "session-oss/session-desktop": "Session",
  "sharex/sharex": "ShareX",
  "shotcut/shotcut": "Shotcut",
  "signalapp/signal-desktop": "Signal",
  "simplex-chat/simplex-chat": "SimpleX Chat",
  "siyuan-note/siyuan": "SiYuan",
  "softferver/orcaslicer": "OrcaSlicer",
  "softfever/orcaslicer": "OrcaSlicer",
  "sparrowwallet/sparrow": "Sparrow",
  "spyder-ide/spyder": "Spyder",
  "sqlite/sqlite": "SQLite",
  "stellarium/stellarium": "Stellarium",
  "stirling-tools/stirling-pdf": "Stirling-PDF",
  "strawberrymusicplayer/strawberry": "Strawberry",
  "subtitleedit/subtitleedit": "Subtitle Edit",
  "supertux/supertux": "SuperTux",
  "supertuxkart/stk-code": "SuperTuxKart",
  "syncthing/syncthing": "Syncthing",
  "tailscale/tailscale": "Tailscale",
  "tauri-apps/tauri": "Tauri",
  "telegramdesktop/tdesktop": "Telegram Desktop",
  "tenacityteam/tenacity": "Tenacity",
  "textmate/textmate": "TextMate",
  "thorium-browser/thorium": "Thorium",
  "tmux/tmux": "tmux",
  "traefik/traefik": "Traefik",
  "transmission/transmission": "Transmission",
  "triliumnext/notes": "TriliumNext Notes",
  "triliumnext/trilium": "TriliumNext Trilium",
  "tw93/pake": "Pake",
  "typesense/typesense": "Typesense",
  "typora/typora": "Typora",
  "ungoogled-software/ungoogled-chromium": "Ungoogled Chromium",
  "utmapp/utm": "UTM",
  "veloren/veloren": "Veloren",
  "veracrypt/veracrypt": "VeraCrypt",
  "vercel/next.js": "Next.js",
  "vitejs/vite": "Vite",
  "vitest-dev/vitest": "Vitest",
  "vscodium/vscodium": "VSCodium",
  "wallabag/wallabag": "wallabag",
  "warzone2100/warzone2100": "Warzone 2100",
  "wazuh/wazuh": "Wazuh",
  "wez/wezterm": "WezTerm",
  "wireshark/wireshark": "Wireshark",
  "xournalpp/xournalpp": "Xournal++",
  "yt-dlp/yt-dlp": "yt-dlp",
  "zadam/trilium": "Trilium Notes",
  "zed-industries/zed": "Zed",
  "zotero/zotero": "Zotero",
  "zulip/zulip": "Zulip",
};

/** Second curation pass — remaining storefront names. */
Object.assign(DISPLAY_NAMES, {
  "keepassxreboot/keepassxc": "KeePassXC",
  "keepassxreboot/keepassxc-browser": "KeePassXC Browser",
  "kde/kdenlive": "Kdenlive",
  "keeweb/keeweb": "KeeWeb",
  "keeweb/keeweb-connect": "KeeWeb Connect",
  "klipper3d/klipper": "Klipper",
  "koel/koel": "Koel",
  "acly/krita-ai-diffusion": "Krita AI Diffusion",
  "kubernetes/kubernetes": "Kubernetes",
  "getlantern/lantern": "Lantern",
  "libgdx/libgdx": "libGDX",
  "lichess-org/lila": "Lichess",
  "linkwarden/linkwarden": "Linkwarden",
  "love2d/love": "LÖVE",
  "macvim-dev/macvim": "MacVim",
  "matplotlib/matplotlib": "Matplotlib",
  "dotnet/maui": ".NET MAUI",
  "dotnet/runtime": ".NET Runtime",
  "usememos/memos": "Memos",
  "micropython/micropython": "MicroPython",
  "neutralinojs/neutralinojs": "Neutralino",
  "jupyter/notebook": "Jupyter Notebook",
  "ohmyzsh/ohmyzsh": "Oh My Zsh",
  "olive-editor/olive": "Olive Video Editor",
  "openhardwaremonitor/openhardwaremonitor": "Open Hardware Monitor",
  "openmw/openmw": "OpenMW",
  "openscad/openscad": "OpenSCAD",
  "openvpn/openvpn": "OpenVPN",
  "ossec/ossec-hids": "OSSEC",
  "pfsense/pfsense": "pfSense",
  "raspberrypi/pico-sdk": "Pico SDK",
  "piskelapp/piskel": "Piskel",
  "cocos/cocos-engine": "Cocos Engine",
  "cocos2d/cocos2d-x": "Cocos2d-x",
  "ente/ente": "Ente Photos",
  "ente-io/ente": "Ente Photos",
  "fastfetch-cli/fastfetch": "Fastfetch",
  "helix-editor/helix": "Helix",
  "helm/helm": "Helm",
  "hoppscotch/hoppscotch": "Hoppscotch",
  "angryip/ipscan": "Angry IP Scanner",
  "janhq/jan": "Jan",
  "jestjs/jest": "Jest",
  "openwall/john": "John the Ripper",
  "julialang/julia": "Julia",
  "karakeep-app/karakeep": "Karakeep",
  "assimp/assimp": "Assimp",
  "primefaces/primevue": "PrimeVue",
  "prometheus/prometheus": "Prometheus",
  "qemu/qemu": "QEMU",
  "rancher/rancher": "Rancher",
  "dimforge/rapier": "Rapier",
  "margelo/react-native-vision-camera": "Vision Camera",
  "burntsushi/ripgrep": "ripgrep",
  "roc-lang/roc": "Roc",
  "rss-bridge/rss-bridge": "RSS-Bridge",
  "rstudio/rstudio": "RStudio",
  "astral-sh/ruff": "Ruff",
  "ossf/scorecard": "OpenSSF Scorecard",
  "scratchfoundation/scratch-gui": "Scratch",
  "shadowsocks/shadowsocks-windows": "Shadowsocks",
  "sagernet/sing-box": "sing-box",
  "valeriansaliou/sonic": "Sonic",
  "getsops/sops": "sops",
  "automatic1111/stable-diffusion-webui": "Stable Diffusion WebUI",
  "starship/starship": "Starship",
  "storybookjs/storybook": "Storybook",
  "apache/superset": "Apache Superset",
  "sveltejs/svelte": "Svelte",
  "anchore/syft": "Syft",
  "element-hq/synapse": "Synapse",
  "matrix-org/synapse": "Synapse",
  "tailwindlabs/tailwindcss": "Tailwind CSS",
  "thunderbird/thunderbird-android": "Thunderbird for Android",
  "mapeditor/tiled": "Tiled",
  "aquasecurity/trivy": "Trivy",
  "trufflesecurity/trufflehog": "TruffleHog",
  "shadcn-ui/ui": "shadcn/ui",
  "getumbrel/umbrel": "Umbrel",
  "astral-sh/uv": "uv",
  "vlang/v": "V",
  "dani-garcia/vaultwarden": "Vaultwarden",
  "verilator/verilator": "Verilator",
  "wailsapp/wails": "Wails",
  "hacdias/webdav": "WebDAV",
  "wesnoth/wesnoth": "The Battle for Wesnoth",
  "tencent/weui": "WeUI",
  "wezterm/wezterm": "WezTerm",
  "openai/whisper": "Whisper",
  "yosyshq/yosys": "Yosys",
  "ytdl-org/youtube-dl": "youtube-dl",
  "zephyrproject-rtos/zephyr": "Zephyr RTOS",
  "ziglang/zig": "Zig",
  "geany/geany": "Geany",
  "gqrx-sdr/gqrx": "Gqrx",
  "nuttyartist/notes": "Notes",
  "surge-synthesizer/surge": "Surge XT",
  "godotengine/godot-cpp": "godot-cpp",
  "zdoom/gzdoom": "GZDoom",
  "kicad/kicad": "KiCad",
  "kicad/kicad-source-mirror": "KiCad",
  "libreddit/libreddit": "Libreddit",
  "subsurface/subsurface": "Subsurface",
  "0ad/0ad": "0 A.D.",
  "deepnight/ldtk": "LDtk",
  "teeworlds/teeworlds": "Teeworlds",
  "ghdl/ghdl": "GHDL",
  "gns3/gns3-gui": "GNS3",
  "haskell/haskell-language-server": "Haskell Language Server",
  "neoapplications/neo-store": "Neo Store",
  "openfoam/openfoam-dev": "OpenFOAM",
  "mainsail-crew/mainsail": "Mainsail",
  "posit-dev/positron": "Positron",
  "canonical/snapd": "snapd",
  "snapcore/snapd": "snapd",
  "fluidd-core/fluidd": "Fluidd",
  "geogebra/geogebra": "GeoGebra",
  "ksnip/ksnip": "Ksnip",
  "padloc/padloc": "Padloc",
  "dhewm/dhewm3": "dhewm3",
  "f-droid/fdroidclient": "F-Droid",
  "nomacs/nomacs": "nomacs",
  "notepadqq/notepadqq": "Notepadqq",
  "elmercsc/elmerfem": "Elmer",
  "kiwix/kiwix-android": "Kiwix for Android",
  "zrythm/zrythm": "Zrythm",
  "element-hq/element-desktop": "Element",
  "khronosgroup/gltf-blender-io": "glTF Blender I/O",
  "openhab/openhab-core": "openHAB",
  "khronosgroup/ktx-software": "KTX-Software",
  "unknown-horizons/unknown-horizons": "Unknown Horizons",
  "ddnet/ddnet": "DDNet",
  "fossas/fossa-cli": "FOSSA CLI",
  "gpodder/gpodder": "gPodder",
  "gpodder/gpodder-core": "gPodder Core",
  "mbusb/multibootusb": "MultiBootUSB",
  "opensim-org/opensim-core": "OpenSim",
  "opensim-org/opensim-gui": "OpenSim",
  "openclarity/openclarity": "OpenClarity",
  "qucs/qucs": "Qucs",
  "ra3xdh/qucs_s": "Qucs-S",
  "schismtracker/schismtracker": "Schism Tracker",
  "wireapp/wire-desktop": "Wire",
  "linagora/cozy-stack": "Cozy",
  "freeorion/freeorion": "FreeOrion",
  "wireguard/wireguard-tools": "WireGuard Tools",
  "flightgear/flightgear": "FlightGear",
  "ocaml/ocaml-lsp": "OCaml LSP",
  "pychess/pychess": "PyChess",
  "gottcode/focuswriter": "FocusWriter",
  "theupdateframework/go-tuf": "go-tuf",
  "simplex-chat/simplexmq": "SimpleX MQ",
  "fonttools/fontbakery": "FontBakery",
  "openmpt/openmpt": "OpenMPT",
  "yosyshq/apicula": "Project Apicula",
  "briar/briar": "Briar",
  "briar/briar-desktop": "Briar Desktop",
  "processing/processing4": "Processing",
  "redeclipse/base": "Red Eclipse",
  "getumbrel/umbrel-os": "umbrelOS",
  "xonotic/xonotic": "Xonotic",
  "ngspice/ngspice": "ngspice",
  "yubico/yubikey-manager-qt": "YubiKey Manager",
  "kde/kleopatra": "Kleopatra",
  "gnome/gthumb": "gThumb",
  "nitrokey/nitrokey-app2": "Nitrokey App",
  "subdownloader/subdownloader": "SubDownloader",
  "gnome/gnome-chess": "GNOME Chess",
  "kde/kpat": "KPatience",
  "gnome/gnome-sudoku": "GNOME Sudoku",
  "gnome/gnome-mahjongg": "GNOME Mahjongg",
  "gottcode/tanglet": "Tanglet",
  "gottcode/connectagram": "Connectagram",
  "manuskript/manuskript": "Manuskript",
  "obtainium/obtainium": "Obtainium",
  "ghostwriter/ghostwriter": "ghostwriter",
  "icestorm/icestorm": "Project IceStorm",
});

/**
 * Resolve a storefront display name.
 *
 * Lookup tries the curated source entry first, then the effective repository —
 * they can differ because GitHub redirects renamed repositories
 * (`docker/desktop` now resolves to `docker/desktop-feedback`).
 * Anything unlisted keeps the upstream repository name exactly as the project
 * spells it, preserving `qBittorrent`, `HandBrake`, `llama.cpp`. We never
 * invent a name.
 */
function displayName(source, repo) {
  if (source.name) return source.name;
  return (
    DISPLAY_NAMES[source.repo.toLowerCase()] ??
    DISPLAY_NAMES[String(repo.full_name).toLowerCase()] ??
    repo.name
  );
}

/**
 * Normalise an upstream tag into a version number.
 *
 * The UI renders `v{version}`, so a tag like `v1.97.29` would display as
 * `vv1.97.29`. Tags carry every convention upstream projects use — a `v`
 * prefix, `release-`, scoped package names, product-name prefixes — so reduce
 * them to the version part. Tags with no recognisable version (`nightly`,
 * `continuous`) are preserved rather than mangled.
 */
function normaliseVersion(tag) {
  const raw = String(tag ?? "").trim();
  if (!raw) return raw;
  let value = raw;

  // `@scope/package@1.2.3` → `1.2.3`
  const scoped = value.match(/^@[^@/]+\/[^@]+@(.+)$/);
  if (scoped) value = scoped[1];

  // `release-1.37.0`, `rel-2.0`, `version-3` → the part after the prefix
  const prefixed = value.match(/^(?:release|rel|version|ver|v)-(.+)$/i);
  if (prefixed) value = prefixed[1];

  // A single leading `v` before a digit: `v1.97.29` → `1.97.29`
  value = value.replace(/^v(?=\d)/i, "");

  // `ProductName-4.0.0` / `processing-1434-4.5.6` → the numeric version
  if (!/^\d/.test(value)) {
    const numeric = value.match(/(\d+(?:\.\d+)+[\w.+-]*)/);
    if (numeric) value = numeric[1];
  }

  return value.trim() || raw;
}

/* ------------------------------------------------------------------ */
/* Ingest one source                                                   */
/* ------------------------------------------------------------------ */

async function ingestOne(source) {
  const [owner, repoName] = source.repo.split("/");
  const repoRes = await gh(`/repos/${owner}/${repoName}`);

  if (repoRes.status === 404) return { ok: false, reason: "not_found", repo: source.repo };
  if (repoRes.status !== 200 || !repoRes.body) {
    return { ok: false, reason: `repo_status_${repoRes.status}`, repo: source.repo };
  }
  const repo = repoRes.body;
  if (repo.private || repo.fork) return { ok: false, reason: "not_public", repo: source.repo };

  const relRes = await gh(`/repos/${owner}/${repoName}/releases?per_page=6`);
  const rawReleases = Array.isArray(relRes.body) ? relRes.body : [];

  // Normalise releases: keep the ones that carry real installers.
  const releases = rawReleases
    .filter((r) => !r.draft)
    .slice(0, 5)
    .map((release) => {
      const assets = (release.assets ?? [])
        .map((asset) => {
          const detected = detectAsset(asset.name ?? "", asset.browser_download_url ?? "");
          if (!detected) return null;
          return {
            id: `${release.tag_name}-${asset.id}`.replace(/[^\w.-]+/g, "-").toLowerCase(),
            platform: detected.platform,
            architecture: detected.architecture,
            package_type: detected.packageType,
            version: normaliseVersion(release.tag_name),
            url: asset.browser_download_url,
            size_bytes: typeof asset.size === "number" ? asset.size : null,
            sha256: null,
            source: `${owner}/${repoName}_release`,
            // Every asset is reachable and served over https by GitHub; we mark
            // REVIEW_REQUIRED only when the size is unknown (truncated upload).
            status: asset.size > 0 ? "VALID" : "REVIEW_REQUIRED",
          };
        })
        .filter(Boolean);
      return {
        version: normaliseVersion(release.tag_name),
        released_at: release.published_at ?? release.created_at ?? null,
        notes: cleanNotes(release.body),
        assets,
        has_breaking_changes: /breaking\s*change/i.test(release.body ?? ""),
      };
    });

  const allAssets = releases.flatMap((r) => r.assets);
  const latest = releases[0] ?? null;
  const platforms = inferPlatforms(allAssets, repo);

  const slug = source.slug ?? slugify(repo.name);
  const developerSlug = slugify(owner);
  const developerName = repo.owner?.login ?? owner;
  const { short, long } = summarise(repo);
  const trust = trustScore(repo, rawReleases, allAssets);
  const quality = qualityScore(repo, rawReleases);
  const popularity = popularityScore(repo);

  const app = {
    id: slug,
    slug,
    name: displayName(source, repo),
    short_description: short,
    description: long,
    features: buildFeatures(repo, platforms, allAssets),
    developer: {
      id: developerSlug,
      slug: developerSlug,
      name: developerName,
      url: repo.owner?.html_url ?? null,
    },
    categories: [source.category, ...(source.extra_categories ?? [])].filter(Boolean),
    tags: [...new Set([...(source.tags ?? []), ...(repo.topics ?? []).slice(0, 8)])].slice(0, 14),
    platforms,
    license: repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION"
      ? repo.license.spdx_id
      : (repo.license ? LICENSE_SPDX[repo.license.name] ?? repo.license.name : null),
    homepage: /^https?:\/\//.test(repo.homepage ?? "") ? repo.homepage : null,
    repository: repo.html_url,
    documentation: repo.has_wiki ? `${repo.html_url}/wiki` : null,
    icon: repo.owner?.avatar_url ?? null,
    screenshots: [],
    scores: {
      trust: trust.score,
      quality,
      popularity,
      trust_factors: Object.entries(trust.factors)
        .filter(([, v]) => v >= 0.5)
        .map(([k]) => k),
      quality_factors: null,
    },
    latest_release: latest,
    releases,
    alternatives: [],
    similar: [],
    source_name: source.source ?? (repo.html_url.includes("gitlab") ? "GitLab" : "GitHub"),
    source_status: repo.archived ? "archived" : repo.disabled ? "disabled" : "active",
    updated_at: repo.pushed_at ?? null,
    created_at: repo.created_at ?? null,
    open_source: Boolean(repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION"),
    active_development:
      !repo.archived && !repo.disabled &&
      repo.pushed_at !== null &&
      (Date.now() - Date.parse(repo.pushed_at)) / 86_400_000 < 365,
    // Ingest-only signals, not part of the v1 wire contract. Kept so the feed
    // can be re-scored without another API round-trip.
    _signals: {
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      watchers: repo.subscribers_count ?? null,
      open_issues: repo.open_issues_count ?? 0,
      archived: Boolean(repo.archived),
      language: repo.language ?? null,
      full_name: repo.full_name,
    },
    _featured: Boolean(source.featured),
  };

  return { ok: true, app, repo: source.repo };
}

/** Feature bullets derived from real signals — never invented capability. */
function buildFeatures(repo, platforms, assets) {
  const out = [];
  if (repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION") {
    out.push(`Open source under ${repo.license.spdx_id}`);
  }
  if (platforms.length > 1) {
    out.push(`Runs on ${platforms.map((p) => PLATFORM_LABEL[p] ?? p).join(", ")}`);
  }
  const packageTypes = [...new Set(assets.map((a) => a.package_type))].slice(0, 5);
  if (packageTypes.length > 0) {
    out.push(`Installs as ${packageTypes.join(", ")}`);
  }
  if (repo.language) out.push(`Written in ${repo.language}`);
  if (repo.has_wiki) out.push("Project wiki available");
  if ((repo.topics ?? []).length > 0) out.push(`Tagged ${(repo.topics ?? []).slice(0, 4).join(", ")}`);
  return out.slice(0, 8);
}

const PLATFORM_LABEL = {
  ios: "iOS",
  ipados: "iPadOS",
  android: "Android",
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

/* ------------------------------------------------------------------ */
/* Taxonomy + collections                                              */
/* ------------------------------------------------------------------ */

const CATEGORY_META = {
  productivity: { name: "Productivity", icon: "CalendarCheck", description: "Notes, documents, calendars and workflow tools that keep work moving." },
  communication: { name: "Communication", icon: "MessageSquare", description: "Messaging, email and team chat with end-to-end encryption options." },
  media: { name: "Media", icon: "Play", description: "Players, editors, streaming servers and audio tools." },
  graphics: { name: "Graphics & Design", icon: "Palette", description: "Image editing, vector art, 3D modelling and design tools." },
  development: { name: "Developer Tools", icon: "Code", description: "Editors, terminals, runtimes, frameworks and DevOps utilities." },
  security: { name: "Security & Privacy", icon: "ShieldCheck", description: "Password managers, encryption, VPNs and vulnerability scanning." },
  utilities: { name: "Utilities", icon: "Wrench", description: "File managers, sync, screenshots, disk imaging and system helpers." },
  gaming: { name: "Games", icon: "Gamepad2", description: "Open-source games, engines and classic remakes." },
  science: { name: "Science & Engineering", icon: "FlaskConical", description: "CAD, simulation, electronics design, GIS and data science." },
  finance: { name: "Finance", icon: "Wallet", description: "Budgeting, accounting, portfolios and personal finance." },
  education: { name: "Education", icon: "GraduationCap", description: "Flashcards, offline libraries and learning tools." },
};

const PLATFORM_META = [
  { platform_type: "ios", name: "iOS", display_name: "iOS", icon: "Smartphone" },
  { platform_type: "ipados", name: "iPadOS", display_name: "iPadOS", icon: "Tablet" },
  { platform_type: "android", name: "Android", display_name: "Android", icon: "Smartphone" },
  { platform_type: "windows", name: "Windows", display_name: "Windows", icon: "Monitor" },
  { platform_type: "macos", name: "macOS", display_name: "macOS", icon: "Laptop" },
  { platform_type: "linux", name: "Linux", display_name: "Linux", icon: "Terminal" },
];

/**
 * Editorial collections. Membership is expressed as *rules* (category,
 * minimum trust, tag) rather than hardcoded id lists, so the sets stay correct
 * as the catalog is re-ingested. `picks` are optional ordered overrides.
 */
const COLLECTION_DEFS = [
  { slug: "featured", name: "Featured", description: "Hand-picked open-source apps that set the standard for their category.", rule: { featured: true }, limit: 18 },
  { slug: "editors-choice", name: "Editors' choice", description: "The highest-trust projects in the catalog, ranked by maintenance signals.", rule: { minTrust: 80, sort: "trust" }, limit: 12 },
  { slug: "privacy-essentials", name: "Privacy essentials", description: "Encryption, private messaging and tracker-blocking you can audit yourself.", rule: { categories: ["security"], tags: ["privacy", "encryption", "e2ee", "ad-blocking"] }, limit: 12 },
  { slug: "self-hosted", name: "Self-hosted favourites", description: "Run your own cloud, media server and automation stack on hardware you own.", rule: { tags: ["self-hosted", "server"] }, limit: 12 },
  { slug: "daily-drivers", name: "Daily drivers", description: "The apps people keep installed: browsers, launchers, notes and screenshots.", rule: { categories: ["productivity", "utilities"], sort: "popularity" }, limit: 12 },
  { slug: "for-developers", name: "For developers", description: "Editors, terminals, runtimes and debugging tools trusted by engineers.", rule: { categories: ["development"], sort: "popularity" }, limit: 12 },
  { slug: "creative-suite", name: "Open creative suite", description: "A full free pipeline for photo, vector, 3D, audio and video work.", rule: { categories: ["graphics", "media"], sort: "popularity" }, limit: 12 },
  { slug: "gaming", name: "Open-source gaming", description: "Engines, remakes and full games you can build, mod and share.", rule: { categories: ["gaming"], sort: "popularity" }, limit: 12 },
  { slug: "windows-essentials", name: "Windows essentials", description: "The open-source toolkit that replaces bundled Windows utilities.", rule: { platform: "windows", sort: "popularity" }, limit: 12 },
  { slug: "linux-essentials", name: "Linux essentials", description: "AppImages, DEBs and Flatpaks worth having on every Linux install.", rule: { platform: "linux", sort: "popularity" }, limit: 12 },
  { slug: "macos-essentials", name: "macOS essentials", description: "Native open-source apps with signed DMGs for Apple hardware.", rule: { platform: "macos", sort: "popularity" }, limit: 12 },
  { slug: "ai-local", name: "Local AI", description: "Run models on your own machine — no account, no API key, no upload.", rule: { tags: ["ai", "llm", "local"] }, limit: 10 },
];

function collectionMatches(app, rule) {
  if (rule.featured && !app._featured) return false;
  if (rule.categories && !rule.categories.some((c) => app.categories.includes(c))) return false;
  if (rule.platform && !app.platforms.includes(rule.platform)) return false;
  if (rule.tags && !rule.tags.some((t) => app.tags.includes(t))) return false;
  if (rule.minTrust && (app.scores.trust ?? 0) < rule.minTrust) return false;
  return true;
}

function sortByRule(apps, rule) {
  const sorted = [...apps];
  if (rule.sort === "trust") {
    sorted.sort((a, b) => (b.scores.trust ?? 0) - (a.scores.trust ?? 0));
  } else {
    sorted.sort((a, b) => (b.scores.popularity ?? 0) - (a.scores.popularity ?? 0));
  }
  return sorted;
}

function buildCollections(apps, generatedAt) {
  const bySlug = new Map(apps.map((a) => [a.slug, a]));
  const collections = [];
  for (const [index, def] of COLLECTION_DEFS.entries()) {
    let members;
    if (def.picks) {
      members = def.picks.map((s) => bySlug.get(s)).filter(Boolean);
    } else {
      members = sortByRule(
        apps.filter((app) => collectionMatches(app, def.rule)),
        def.rule,
      ).slice(0, def.limit);
    }
    if (members.length === 0) continue;
    collections.push({
      id: `collection-${def.slug}`,
      slug: def.slug,
      name: def.name,
      description: def.description,
      is_public: true,
      item_count: members.length,
      created_at: generatedAt,
      updated_at: generatedAt,
      sort_order: index,
      app_slugs: members.map((a) => a.slug),
    });
  }
  return collections;
}

/** Similar / alternatives graph: shared category + shared tags, ranked. */
function buildRelations(apps) {
  const popBySlug = new Map(apps.map((a) => [a.slug, a.scores.popularity ?? 0]));
  const byPopularity = (a, b) => (popBySlug.get(a) ?? 0) - (popBySlug.get(b) ?? 0);
  const byTag = new Map();
  const byCategory = new Map();
  for (const app of apps) {
    for (const tag of app.tags) {
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(app);
    }
    for (const category of app.categories) {
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push(app);
    }
  }

  for (const app of apps) {
    const scores = new Map();
    for (const tag of app.tags) {
      for (const other of byTag.get(tag) ?? []) {
        if (other.id === app.id) continue;
        scores.set(other.slug, (scores.get(other.slug) ?? 0) + 2);
      }
    }
    for (const category of app.categories) {
      for (const other of byCategory.get(category) ?? []) {
        if (other.id === app.id) continue;
        scores.set(other.slug, (scores.get(other.slug) ?? 0) + 1);
      }
    }
    const ranked = [...scores.entries()]
      .sort((a, b) => b[1] - a[1] || byPopularity(b[0], a[0]))
      .map(([slug]) => slug);
    // Same developer ⇒ "more by", so keep it out of "similar".
    const sameDeveloper = new Set(apps.filter((a) => a.developer?.id === app.developer?.id && a.id !== app.id).map((a) => a.slug));
    const filtered = ranked.filter((slug) => !sameDeveloper.has(slug));
    app.similar = filtered.slice(0, 8);
    app.alternatives = filtered.slice(2, 8);
  }

}

/* ------------------------------------------------------------------ */
/* Validation — the feed must satisfy the same schemas as the live API */
/* ------------------------------------------------------------------ */

async function validateFeed(feed) {
  const { AppDtoSchema, CategoryDtoSchema, CollectionDtoSchema, DeveloperRecordDtoSchema } =
    await import("@omnistore/shared-models");

  const problems = [];
  for (const app of feed.apps) {
    const result = AppDtoSchema.safeParse(app);
    if (!result.success) {
      problems.push(`${app.id}: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    }
  }
  for (const category of feed.categories) {
    const result = CategoryDtoSchema.safeParse(category);
    if (!result.success) problems.push(`category ${category.slug}: ${result.error.issues[0]?.message}`);
  }
  for (const collection of feed.collections) {
    const result = CollectionDtoSchema.safeParse(collection);
    if (!result.success) problems.push(`collection ${collection.slug}: ${result.error.issues[0]?.message}`);
  }
  for (const developer of feed.developers) {
    const result = DeveloperRecordDtoSchema.safeParse(developer);
    if (!result.success) problems.push(`developer ${developer.slug}: ${result.error.issues[0]?.message}`);
  }
  return problems;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  const startedAt = Date.now();
  const sourcesDoc = JSON.parse(await readFile(SOURCES_PATH, "utf8"));
  let sources = sourcesDoc.sources;

  // De-duplicate: the same repo can appear under a stale alias.
  const seen = new Set();
  sources = sources.filter((s) => {
    const key = s.repo.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (ONLY) sources = sources.filter((s) => s.repo === ONLY);
  if (LIMIT) sources = sources.slice(0, LIMIT);

  console.log(`OmniStore ingest — ${sources.length} sources, concurrency ${CONCURRENCY}`);
  console.log(`Auth: ${TOKEN ? "token" : "anonymous (60 req/h limit)"} · requests will be made to api.github.com`);

  const apps = [];
  const failures = [];
  const slugOwner = new Map();
  let done = 0;

  // Bounded worker pool.
  const queue = [...sources];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const source = queue.shift();
        const result = await ingestOne(source);
        done += 1;
        if (result.ok) {
          // Two repos can normalise to the same slug — first wins, keep both
          // resolvable by recording the collision for the operator.
          if (slugOwner.has(result.app.slug)) {
            failures.push({ repo: result.repo, reason: `slug_collision_with_${slugOwner.get(result.app.slug)}` });
          } else {
            slugOwner.set(result.app.slug, result.repo);
            apps.push(result.app);
          }
        } else {
          failures.push({ repo: result.repo, reason: result.reason });
        }
        if (done % 25 === 0 || done === sources.length) {
          process.stdout.write(`\r  ${done}/${sources.length} resolved (${apps.length} ok, ${failures.length} skipped)   `);
        }
      }
    }),
  );
  process.stdout.write("\n");

  if (apps.length === 0) {
    console.error("\n✗ No sources resolved. Refusing to write an empty feed.");
    console.error(`  ${failures.length} failures, ${requests} requests, ${rateLimited} rate-limited.`);
    for (const f of failures.slice(0, 10)) console.error(`   - ${f.repo}: ${f.reason}`);
    process.exit(1);
  }

  const generatedAt = new Date().toISOString();
  buildRelations(apps);

  // Stable catalog order: popularity, then name.
  apps.sort((a, b) => (b.scores.popularity ?? 0) - (a.scores.popularity ?? 0) || a.name.localeCompare(b.name));

  const usedCategories = [...new Set(apps.flatMap((a) => a.categories))].sort();
  const categories = usedCategories.map((slug, index) => {
    const meta = CATEGORY_META[slug] ?? { name: slug, icon: null, description: null };
    return {
      category_type: slug,
      slug,
      name: meta.name,
      description: meta.description ?? null,
      icon: meta.icon ?? null,
      sort_order: index,
      app_count: apps.filter((a) => a.categories.includes(slug)).length,
    };
  });

  const usedPlatforms = [...new Set(apps.flatMap((a) => a.platforms))].sort();
  const platforms = PLATFORM_META.filter((p) => usedPlatforms.includes(p.platform_type)).map((p) => ({
    ...p,
    app_count: apps.filter((a) => a.platforms.includes(p.platform_type)).length,
  }));

  // One developer record per owner. Top-level records use the v1 wire shape
  // (DeveloperRecordDto: developer_id/slug/name/display_name) — the shape
  // embedded in an app payload (DeveloperDto: id/slug/name/url) is different,
  // so the two are built separately rather than shared.
  const developerMap = new Map();
  for (const app of apps) {
    const d = app.developer;
    if (!d) continue;
    const existing = developerMap.get(d.id);
    if (!existing) {
      developerMap.set(d.id, {
        developer_id: d.id,
        slug: d.slug,
        name: d.name,
        display_name: d.name,
        email: null,
        app_count: 1,
      });
    } else {
      existing.app_count += 1;
    }
  }
  const developers = [...developerMap.values()].sort(
    (a, b) => b.app_count - a.app_count || a.name.localeCompare(b.name),
  );

  // Wire-shaped collection records (apps attached by the provider, not stored
  // twice in the feed — keeps the JSON small and consistent).
  const collections = buildCollections(apps, generatedAt);

  const releaseCount = apps.reduce((n, a) => n + a.releases.length, 0);
  const assetCount = apps.reduce((n, a) => n + a.releases.reduce((m, r) => m + r.assets.length, 0), 0);

  const feed = {
    schema_version: 1,
    feed_version: "1.0.0",
    generated_at: generatedAt,
    source: "github",
    stats: {
      applications: apps.length,
      repositories: apps.length,
      releases: releaseCount,
      assets: assetCount,
      sources: new Set(apps.map((a) => a.source_name)).size,
      platforms: platforms.length,
      categories: categories.length,
      developers: developers.length,
      total_downloads: null,
    },
    categories,
    platforms,
    developers,
    collections,
    apps,
    ingest: {
      requested: sources.length,
      resolved: apps.length,
      skipped: failures.length,
      requests,
      rate_limited: rateLimited,
      duration_ms: Date.now() - startedAt,
      failures,
    },
  };

  const problems = await validateFeed(feed);
  if (problems.length > 0) {
    console.error(`\n✗ Feed failed validation against the shared OmniSource schemas (${problems.length} problems):`);
    for (const p of problems.slice(0, 20)) console.error(`   - ${p}`);
    if (!FORCE) {
      console.error("  Refusing to write. Pass --force to override.");
      process.exit(1);
    }
    console.error("  --force given: writing anyway.");
  }

  // Never shrink a good feed on a flaky run.
  const failureRate = failures.length / sources.length;
  if (failureRate > HARD_LIMIT && !FORCE) {
    console.error(
      `\n✗ ${failures.length}/${sources.length} sources failed (${(failureRate * 100).toFixed(0)}%). ` +
        "This looks like a partial run — an existing feed was left untouched.",
    );
    console.error("  Re-run with a valid GITHUB_TOKEN, or pass --force to write anyway.");
    for (const f of failures.slice(0, 10)) console.error(`   - ${f.repo}: ${f.reason}`);
    process.exit(1);
  }

  const json = `${JSON.stringify(feed, null, 2)}\n`;
  await writeFile(OUT, json, "utf8");

  console.log(`\n✓ Wrote ${path.relative(ROOT, OUT)} (${(json.length / 1024).toFixed(0)} KB)`);
  console.log(
    `  ${apps.length} apps · ${releaseCount} releases · ${assetCount} assets · ` +
      `${categories.length} categories · ${platforms.length} platforms · ${collections.length} collections`,
  );
  if (failures.length > 0) {
    console.log(`  ${failures.length} sources skipped:`);
    for (const f of failures.slice(0, 15)) console.log(`   - ${f.repo}: ${f.reason}`);
    if (failures.length > 15) console.log(`   … and ${failures.length - 15} more`);
  }
  console.log(`  ${requests} GitHub requests, ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

// Run only when executed directly, never when imported (e.g. by a test or a
// syntax check) — a stray import would otherwise fire ~900 GitHub requests.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  main().catch((error) => {
    console.error("\n✗ Ingest failed:", error);
    process.exit(1);
  });
}

export { ingestOne, normaliseVersion, displayName, trustScore, qualityScore, popularityScore, detectAsset };
