import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--line)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="font-semibold">OmniStore</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            OmniStore is a discovery and distribution interface. Applications are provided by their
            respective upstream projects.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/about">About</Link>
          <Link href="/docs">Documentation</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <a href="https://github.com/iamsmmh/OmniStore" rel="noreferrer">GitHub</a>
          <a href="https://github.com/iamsmmh/OmniSource" rel="noreferrer">OmniSource</a>
          <Link href="/report">Report an Issue</Link>
        </div>
        <p className="text-sm text-[var(--muted)]">Open source discovery. Not an app store of record.</p>
      </div>
    </footer>
  );
}
