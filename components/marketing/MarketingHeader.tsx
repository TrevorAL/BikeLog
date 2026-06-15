"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LogoMark } from "@/components/ui/illustrations/LogoMark";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type MarketingHeaderProps = {
  variant?: "landing" | "minimal";
};

export function MarketingHeader({ variant = "landing" }: MarketingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 24);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-colors duration-300",
        scrolled
          ? "border-white/10 bg-ink-950/90 backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8 text-brand-400" />
          <span className="font-display text-lg font-bold tracking-tight text-white">
            Bike<span className="text-brand-400">Log</span>
          </span>
        </Link>

        {variant === "landing" ? (
          <nav className="hidden items-center gap-8 lg:flex" aria-label="Marketing navigation">
            <a href="#features" className="text-sm font-medium text-slate-300 transition hover:text-white">
              Features
            </a>
            <a href="#cta" className="text-sm font-medium text-slate-300 transition hover:text-white">
              Get started
            </a>
          </nav>
        ) : null}

        {variant === "landing" ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <Button href="/login" variant="ghost" size="sm" className="text-slate-200 hover:bg-white/10 hover:text-white">
              Sign in
            </Button>
            <Button href="/login" variant="primary" size="sm">
              Get started
            </Button>
          </div>
        ) : (
          <Button href="/" variant="ghost" size="sm" className="text-slate-200 hover:bg-white/10 hover:text-white">
            Back to home
          </Button>
        )}
      </div>
    </header>
  );
}
