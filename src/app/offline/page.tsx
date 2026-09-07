export const metadata = { title: "Offline" };
export default function Offline() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">You are offline</h1>
      <p className="mt-2 text-[var(--muted)]">
        Cached catalog information may still be available. OmniStore cannot pretend the entire catalog is offline.
      </p>
    </div>
  );
}
