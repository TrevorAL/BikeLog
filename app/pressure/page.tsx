import { AppShell } from "@/components/layout/AppShell";
import { PressureCalculator } from "@/components/pressure/PressureCalculator";
import { PressurePresetCard } from "@/components/pressure/PressurePresetCard";
import { mockPressurePresets } from "@/lib/mock-data";

export default function PressurePage() {
  return (
    <AppShell
      title="Tire Pressure"
      description="Find and save pressure setups by surface and ride preference."
    >
      <PressureCalculator />

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-orange-950">Saved presets</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mockPressurePresets.map((preset) => (
            <PressurePresetCard
              key={preset.id}
              name={preset.name}
              frontPsi={preset.frontPsi}
              rearPsi={preset.rearPsi}
              surface={preset.surface}
              preference={preset.preference}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
