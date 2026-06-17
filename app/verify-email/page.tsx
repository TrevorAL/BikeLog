import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoMark } from "@/components/ui/illustrations/LogoMark";

export const metadata = {
  title: "Verify Email — BikeLog",
};

type VerifyEmailPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;

  if (!params.success && !params.error) {
    redirect("/dashboard");
  }

  const isSuccess = params.success === "1";
  const isExpired = params.error === "expired";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark className="h-8 w-8 text-brand-500" />
            <span className="font-display text-lg font-bold text-slate-900">BikeLog</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {isSuccess ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                <svg
                  className="h-6 w-6 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="font-display text-xl font-bold text-slate-900">Email verified!</h1>
              <p className="mt-2 text-sm text-slate-600">
                Your email address has been verified. You&apos;re all set.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Go to dashboard →
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                <svg
                  className="h-6 w-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
              <h1 className="font-display text-xl font-bold text-slate-900">
                {isExpired ? "Link expired" : "Invalid link"}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {isExpired
                  ? "This verification link has expired. Links are valid for 24 hours."
                  : "This verification link is invalid or has already been used."}
              </p>
              <p className="mt-4 text-sm text-slate-600">
                Sign in to your account and use the banner to request a new verification email.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
