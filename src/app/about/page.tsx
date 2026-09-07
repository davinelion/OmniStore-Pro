export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="prose max-w-2xl">
      <h1 className="font-display text-3xl font-semibold">About OmniStore</h1>
      <p className="mt-4 text-[var(--muted)]">
        OmniStore is a modern universal discovery and distribution interface for open-source applications.
        OmniSource provides intelligence, metadata, validation, search, and feeds. OmniStore Web is the first
        complete client.
      </p>
    </div>
  );
}
