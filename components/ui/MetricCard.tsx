"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
};

export function MetricCard({ title, value, subtitle, icon, className }: MetricCardProps) {
  return (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "surface-card flex h-full items-start justify-between gap-3 p-5 transition-shadow duration-200 hover:shadow-elevated",
        className,
      )}
    >
      <div>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className="font-display mt-1 text-2xl font-bold text-slate-900">{value}</p>
        <p className="mt-1 min-h-4 text-xs text-slate-600">{subtitle ?? " "}</p>
      </div>
      {icon ? (
        <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600">{icon}</div>
      ) : null}
    </motion.article>
  );
}
