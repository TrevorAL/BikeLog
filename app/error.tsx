"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/Button";
import { GearBadge } from "@/components/ui/illustrations/GearBadge";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-card">
        <GearBadge className="h-12 w-12 text-brand-300" />
        <div>
          <h1 className="font-display text-lg font-semibold tracking-tight text-slate-900">
            Something went wrong
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            An unexpected error occurred. The issue has been reported and we&apos;ll take a look.
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset} variant="primary">
            Try again
          </Button>
          <Button href="/dashboard" variant="secondary">
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
