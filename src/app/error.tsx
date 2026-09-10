"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary.
 *
 * Shows a recoverable message and a retry instead of a blank screen. Error
 * details are logged for operators, never rendered to the user.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[omnistore] route error", error);
    track("route_error");
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
      <AlertTriangle className="h-8 w-8 text-danger" aria-hidden />
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted">
        OmniStore could not render this page. The rest of the site is still available — your data is
        safe.
      </p>
      {error.digest ? <p className="text-2xs text-fg-subtle">Reference: {error.digest}</p> : null}
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Try Again
        </Button>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-full border border-line px-4 text-sm transition-colors hover:bg-surface-2"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
