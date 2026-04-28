import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { SideNav } from "@/components/layout/SideNav";
import { getCurrentUser } from "@/lib/auth";

type AppShellProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export async function AppShell({ title, description, actions, children }: AppShellProps) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 via-amber-50 to-orange-100">
      <AppHeader
        title={title}
        description={description}
        actions={actions}
        userEmail={user?.email ?? undefined}
      />
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <SideNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
