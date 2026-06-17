"use client";

import { useState } from "react";

type EmailVerificationBannerProps = {
  email: string;
};

type ResendStatus = "idle" | "sending" | "sent" | "error";

export function EmailVerificationBanner({ email }: EmailVerificationBannerProps) {
  const [status, setStatus] = useState<ResendStatus>("idle");

  async function handleResend() {
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-sky-900">Verify your email address</p>
          <p className="mt-0.5 text-xs text-sky-800">
            {status === "sent"
              ? `Verification email sent to ${email}. Check your inbox (and spam folder).`
              : `A verification link was sent to ${email} when you signed up.`}
          </p>
          {status === "error" ? (
            <p className="mt-0.5 text-xs text-red-700">Something went wrong — please try again.</p>
          ) : null}
        </div>
        {status !== "sent" ? (
          <button
            type="button"
            onClick={handleResend}
            disabled={status === "sending"}
            className="shrink-0 rounded-md border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 disabled:opacity-60"
          >
            {status === "sending" ? "Sending..." : "Resend email"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
