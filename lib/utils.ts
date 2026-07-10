import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const currencyFormatterCents = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a dollar amount. Whole dollars by default; pass showCents for exact. */
export function formatCurrency(
  value: number | null | undefined,
  options?: { showCents?: boolean },
) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return options?.showCents
    ? currencyFormatterCents.format(value)
    : currencyFormatter.format(value);
}
