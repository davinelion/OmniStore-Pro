export const metadata = { title: "Privacy" };
export default function Privacy() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-3xl font-semibold">Privacy</h1>
      <p className="text-[var(--muted)]">
        Browsing does not require an account. Favorites and follows are stored locally in your browser. We do not
        collect unnecessary personal data.
      </p>
    </div>
  );
}
