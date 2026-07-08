import { cn } from "@/lib/utils";

function Block({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-slate-100", className)} />;
}

/**
 * Route-level loading skeleton that mirrors the AppShell chrome (ink header +
 * content cards) so navigation paints instantly while server data loads.
 * Used by the per-route `loading.tsx` files.
 */
export function PageSkeleton() {
  return (
    <div className="app-shell-surface min-h-screen">
      <div className="app-header-surface border-b">
        <div className="h-1 w-full bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600" />
        <div className="mx-auto w-full max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8 lg:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="h-8 w-36 animate-pulse rounded-lg bg-white/10" />
            <div className="h-9 w-44 animate-pulse rounded-lg bg-white/10" />
          </div>
          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="h-7 w-52 animate-pulse rounded-lg bg-white/10" />
            <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-white/5" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Block className="h-44 sm:h-56" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Block className="h-28" />
          <Block className="h-28" />
          <Block className="h-28" />
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Block className="h-64" />
          <Block className="h-64" />
        </div>
      </div>
    </div>
  );
}
