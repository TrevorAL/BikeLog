"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | null>(null);

  const nextPath = useMemo(() => {
    const candidate = searchParams.get("next");
    if (!candidate || !candidate.startsWith("/")) {
      return "/";
    }

    return candidate;
  }, [searchParams]);

  async function handleGoogleAuth(nextMode: "login" | "signup") {
    setSubmitting(true);
    setMode(nextMode);

    try {
      await signIn("google", {
        redirectTo: nextPath,
      }, {
        prompt: "select_account",
      });
    } finally {
      setSubmitting(false);
      setMode(null);
    }
  }

  return (
    <section className="rounded-3xl border border-orange-200 bg-white p-6 shadow-warm">
      <h1 className="font-display text-3xl font-bold text-orange-950">Welcome to BikeLog</h1>
      <p className="mt-2 text-sm text-orange-900/70">
        Continue with Google to access your bikes, rides, and maintenance history.
      </p>

      {searchParams.get("error") ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Authentication failed. Please try again.
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleGoogleAuth("signup")}
          className="inline-flex items-center justify-center rounded-full border border-orange-300 bg-orange-50 px-5 py-2.5 text-sm font-semibold text-orange-900 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting && mode === "signup" ? "Starting sign up..." : "Sign up with Google"}
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={() => handleGoogleAuth("login")}
          className="inline-flex items-center justify-center rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting && mode === "login" ? "Logging in..." : "Log in with Google"}
        </button>
      </div>

      <p className="mt-4 text-xs text-orange-900/70">
        If you already have an account, use Log in. If not, use Sign up. Google handles the account flow.
      </p>
      <p className="mt-2 text-xs text-orange-900/70">
        BikeLog always asks Google to show account selection so you can choose a different account after sign out.
      </p>
    </section>
  );
}
