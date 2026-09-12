import { readFileSync, readdirSync } from "node:fs";

const leaves = (value, prefix = "") => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, prefix ? `${prefix}.${key}` : key));
};
const base = new Set(leaves(JSON.parse(readFileSync("messages/en.json", "utf8"))));
let failed = false;
for (const file of readdirSync("messages").filter((name) => name.endsWith(".json"))) {
  const current = new Set(leaves(JSON.parse(readFileSync(`messages/${file}`, "utf8"))));
  const missing = [...base].filter((key) => !current.has(key));
  const extra = [...current].filter((key) => !base.has(key));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`${file}: missing ${missing.join(", ") || "none"}; extra ${extra.join(", ") || "none"}`);
  }
}
if (failed) process.exit(1);
console.log(`Locale parity OK: ${base.size} keys across ${readdirSync("messages").filter((name) => name.endsWith(".json")).length} locales.`);
