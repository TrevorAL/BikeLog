import Link from "next/link";

import { LogoMark } from "@/components/ui/illustrations/LogoMark";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-ink-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-7 w-7 text-brand-400" />
          <div>
            <p className="font-display text-base font-bold text-white">
              Bike<span className="text-brand-400">Log</span>
            </p>
            <p className="text-xs text-slate-400">Maintenance, rides, and fit — all in one place.</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Footer navigation">
          <a href="#features" className="text-sm text-slate-400 transition hover:text-white">
            Features
          </a>
          <Link href="/login" className="text-sm text-slate-400 transition hover:text-white">
            Sign in
          </Link>
          <Link href="/privacy" className="text-sm text-slate-400 transition hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="text-sm text-slate-400 transition hover:text-white">
            Terms
          </Link>
          <a href="mailto:tlachman4@gmail.com" className="text-sm text-slate-400 transition hover:text-white">
            Contact
          </a>
        </nav>

        <p className="text-xs text-slate-500">© {new Date().getFullYear()} BikeLog. All rights reserved.</p>
      </div>
    </footer>
  );
}
