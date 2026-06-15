"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

import { Button } from "@/components/ui/Button";
import { ProductPreviewCard } from "@/components/marketing/ProductPreviewCard";
import { GearBadge } from "@/components/ui/illustrations/GearBadge";
import { RoadLines } from "@/components/ui/illustrations/RoadLines";

export function Hero() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const roadY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const gearY = useTransform(scrollYProgress, [0, 1], ["0%", "55%"]);
  const gearRotate = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const previewY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const previewOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.35]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);

  return (
    <section ref={containerRef} className="relative overflow-hidden bg-ink-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-[36rem] w-[36rem] rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <motion.div
        style={{ y: roadY }}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] text-white/[0.06]"
        aria-hidden="true"
      >
        <RoadLines className="h-full w-full" />
      </motion.div>

      <motion.div
        style={{ y: gearY, rotate: gearRotate }}
        className="pointer-events-none absolute -right-16 top-16 h-64 w-64 text-brand-500/10 lg:h-96 lg:w-96"
        aria-hidden="true"
      >
        <GearBadge className="h-full w-full" />
      </motion.div>

      <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-32">
        <motion.div style={{ y: contentY }}>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-400">
            Bike maintenance, simplified
          </p>
          <h1 className="font-display mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Know your bike.
            <br />
            Ride with confidence.
          </h1>
          <p className="mt-5 max-w-lg text-base text-slate-300 sm:text-lg">
            BikeLog tracks every ride, component, and service interval — so you always know
            what&apos;s due, what&apos;s worn, and when you&apos;re ready to roll.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button href="/login" variant="primary" size="md" className="px-6 py-3 text-base">
              Get started free
            </Button>
            <Button
              href="#features"
              variant="secondary"
              size="md"
              className="border-white/20 bg-transparent px-6 py-3 text-base text-white hover:bg-white/10"
            >
              See how it works
            </Button>
          </div>
        </motion.div>

        <motion.div
          style={{ y: previewY, opacity: previewOpacity }}
          className="relative mx-auto w-full max-w-md [perspective:1200px]"
        >
          <div className="[transform:rotateY(-8deg)_rotateX(4deg)]">
            <ProductPreviewCard />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
