import { Button } from "@/components/ui/Button";

export function CtaBand() {
  return (
    <section id="cta" className="relative overflow-hidden bg-ink-950">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-[28rem] w-[40rem] -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to take control of your bike maintenance?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-300">
          Create an account in seconds and start tracking rides, components, and service history
          today.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href="/login" variant="primary" size="md" className="px-6 py-3 text-base shadow-glow">
            Get started free
          </Button>
          <Button
            href="/login"
            variant="secondary"
            size="md"
            className="border-white/20 bg-transparent px-6 py-3 text-base text-white hover:bg-white/10"
          >
            Sign in
          </Button>
        </div>
      </div>
    </section>
  );
}
