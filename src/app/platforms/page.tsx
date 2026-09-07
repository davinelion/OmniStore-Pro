import Link from "next/link";
import { PLATFORMS } from "@/config/site";

export const metadata = { title: "Platforms" };

export default function PlatformsPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Platforms</h1>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {PLATFORMS.map((p) => (
          <Link key={p.slug} href={`/platforms/${p.slug}`} className="rounded-2xl border border-[var(--line)] p-5">
            {p.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
