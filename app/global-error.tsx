"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="grid min-h-screen place-items-center bg-slate-50 px-4 font-sans">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-md">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Something went wrong
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            BikeLog hit an unexpected error. The issue has been reported and we&apos;ll take a
            look.
          </p>
          <a
            href="/dashboard"
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Back to dashboard
          </a>
        </div>
      </body>
    </html>
  );
}
