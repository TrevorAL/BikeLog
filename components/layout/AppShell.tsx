import type { ReactNode } from "react";

import Link from "next/link";

import { AppHeader } from "@/components/layout/AppHeader";
import { EmailVerificationBanner } from "@/components/layout/EmailVerificationBanner";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { StravaReconnectBanner } from "@/components/layout/StravaReconnectBanner";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOwnedBikes, getSelectedBikeIdForUser } from "@/lib/ownership";

const STRAVA_FAILURE_THRESHOLD = 3;

type AppShellProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export async function AppShell({ title, description, actions, children }: AppShellProps) {
  const user = await getCurrentUser();

  const [bikes, selectedBikeId, stravaConn, userDetails] = await Promise.all([
    user ? getOwnedBikes({ userId: user.id }) : Promise.resolve([]),
    user ? getSelectedBikeIdForUser({ userId: user.id }) : Promise.resolve(null),
    user
      ? prisma.stravaConnection
          .findUnique({ where: { userId: user.id }, select: { consecutiveSyncFailures: true } })
          .catch(() => null)
      : Promise.resolve(null),
    user
      ? prisma.user
          .findUnique({ where: { id: user.id }, select: { emailVerified: true, passwordHash: true } })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const stravaFailures = stravaConn?.consecutiveSyncFailures ?? 0;
  const needsEmailVerify = Boolean(userDetails?.passwordHash && !userDetails.emailVerified);

  return (
    <div className="app-shell-surface min-h-screen">
      <AppHeader
        title={title}
        description={description}
        actions={actions}
        userName={user?.name}
        userEmail={user?.email}
        userImage={user?.image}
        bikes={bikes}
        selectedBikeId={selectedBikeId ?? undefined}
      />
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {stravaFailures >= STRAVA_FAILURE_THRESHOLD ? (
          <StravaReconnectBanner failCount={stravaFailures} />
        ) : null}
        {needsEmailVerify && user?.email ? (
          <EmailVerificationBanner email={user.email} />
        ) : null}
        <main className="min-w-0">{children}</main>
      </div>

      <footer className="mb-16 border-t border-slate-200/60 bg-slate-50 lg:mb-0">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} BikeLog</p>
          <nav className="flex items-center gap-4" aria-label="App footer navigation">
            <Link href="/privacy" className="text-xs text-slate-400 hover:text-slate-700">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-slate-400 hover:text-slate-700">
              Terms
            </Link>
            <a href="mailto:tlachman4@gmail.com" className="text-xs text-slate-400 hover:text-slate-700">
              Contact
            </a>
          </nav>
        </div>
      </footer>

      <MobileTabBar />
    </div>
  );
}
