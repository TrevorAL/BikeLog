"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

type BikeSwitcherBike = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  year: number | null;
};

type BikeSwitcherProps = {
  bikes: BikeSwitcherBike[];
  selectedBikeId?: string;
};

function bikeLabel(bike: BikeSwitcherBike) {
  const primary = [bike.year, bike.brand, bike.model].filter(Boolean).join(" ").trim();
  return primary.length > 0 ? primary : bike.name;
}

export function BikeSwitcher({ bikes, selectedBikeId }: BikeSwitcherProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const selectedBike = useMemo(
    () => bikes.find((bike) => bike.id === selectedBikeId) ?? bikes[0],
    [bikes, selectedBikeId],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (rootRef.current && !rootRef.current.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function selectBike(bikeId: string) {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError(undefined);

    try {
      const response = await fetch("/api/bikes/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bikeId,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not switch bikes.");
      }

      setIsOpen(false);
      router.refresh();
    } catch (switchError) {
      const message = switchError instanceof Error ? switchError.message : "Could not switch bikes.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (bikes.length === 0) {
    return (
      <Link
        href="/bike?openAddBike=1#bike-manager"
        className="inline-flex h-9 items-center rounded-md border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
      >
        Add Bike
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        disabled={isSaving || bikes.length <= 1}
        className={cn(
          "inline-flex h-9 max-w-[220px] items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60",
          isOpen ? "border-sky-600 ring-2 ring-sky-200" : "",
        )}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Select bike"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bike</span>
        <span className="truncate font-semibold text-slate-900">{bikeLabel(selectedBike)}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", isOpen ? "rotate-180" : "")}
        />
      </button>

      {isOpen && bikes.length > 1 ? (
        <div role="menu" className="dropdown-surface absolute right-0 top-[calc(100%+8px)] z-40 w-72 rounded-xl border p-2 shadow-lg">
          <ul className="space-y-1">
            {bikes.map((bike) => {
              const isActive = bike.id === selectedBike.id;
              return (
                <li key={bike.id}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => {
                      void selectBike(bike.id);
                    }}
                    disabled={isSaving}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60",
                      isActive ? "dropdown-item-active" : "",
                    )}
                  >
                    <p className="truncate text-sm font-semibold text-slate-900">{bikeLabel(bike)}</p>
                    <p className="truncate text-xs text-slate-600">{bike.name}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
