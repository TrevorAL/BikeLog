"use client";

import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

type GarageDoorProps = {
  isOpen: boolean;
  onOpen: () => void;
};

export function GarageDoor({ isOpen, onOpen }: GarageDoorProps) {
  return (
    <motion.div
      initial={false}
      animate={isOpen ? { y: "-102%" } : { y: 0 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-20 border-b-4 border-orange-900 bg-gradient-to-b from-orange-700 via-orange-600 to-orange-700"
    >
      <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col items-center justify-center gap-4">
        <div className="grid grid-cols-5 gap-2 px-8">
          {Array.from({ length: 15 }).map((_, index) => (
            <span
              key={`panel-${index}`}
              className="h-10 w-10 rounded-md border border-orange-400/40 bg-orange-500/30"
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-5 py-2 text-sm font-semibold text-orange-800 shadow transition hover:bg-orange-100"
        >
          <ArrowUp className="h-4 w-4" />
          Open Garage
        </button>
      </div>
    </motion.div>
  );
}
