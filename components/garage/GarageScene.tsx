"use client";

import { useMemo, useState } from "react";
import {
  Bike,
  ClipboardList,
  Hammer,
  Map,
  NotebookPen,
  Ruler,
  Syringe,
} from "lucide-react";

import { GarageDoor } from "@/components/garage/GarageDoor";
import { GarageHotspot } from "@/components/garage/GarageHotspot";
import { MobileGarageMenu } from "@/components/garage/MobileGarageMenu";

const garageObjects = [
  {
    href: "/bike",
    title: "Bike Profile",
    description: "View your bike setup and details",
    icon: <Bike className="h-6 w-6" />,
    style: { left: "23%", top: "54%" },
  },
  {
    href: "/maintenance",
    title: "Maintenance",
    description: "Track service, alerts, and history",
    icon: <ClipboardList className="h-6 w-6" />,
    style: { left: "60%", top: "28%" },
  },
  {
    href: "/pressure",
    title: "Tire Pressure",
    description: "Find and save your ideal PSI",
    icon: <Syringe className="h-6 w-6" />,
    style: { left: "72%", top: "58%" },
  },
  {
    href: "/rides",
    title: "Ride Log",
    description: "Log rides and update component mileage",
    icon: <Map className="h-6 w-6" />,
    style: { left: "40%", top: "23%" },
  },
  {
    href: "/components",
    title: "Components",
    description: "Track mileage and wear",
    icon: <Hammer className="h-6 w-6" />,
    style: { left: "77%", top: "36%" },
  },
  {
    href: "/fit",
    title: "Bike Fit",
    description: "Save your position and setup notes",
    icon: <Ruler className="h-6 w-6" />,
    style: { left: "17%", top: "24%" },
  },
  {
    href: "/checklist",
    title: "Checklist",
    description: "Make sure your bike is ready to ride",
    icon: <NotebookPen className="h-6 w-6" />,
    style: { left: "53%", top: "64%" },
  },
] as const;

export function GarageScene() {
  const [garageOpen, setGarageOpen] = useState(false);

  const mobileMenuItems = useMemo(
    () =>
      garageObjects.map((item) => ({
        href: item.href,
        title: item.title.replace(" Profile", ""),
        icon: item.icon,
      })),
    [],
  );

  return (
    <section className="rounded-[2rem] border border-slate-300 bg-gradient-to-b from-orange-100 to-amber-100 p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-slate-600 uppercase">BikeLog Garage</p>
          <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Open the door and pick your next task
          </h2>
        </div>
        {!garageOpen ? (
          <button
            type="button"
            onClick={() => setGarageOpen(true)}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open Garage
          </button>
        ) : null}
      </div>

      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-slate-200 bg-orange-200/70 shadow-inner">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-100 via-orange-100 to-orange-200" />

        <div className="absolute inset-x-0 bottom-0 h-[33%] bg-gradient-to-b from-orange-300 to-orange-400" />
        <div className="absolute bottom-[25%] left-[10%] h-24 w-40 rounded-full border-4 border-slate-900/50" />
        <div className="absolute bottom-[25%] left-[30%] h-24 w-40 rounded-full border-4 border-slate-900/50" />
        <div className="absolute bottom-[36%] left-[18%] h-2 w-40 rotate-12 rounded-full bg-orange-900/60" />
        <div className="absolute bottom-[36%] left-[31%] h-2 w-30 -rotate-12 rounded-full bg-orange-900/60" />
        <div className="absolute bottom-[49%] left-[27%] h-8 w-2 rounded-full bg-orange-900/60" />

        <div className="absolute left-[69%] top-[56%] h-20 w-20 rounded-lg border-4 border-slate-900/40 bg-slate-100" />
        <div className="absolute left-[56%] top-[18%] h-16 w-12 rounded-lg border-2 border-slate-900/30 bg-white/80" />
        <div className="absolute left-[74%] top-[32%] h-20 w-16 rounded-xl border-2 border-slate-900/35 bg-slate-900/30" />

        {garageObjects.map((object, index) => (
          <GarageHotspot
            key={object.href}
            href={object.href}
            title={object.title}
            description={object.description}
            icon={object.icon}
            style={object.style}
            isVisible={garageOpen}
            index={index}
          />
        ))}

        <GarageDoor isOpen={garageOpen} onOpen={() => setGarageOpen(true)} />
      </div>

      <MobileGarageMenu items={mobileMenuItems} />
    </section>
  );
}
