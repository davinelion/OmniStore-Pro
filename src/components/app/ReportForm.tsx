"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Flag, Loader2 } from "lucide-react";

import { omniClient, queryKeys } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { track } from "@/lib/analytics";

const REASONS = [
  "Broken download",
  "Incorrect metadata",
  "Wrong platform",
  "Incorrect version",
  "Duplicate app",
  "License issue",
  "Security concern",
  "Other",
] as const;

/** Standalone reporting form (the in-page dialog is ReportDialog). */
export function ReportForm({ defaultAppId }: { defaultAppId?: string }) {
  const [appId, setAppId] = useState(defaultAppId ?? "");
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const apps = useQuery({
    queryKey: queryKeys.apps({ perPage: 96, sort: "name" }),
    queryFn: () => omniClient.getApps({ perPage: 96, sort: "name" }),
    staleTime: 10 * 60_000,
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    try {
      await omniClient.submitReport({
        appId: appId || undefined,
        reason,
        details: details || undefined,
      });
      track("report_submit", { appId, reason });
      setStatus("success");
      setDetails("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="card space-y-4 p-6">
        <p className="flex items-center gap-2 text-success">
          <Check className="h-5 w-5" aria-hidden />
          Thanks — your report was recorded.
        </p>
        <Button variant="outline" onClick={() => setStatus("idle")}>
          Report something else
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-6">
      <Select
        label="Application"
        value={appId}
        onChange={setAppId}
        options={[
          { value: "", label: "Not specific to one app" },
          ...(apps.data?.items ?? []).map((app) => ({ value: app.id, label: app.name })),
        ]}
      />

      <Select
        label="Reason"
        value={reason}
        onChange={setReason}
        options={REASONS.map((value) => ({ value, label: value }))}
      />

      <div className="space-y-1.5">
        <label htmlFor="report-details" className="text-sm font-medium">
          Details <span className="font-normal text-fg-subtle">(optional)</span>
        </label>
        <textarea
          id="report-details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Which package, field or platform is wrong?"
          className="w-full rounded-xl border border-line bg-surface p-3 text-sm"
        />
      </div>

      {status === "error" ? (
        <p role="alert" className="text-sm text-danger">
          We could not record that report. Please try again.
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Submitting…
            </>
          ) : (
            <>
              <Flag className="h-4 w-4" aria-hidden />
              Submit report
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
