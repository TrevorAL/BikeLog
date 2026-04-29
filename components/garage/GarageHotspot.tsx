"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { GarageObjectLabel } from "@/components/garage/GarageObjectLabel";
import { cn } from "@/lib/utils";

type GarageHotspotProps = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  className?: string;
  style?: CSSProperties;
  isVisible: boolean;
  index: number;
};

export function GarageHotspot({
  href,
  title,
  description,
  icon,
  className,
  style,
  isVisible,
  index,
}: GarageHotspotProps) {
  const [active, setActive] = useState(false);

  return (
    <motion.div
      style={style}
      initial={false}
      animate={
        isVisible
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 18, scale: 0.9, pointerEvents: "none" }
      }
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className={cn("absolute", className)}
    >
      <Link
        href={href}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        className="group relative block rounded-lg border border-slate-200 bg-white/95 p-3 text-slate-700 shadow-lg transition hover:scale-[1.02] hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600"
      >
        <AnimatePresence>{active ? <GarageObjectLabel title={title} description={description} /> : null}</AnimatePresence>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>
      </Link>
    </motion.div>
  );
}
