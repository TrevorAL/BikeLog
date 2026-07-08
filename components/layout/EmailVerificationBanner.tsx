"use client";

import { useState } from "react";

import { SystemBanner } from "@/components/layout/SystemBanner";

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
    <SystemBanner
      dismissKey="verify-email"
      accent="info"
      action={
        status !== "sent" ? (
          <button
            type="button"
            onClick={handleResend}
            disabled={status === "sending"}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
          >
            {status === "sending" ? "Sending..." : "Resend email"}
          </button>
        ) : undefined
      }
    >
      {status === "sent" ? (
        <>
          Verification email sent to <span className="font-semibold">{email}</span>. Check your
          inbox and spam folder.
        </>
      ) : status === "error" ? (
        <>Could not send the verification email — please try again.</>
      ) : (
        <>
          <span className="font-semibold text-slate-900">Verify your email</span> — a link was
          sent to {email} when you signed up.
        </>
      )}
    </SystemBanner>
  );
}
