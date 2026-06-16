"use client";

import { motion } from "framer-motion";
import { Activity, Bell, Gauge, Ruler, Settings2, Share2, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: Wrench,
    title: "Maintenance & readiness",
    description:
      "Track service intervals across every system and get an at-a-glance readiness score before you head out.",
  },
  {
    icon: Activity,
    title: "Ride logging + Strava sync",
    description:
      "Log rides manually or sync automatically from Strava to keep mileage and component wear up to date.",
  },
  {
    icon: Gauge,
    title: "Tire pressure calculator",
    description:
      "Dial in front and rear PSI for your setup, terrain, and conditions before every ride.",
  },
  {
    icon: Ruler,
    title: "Bike fit tracking",
    description:
      "Record bike and rider measurements over time so your fit stays consistent across adjustments.",
  },
  {
    icon: Settings2,
    title: "Component health & mileage",
    description:
      "Keep tabs on drivetrain, brakes, tires, and more — know exactly how many miles each part has seen.",
  },
  {
    icon: Bell,
    title: "Smart reminders",
    description:
      "Get notified before maintenance is due so small issues never turn into expensive ones.",
  },
  {
    icon: Share2,
    title: "Shareable service history",
    description:
      "Generate a public link to share your bike's full service record — specs, components, and maintenance log — with no login required. Perfect for selling a bike.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function FeatureGrid() {
  return (
    <section id="features" className="bg-ink-900 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-400">Everything in one place</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built to keep your bike ready to ride
          </h2>
          <p className="mt-4 text-base text-slate-300">
            From daily ride logs to long-term component wear, BikeLog brings every detail of bike
            ownership into one clear, organized place.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={cardVariants}
                transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-card backdrop-blur-sm"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-display mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.description}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
