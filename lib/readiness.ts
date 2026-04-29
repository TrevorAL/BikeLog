import type { MaintenanceStatus } from "@/lib/constants";

type ReadinessInput = {
  statuses: MaintenanceStatus[];
  hasRecentWetRide: boolean;
  chainCleanedAfterWetRide: boolean;
  di2StatusKnown: boolean;
};

export type ReadinessDeduction = {
  reason: string;
  points: number;
};

export type ReadinessBreakdown = {
  score: number;
  deductions: ReadinessDeduction[];
};

export function calculateReadinessBreakdown(input: ReadinessInput): ReadinessBreakdown {
  let score = 100;
  const deductions: ReadinessDeduction[] = [];

  function applyDeduction(points: number, reason: string) {
    score -= points;
    deductions.push({ points, reason });
  }

  let overdueCount = 0;
  let dueNowCount = 0;
  let dueSoonCount = 0;

  for (const status of input.statuses) {
    if (status === "OVERDUE") overdueCount += 1;
    if (status === "DUE_NOW") dueNowCount += 1;
    if (status === "DUE_SOON") dueSoonCount += 1;
  }

  if (overdueCount > 0) {
    applyDeduction(
      overdueCount * 20,
      `${overdueCount} overdue maintenance item${overdueCount === 1 ? "" : "s"}`,
    );
  }

  if (dueNowCount > 0) {
    applyDeduction(
      dueNowCount * 15,
      `${dueNowCount} maintenance item${dueNowCount === 1 ? "" : "s"} due now`,
    );
  }

  if (dueSoonCount > 0) {
    applyDeduction(
      dueSoonCount * 10,
      `${dueSoonCount} maintenance item${dueSoonCount === 1 ? "" : "s"} due soon`,
    );
  }

  if (!input.di2StatusKnown) {
    applyDeduction(10, "Shifting battery charge status is unknown");
  }

  if (input.hasRecentWetRide && !input.chainCleanedAfterWetRide) {
    applyDeduction(10, "Recent wet ride without a follow-up chain clean/lube");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    deductions,
  };
}

export function calculateReadinessScore(input: ReadinessInput) {
  return calculateReadinessBreakdown(input).score;
}

export function formatReadinessReasons(input: ReadinessInput) {
  const breakdown = calculateReadinessBreakdown(input);
  return breakdown.deductions.map(
    (deduction) => `${deduction.reason} (-${deduction.points})`,
  );
}

export function getReadinessLabel(score: number) {
  if (score >= 90) return "Ready";
  if (score >= 70) return "Good, minor checks";
  if (score >= 50) return "Needs attention";
  return "Not ready";
}
