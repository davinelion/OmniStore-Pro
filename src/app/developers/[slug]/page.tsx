import { notFound } from "next/navigation";
import { getDeveloper } from "@/lib/api/catalog";
import { AppCard } from "@/components/app/AppCard";
import { formatDate } from "@/lib/utils";

export default async function DeveloperPage({ params }: { params: { slug: string } }) {
  const data = await getDeveloper(params.slug);
  if (!data) notFound();
  const platforms = Array.from(new Set(data.apps.flatMap((a) => a.platforms)));
  const licenses = Array.from(new Set(data.apps.map((a) => a.license).filter(Boolean)));
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">{data.developer.name}</h1>
      <p className="mt-2 text-[var(--muted)]">Platforms: {platforms.join(", ") || "Not available"}</p>
      <p className="text-[var(--muted)]">Licenses: {licenses.join(", ") || "Not available"}</p>
      <h2 className="mt-8 font-display text-xl font-semibold">Applications</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {data.apps.map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </div>
      <h2 className="mt-8 font-display text-xl font-semibold">Latest Releases</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {data.apps.map((a) => (
          <li key={a.id}>
            {a.name}: {a.latest_release?.version ?? "Not available"} · {formatDate(a.latest_release?.released_at)}
          </li>
        ))}
      </ul>
    </div>
  );
}
