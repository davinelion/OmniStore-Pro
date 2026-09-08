import type { Metadata } from "next";

import { ReportForm } from "@/components/app/ReportForm";

export const metadata: Metadata = {
  title: "Report an Issue",
  description: "Report broken downloads, incorrect metadata, wrong platforms or licensing problems.",
  alternates: { canonical: "/report" },
  robots: { index: false, follow: true },
};

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Report an Issue</h1>
        <p className="text-muted">
          Help keep OmniSource metadata accurate. Reports are reviewed against the upstream source and
          corrected at the data layer.
        </p>
      </header>

      <ReportForm />
    </div>
  );
}
