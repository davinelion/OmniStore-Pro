import { platformLabel } from "@/lib/utils";

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--muted)]">
      {platformLabel(platform)}
    </span>
  );
}

export function PlatformAvailability({ platforms }: { platforms: string[] }) {
  const all = ["ios", "android", "windows", "macos", "linux"];
  return (
    <ul className="flex flex-wrap gap-2 text-sm">
      {all.map((p) => (
        <li key={p} className={platforms.includes(p) ? "text-accent" : "text-[var(--muted)]"}>
          {platforms.includes(p) ? "✓" : "–"} {platformLabel(p)}
        </li>
      ))}
    </ul>
  );
}
