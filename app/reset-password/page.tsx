"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { LogoMark } from "@/components/ui/illustrations/LogoMark";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="font-display text-xl font-bold text-slate-900">Invalid link</h1>
        <p className="mt-2 text-sm text-slate-600">
          This password reset link is missing or malformed.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 block text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          Request a new reset link →
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
          <svg
            className="h-6 w-6 text-brand-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-display text-xl font-bold text-slate-900">Password updated</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your password has been changed. You can now log in with your new password.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-xl font-bold text-slate-900">Set a new password</h1>
      <p className="mt-1.5 text-sm text-slate-600">Choose a password with at least 8 characters.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          New password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Confirm password
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
