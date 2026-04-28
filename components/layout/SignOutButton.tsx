"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await signOut({
        redirectTo: "/login",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      className="rounded-full border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-900 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {submitting ? "Signing out..." : "Sign out"}
    </button>
  );
}
