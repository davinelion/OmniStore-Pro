import type { License } from "@/lib/schemas/omnisource";

/**
 * SPDX metadata for the licences we encounter upstream.
 *
 * The URL is the canonical SPDX page — a real, stable reference. We never
 * invent licence text or link to an unknown host. Unknown SPDX ids fall back
 * to a record with `url: null`, and the UI renders "Not available" for the link.
 */
const SPDX: Record<string, { name: string; osi: boolean }> = {
  "MIT": { name: "MIT License", osi: true },
  "Apache-2.0": { name: "Apache License 2.0", osi: true },
  "GPL-2.0": { name: "GNU General Public License v2.0", osi: true },
  "GPL-2.0-only": { name: "GNU General Public License v2.0 only", osi: true },
  "GPL-3.0": { name: "GNU General Public License v3.0", osi: true },
  "GPL-3.0-only": { name: "GNU General Public License v3.0 only", osi: true },
  "GPL-3.0-or-later": { name: "GNU General Public License v3.0 or later", osi: true },
  "AGPL-3.0": { name: "GNU Affero General Public License v3.0", osi: true },
  "LGPL-2.1": { name: "GNU Lesser General Public License v2.1", osi: true },
  "LGPL-3.0": { name: "GNU Lesser General Public License v3.0", osi: true },
  "MPL-2.0": { name: "Mozilla Public License 2.0", osi: true },
  "BSD-2-Clause": { name: "BSD 2-Clause License", osi: true },
  "BSD-3-Clause": { name: "BSD 3-Clause License", osi: true },
  "ISC": { name: "ISC License", osi: true },
  "Unlicense": { name: "The Unlicense", osi: true },
  "Zlib": { name: "zlib License", osi: true },
  "EPL-2.0": { name: "Eclipse Public License 2.0", osi: true },
  "CC0-1.0": { name: "Creative Commons Zero v1.0 Universal", osi: false },
  "CC-BY-4.0": { name: "Creative Commons Attribution 4.0", osi: false },
  "CC-BY-SA-4.0": { name: "Creative Commons Attribution Share Alike 4.0", osi: false },
  "0BSD": { name: "BSD Zero Clause License", osi: true },
  "Artistic-2.0": { name: "Artistic License 2.0", osi: true },
  "BSL-1.0": { name: "Boost Software License 1.0", osi: true },
  "MIT-0": { name: "MIT No Attribution", osi: true },
  "ODbL-1.0": { name: "Open Data Commons Open Database License v1.0", osi: false },
};

export const KNOWN_LICENSE_IDS = Object.keys(SPDX);

export function licenseFromSpdx(id: string | null | undefined): License | null {
  if (!id) return null;
  const known = SPDX[id];
  const url = `https://spdx.org/licenses/${id}.html`;
  if (!known) {
    return { id, name: id, url: null, osi_approved: null };
  }
  return { id, name: known.name, url, osi_approved: known.osi };
}

/** Licences OmniStore treats as open source, used for the "Open Source" signal. */
export function isOpenSourceLicense(id: string | null | undefined): boolean {
  if (!id) return false;
  const known = SPDX[id];
  if (known) return known.osi || id === "Unlicense" || id === "CC0-1.0";
  // Unknown SPDX ids are not assumed to be closed, but also not asserted open.
  return !/proprietary|commercial/i.test(id);
}
