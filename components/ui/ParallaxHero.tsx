"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

import { BikeSilhouette } from "@/components/ui/illustrations/BikeSilhouette";
import { RoadLines } from "@/components/ui/illustrations/RoadLines";
import { cn } from "@/lib/utils";

type ParallaxHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
};

export function ParallaxHero({ eyebrow, title, subtitle, children, className }: ParallaxHeroProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const roadY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const bikeY = useTransform(scrollYProgress, [0, 1], ["0%", "65%"]);
  const bikeOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.25]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);

  return (
    <section
      ref={containerRef}
      className={cn(
        "hero-gradient relative overflow-hidden rounded-2xl shadow-elevated",
        className,
      )}
    >
      <motion.div
        style={{ y: roadY }}
        className="pointer-events-none absolute inset-0 text-sky-300/60"
        aria-hidden="true"
      >
        <RoadLines className="h-full w-full" />
      </motion.div>

      <motion.div
        style={{ y: bikeY, opacity: bikeOpacity }}
        className="pointer-events-none absolute -right-10 bottom-0 h-44 w-[26rem] text-brand-400/80 sm:h-56 sm:w-[34rem] lg:h-64 lg:w-[42rem]"
        aria-hidden="true"
      >
        <BikeSilhouette className="h-full w-full" />
      </motion.div>

      <motion.div
        style={{ y: contentY }}
        className="relative px-6 py-10 sm:px-10 sm:py-14 lg:max-w-xl"
      >
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 text-sm text-slate-300 sm:text-base">{subtitle}</p>
        ) : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </motion.div>
    </section>
  );
}
