import Link from "next/link";
import { Check } from "lucide-react";

type Step = {
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
};

type Props = {
  steps: Step[];
};

export function OnboardingChecklist({ steps }: Props) {
  const allDone = steps.every((s) => s.done);
  if (allDone) return null;

  const activeIndex = steps.findIndex((s) => !s.done);

  return (
    <div className="surface-card overflow-hidden p-0">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
          Getting started
        </p>
        <h2 className="font-display mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
          Set up your BikeLog
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Complete these steps to unlock your full dashboard.
        </p>
      </div>

      <ol className="divide-y divide-slate-100">
        {steps.map((step, i) => {
          const isActive = i === activeIndex;
          const isFuture = i > activeIndex;

          return (
            <li
              key={step.title}
              className={`flex items-start gap-4 px-5 py-4 ${isFuture ? "opacity-40" : ""}`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {step.done ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                ) : (
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${
                      isActive
                        ? "border-brand-500 text-brand-600"
                        : "border-slate-200 text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${
                    step.done
                      ? "text-slate-400 line-through"
                      : isActive
                        ? "text-slate-900"
                        : "text-slate-500"
                  }`}
                >
                  {step.title}
                </p>
                {!step.done && (
                  <p className="mt-0.5 text-xs text-slate-500">{step.description}</p>
                )}
              </div>

              {isActive && (
                <Link
                  href={step.href}
                  className="shrink-0 self-center rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  {step.cta}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
