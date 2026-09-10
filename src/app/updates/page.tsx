import type { Metadata } from "next";
import { UpdateInbox } from "@/components/library/UpdateInbox";
export const metadata: Metadata = {
  title: "Your update inbox",
  robots: { index: false, follow: true },
};
export default function UpdatesPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-widest text-accent">
          Your open-source world
        </p>
        <h1 className="mt-2 text-4xl font-semibold">Update inbox</h1>
        <p className="mt-3 text-muted">
          Keep up with the tools you care about.
        </p>
      </header>
      <UpdateInbox />
    </div>
  );
}
