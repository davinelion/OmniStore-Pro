import Link from "next/link";
export default function NotFound() {
  return (
    <div className="text-center">
      <h1 className="font-display text-4xl font-semibold">404</h1>
      <p className="mt-2 text-[var(--muted)]">This page is not in OmniStore.</p>
      <Link href="/" className="mt-4 inline-block text-accent">Home</Link>
    </div>
  );
}
