import type { Metadata } from "next";
import { PersonalLibrary } from "@/components/library/PersonalLibrary";
export const metadata: Metadata = {
  title: "Your personal library",
  robots: { index: false, follow: true },
};
export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-widest text-accent">
          Made for your workflow
        </p>
        <h1 className="mt-2 text-4xl font-semibold">Your library</h1>
      </header>
      <PersonalLibrary />
    </div>
  );
}
