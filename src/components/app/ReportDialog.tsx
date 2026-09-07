"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { omniClient } from "@/lib/api/client";
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

/**
 * Lightweight metadata reporting.
 *
 * Reports go to the OmniStore BFF, which records them for triage. No
 * moderation platform is built here — that belongs to OmniSource.
 */
export function ReportDialog({
  appId,
  appName,
  open,
  onClose,
}: {
  appId?: string;
  appName?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    try {
      await omniClient.submitReport({ appId, appName, reason, details: details || undefined });
      track("report_submit", { appId: appId ?? "", reason });
      setStatus("success");
      setDetails("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        setStatus("idle");
        onClose();
      }}
      title="Report an Issue"
      description={
        appName
          ? `Tell us what is wrong with the OmniSource data for ${appName}.`
          : "Tell us which listing needs attention."
      }
    >
      {status === "success" ? (
        <div className="space-y-4">
          <p className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
            Thanks — your report was recorded.
          </p>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setStatus("idle");
                onClose();
              }}
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="report-reason" className="text-sm font-medium">
              Reason
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm"
            >
              {REASONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="report-details" className="text-sm font-medium">
              Details <span className="font-normal text-fg-subtle">(optional)</span>
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Which package or field is wrong?"
              className="w-full rounded-xl border border-line bg-surface p-3 text-sm"
            />
          </div>

          {status === "error" ? (
            <p role="alert" className="text-sm text-danger">
              We could not record that report. Please try again.
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
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
      )}
    </Dialog>
  );
}

export function ReportButton({
  appId,
  appName,
  className,
}: {
  appId?: string;
  appName?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Report an Issue
      </button>
      <ReportDialog appId={appId} appName={appName} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
