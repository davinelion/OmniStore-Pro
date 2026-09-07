import { getRelated, loadCatalog } from "@/lib/api/catalog";
import { platformLabel } from "@/lib/utils";
import Link from "next/link";

export const metadata = { title: "Compare" };

export default async function ComparePage({ searchParams }: { searchParams: { ids?: string } }) {
  const ids = (searchParams.ids ?? "").split(",").filter(Boolean).slice(0, 4);
  const { apps } = await loadCatalog();
  const items = ids.length ? await getRelated(ids) : [];
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Compare</h1>
      <p className="mt-2 text-[var(--muted)]">Select 2–4 applications using query ids.</p>
      <form className="mt-4">
        <input name="ids" defaultValue={ids.join(",")} className="w-full rounded-xl border border-[var(--line)] px-3 py-2" placeholder="localsend,spotube,keepassxc" />
      </form>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {apps.slice(0, 12).map((a) => {
          const next = ids.includes(a.id) ? ids.filter((i) => i !== a.id) : [...ids, a.id].slice(0, 4);
          return (
            <Link key={a.id} href={`/compare?ids=${next.join(",")}`} className="rounded-full border border-[var(--line)] px-3 py-1">
              {ids.includes(a.id) ? "✓ " : ""}
              {a.name}
            </Link>
          );
        })}
      </div>
      {items.length >= 2 && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr>
                <th className="p-2"> </th>
                {items.map((a) => (
                  <th key={a.id} className="p-2">
                    <Link href={`/apps/${a.slug}`}>{a.name}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="Platforms" cells={items.map((a) => a.platforms.map(platformLabel).join(" · "))} />
              <Row label="License" cells={items.map((a) => a.license ?? "Not available")} />
              <Row label="Features" cells={items.map((a) => (a.features ?? []).join(", ") || "Not available")} />
              <Row label="Latest Version" cells={items.map((a) => a.latest_release?.version ?? "Not available")} />
              <Row label="Last Updated" cells={items.map((a) => a.updated_at ?? "Not available")} />
              <Row label="Trust" cells={items.map((a) => String(a.scores?.trust ?? "Not available"))} />
              <Row label="Quality" cells={items.map((a) => String(a.scores?.quality ?? "Not available"))} />
              <Row
                label="Architectures"
                cells={items.map((a) =>
                  Array.from(new Set((a.latest_release?.assets ?? []).map((x) => x.architecture))).join(", ") ||
                  "Not available"
                )}
              />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({ label, cells }: { label: string; cells: string[] }) {
  return (
    <tr className="border-t border-[var(--line)]">
      <th className="p-2 align-top">{label}</th>
      {cells.map((c, i) => (
        <td key={i} className="p-2 align-top text-[var(--muted)]">
          {c}
        </td>
      ))}
    </tr>
  );
}
