import type { MaintenanceStatus } from "@/lib/constants";

type ReadinessInput = {
  statuses: MaintenanceStatus[];
  hasRecentWetRide: boolean;
  chainCleanedAfterWetRide: boolean;
  tirePressureCheckedRecently: boolean;
  di2StatusKnown: boolean;
};

export function calculateReadinessScore(input: ReadinessInput) {
  let score = 100;

  for (const status of input.statuses) {
    if (status === "OVERDUE") score -= 20;
    if (status === "DUE_NOW") score -= 15;
    if (status === "DUE_SOON") score -= 10;
  }

  if (!input.tirePressureCheckedRecently) score -= 10;
  if (!input.di2StatusKnown) score -= 10;
  if (input.hasRecentWetRide && !input.chainCleanedAfterWetRide) score -= 10;

  return Math.max(0, Math.min(100, score));
}

export function getReadinessLabel(score: number) {
  if (score >= 90) return "Ready";
  if (score >= 70) return "Good, minor checks";
  if (score >= 50) return "Needs attention";
  return "Not ready";
}
