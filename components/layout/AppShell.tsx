import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedBikes, getSelectedBikeIdForUser } from "@/lib/ownership";

type AppShellProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export async function AppShell({ title, description, actions, children }: AppShellProps) {
  const user = await getCurrentUser();
  const bikes = user
    ? await getOwnedBikes({
        userId: user.id,
      })
    : [];
  const selectedBikeId = user
    ? await getSelectedBikeIdForUser({
        userId: user.id,
      })
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        title={title}
        description={description}
        actions={actions}
        userName={user?.name}
        userEmail={user?.email}
        bikes={bikes}
        selectedBikeId={selectedBikeId ?? undefined}
      />
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
