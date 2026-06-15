import { redirect } from "next/navigation";
import { Activity, Check, Gauge, Wrench } from "lucide-react";

import { LoginForm } from "@/components/auth/LoginForm";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { LogoMark } from "@/components/ui/illustrations/LogoMark";
import { RoadLines } from "@/components/ui/illustrations/RoadLines";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const HIGHLIGHTS = [
  { icon: Wrench, label: "Track maintenance & readiness" },
  { icon: Activity, label: "Sync rides from Strava" },
  { icon: Gauge, label: "Dial in tire pressure & fit" },
];

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <MarketingHeader variant="minimal" />
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 shadow-elevated lg:grid-cols-2">
          <div className="hero-gradient relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
            <div className="pointer-events-none absolute inset-0 text-white/[0.06]" aria-hidden="true">
              <RoadLines className="h-full w-full" />
            </div>

            <div className="relative flex items-center gap-2.5">
              <LogoMark className="h-8 w-8 text-brand-400" />
              <span className="font-display text-lg font-bold text-white">
                Bike<span className="text-brand-400">Log</span>
              </span>
            </div>

            <div className="relative">
              <h2 className="font-display text-2xl font-bold text-white">Welcome back.</h2>
              <p className="mt-2 max-w-sm text-sm text-slate-300">
                Sign in to pick up right where you left off — your bikes, rides, and maintenance
                history are waiting.
              </p>
              <ul className="mt-6 space-y-3">
                {HIGHLIGHTS.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <p className="relative flex items-center gap-2 text-xs text-slate-400">
              <Check className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
              Free to use — no credit card required
            </p>
          </div>

          <div className="bg-white p-8 sm:p-10">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
