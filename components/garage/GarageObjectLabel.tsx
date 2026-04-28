"use client";

import { motion } from "framer-motion";

type GarageObjectLabelProps = {
  title: string;
  description: string;
};

export function GarageObjectLabel({ title, description }: GarageObjectLabelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18 }}
      className="absolute left-1/2 top-0 z-30 w-44 -translate-x-1/2 -translate-y-full rounded-2xl border border-orange-200 bg-white px-3 py-2 text-left shadow-xl"
    >
      <p className="font-display text-sm font-semibold text-orange-950">{title}</p>
      <p className="mt-0.5 text-xs text-orange-900/70">{description}</p>
    </motion.div>
  );
}
