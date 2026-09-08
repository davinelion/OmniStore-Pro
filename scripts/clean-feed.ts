/**
 * Repairs text hygiene in an existing feed without re-fetching upstream.
 *
 * Useful when the cleaning rules improve after an ingest (for example entity
 * decoding or emoji-shortcode stripping): it applies the same helpers the
 * ingest pipeline now uses, then revalidates against the contract.
 *
 * Usage:
 *   npx tsx scripts/clean-feed.ts --dry-run
 *   npx tsx scripts/clean-feed.ts
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { FeedSchema } from "../src/lib/schemas/omnisource";
import { decodeEntities, stripEmojiShortcodes, tidyText } from "../src/lib/omnisource/text";

const ROOT = path.resolve(__dirname, "..");
const FEED_FILE = path.join(ROOT, "data", "omnisource-feed.json");
const DRY_RUN = process.argv.includes("--dry-run");

function tidy(value: string | null | undefined): string | null {
  return tidyText(value ?? null);
}

/** Keeps markdown structure but removes entity and emoji-shortcode residue. */
function tidyNotes(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = stripEmojiShortcodes(decodeEntities(value)).trim();
  return cleaned.length > 0 ? cleaned : null;
}

async function main() {
  const raw = await readFile(FEED_FILE, "utf8");
  const parsed = FeedSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error("Feed does not validate; refusing to touch it.");
    for (const issue of parsed.error.issues.slice(0, 20)) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const feed = parsed.data;
  let changed = 0;
  const bump = (before: string | null, after: string | null) => {
    if (before !== after) changed += 1;
  };

  for (const app of feed.apps) {
    const summary = tidy(app.summary);
    const description = tidy(app.description);
    bump(app.summary, summary);
    bump(app.description, description);
    app.summary = summary;
    app.description = description;

    app.features = app.features
      .map((feature) => tidy(feature))
      .filter((feature): feature is string => Boolean(feature));

    for (const release of app.releases) {
      const notes = tidyNotes(release.notes);
      bump(release.notes, notes);
      release.notes = notes;
    }
  }

  const revalidated = FeedSchema.safeParse(feed);
  if (!revalidated.success) {
    console.error("Cleaned feed no longer validates; aborting.");
    for (const issue of revalidated.error.issues.slice(0, 20)) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log(`Dry run: ${changed} fields would change across ${feed.apps.length} apps.`);
    return;
  }

  await writeFile(FEED_FILE, `${JSON.stringify(revalidated.data, null, 2)}\n`, "utf8");
  console.log(`Cleaned ${changed} fields across ${feed.apps.length} apps.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
