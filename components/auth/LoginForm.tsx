"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/Button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | null>(null);

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [emailSubmitting, setEmailSubmitting] = useState(false);

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

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setEmailSubmitting(true);

    try {
      if (authMode === "signup") {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          setFormError(data?.error ?? "Could not create your account. Please try again.");
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setFormError("Invalid email or password.");
        return;
      }

      window.location.href = nextPath;
    } finally {
      setEmailSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Welcome to BikeLog
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Continue with Google to access your bikes, rides, and maintenance history.
      </p>

      {searchParams.get("error") ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Authentication failed. Please try again.
        </p>
      ) : null}

      <div className="mt-8 space-y-3">
        <Button
          type="button"
          disabled={submitting}
          onClick={() => handleGoogleAuth("login")}
          variant="primary"
          icon={<GoogleIcon />}
          className="w-full py-2.5 text-sm"
        >
          {submitting && mode === "login" ? "Logging in..." : "Log in with Google"}
        </Button>

        <Button
          type="button"
          disabled={submitting}
          onClick={() => handleGoogleAuth("signup")}
          variant="secondary"
          icon={<GoogleIcon />}
          className="w-full py-2.5 text-sm"
        >
          {submitting && mode === "signup" ? "Starting sign up..." : "Sign up with Google"}
        </Button>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        If you already have an account, use Log in. If not, use Sign up. Google handles the
        account flow.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        BikeLog always asks Google to show account selection so you can choose a different
        account after sign out.
      </p>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 border-t border-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          or continue with email
        </span>
        <div className="h-px flex-1 border-t border-slate-200" />
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-3">
        {authMode === "signup" ? (
          <label className="block text-sm text-slate-700">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              autoComplete="name"
            />
          </label>
        ) : null}

        <label className="block text-sm text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            autoComplete="email"
            required
          />
        </label>

        <label className="block text-sm text-slate-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            autoComplete={authMode === "signup" ? "new-password" : "current-password"}
            minLength={authMode === "signup" ? 8 : undefined}
            required
          />
        </label>

        {formError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={emailSubmitting}
          variant="primary"
          className="w-full py-2.5 text-sm"
        >
          {emailSubmitting
            ? authMode === "signup"
              ? "Creating account..."
              : "Logging in..."
            : authMode === "signup"
              ? "Create account"
              : "Log in"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        {authMode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setAuthMode(authMode === "signup" ? "login" : "signup");
            setFormError(null);
          }}
          className="font-semibold text-brand-700 hover:text-brand-800"
        >
          {authMode === "signup" ? "Log in" : "Sign up"}
        </button>
      </p>
    </div>
  );
}
