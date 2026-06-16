"use client";

import { useEffect, useRef, useState } from "react";

type ShareState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "off"; shareToken: string | null }
  | { status: "on"; shareToken: string }
  | { status: "error"; message: string };

type Props = { bikeId: string };

export function ShareHistoryPanel({ bikeId }: Props) {
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<ShareState>({ status: "idle" });
  const [copied, setCopied] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!open || hasFetched.current) return;
    hasFetched.current = true;
    setShare({ status: "loading" });

    fetch(`/api/bikes/${bikeId}/share`)
      .then((r) => r.json() as Promise<{ shareToken: string | null; isShared: boolean }>)
      .then((data) => {
        setShare(
          data.isShared && data.shareToken
            ? { status: "on", shareToken: data.shareToken }
            : { status: "off", shareToken: data.shareToken },
        );
      })
      .catch(() => setShare({ status: "error", message: "Could not load share state." }));
  }, [open, bikeId]);

  async function enable() {
    setShare({ status: "loading" });
    try {
      const r = await fetch(`/api/bikes/${bikeId}/share`, { method: "POST" });
      const data = (await r.json()) as { shareToken: string; isShared: boolean };
      setShare({ status: "on", shareToken: data.shareToken });
    } catch {
      setShare({ status: "error", message: "Could not enable sharing." });
    }
  }

  async function disable() {
    setShare({ status: "loading" });
    try {
      await fetch(`/api/bikes/${bikeId}/share`, { method: "DELETE" });
      setShare((prev) => ({
        status: "off",
        shareToken: prev.status === "on" ? prev.shareToken : null,
      }));
    } catch {
      setShare({ status: "error", message: "Could not disable sharing." });
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const shareUrl =
    share.status === "on" ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${share.shareToken}` : null;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {share.status === "on" ? "Sharing enabled" : "Share service history"}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          {share.status === "loading" && (
            <p className="text-xs text-slate-500">Loading…</p>
          )}

          {share.status === "error" && (
            <p className="text-xs text-red-600">{share.message}</p>
          )}

          {share.status === "off" && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-600">
                Generate a public link so anyone can view this bike&apos;s service history — no
                login required.
              </p>
              <button
                type="button"
                onClick={enable}
                className="self-start rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
              >
                Generate shareable link
              </button>
            </div>
          )}

          {share.status === "on" && shareUrl && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={() => copyLink(share.shareToken)}
                  className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Anyone with this link can view the service history. No account needed.
              </p>
              <button
                type="button"
                onClick={disable}
                className="self-start text-xs font-medium text-red-600 hover:text-red-700"
              >
                Disable sharing
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
