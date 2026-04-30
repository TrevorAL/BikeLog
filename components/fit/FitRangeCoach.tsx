"use client";

import { useEffect, useMemo, useState } from "react";

type FitRangeCoachProps = {
  current: {
    saddleHeightMm?: number;
    saddleSetbackMm?: number;
    stemLengthMm?: number;
    handlebarWidthMm?: number;
    reachToHoodsMm?: number;
    crankLengthMm?: number;
    spacerStackMm?: number;
  };
};

type RiderDimensions = {
  heightCm: number;
  inseamCm: number;
  torsoCm: number;
  armCm: number;
  shoulderWidthCm: number;
  flexibility: number;
  posture: number;
};

type RiderLengthUnit = "cm" | "in";
type RiderLengthField =
  | "heightCm"
  | "inseamCm"
  | "torsoCm"
  | "armCm"
  | "shoulderWidthCm";
type RiderScoreField = "flexibility" | "posture";
type RiderEditableField = RiderLengthField | RiderScoreField;

type MetricTarget = {
  key: string;
  label: string;
  current?: number;
  min: number;
  max: number;
  idealMin: number;
  idealMax: number;
  unit: string;
};

type RiderMeasurementGuide = {
  key: RiderEditableField;
  label: string;
  definition: string;
  steps: string[];
};

const STORAGE_KEY = "bikelog-fit-range-coach-v1";
const STORAGE_UNIT_KEY = "bikelog-fit-range-unit-v1";
const CM_PER_INCH = 2.54;
const LENGTH_FIELDS: RiderLengthField[] = [
  "heightCm",
  "inseamCm",
  "torsoCm",
  "armCm",
  "shoulderWidthCm",
];

const defaultDimensions: RiderDimensions = {
  heightCm: 178,
  inseamCm: 82,
  torsoCm: 60,
  armCm: 62,
  shoulderWidthCm: 42,
  flexibility: 3,
  posture: 3,
};

const riderMeasurementGuides: RiderMeasurementGuide[] = [
  {
    key: "heightCm",
    label: "Height",
    definition: "Overall standing body height used to scale baseline fit ranges.",
    steps: [
      "Stand barefoot with heels, hips, and upper back against a wall.",
      "Keep your head neutral, eyes forward, and place a flat book level on your head.",
      "Mark the wall at the bottom of the book and measure from floor to mark.",
    ],
  },
  {
    key: "inseamCm",
    label: "Inseam",
    definition: "Floor-to-pelvis length used heavily for saddle and crank recommendations.",
    steps: [
      "Stand barefoot with feet about shoulder width apart against a wall.",
      "Place a hardcover book between your legs and pull it firmly upward to simulate saddle pressure.",
      "Measure from floor to the top edge of the book (book spine side).",
    ],
  },
  {
    key: "torsoCm",
    label: "Torso",
    definition: "Upper-body length used for cockpit sizing targets.",
    steps: [
      "Stand upright with natural posture.",
      "Find your sternal notch (the small dip between collarbones).",
      "Measure from sternal notch straight down to crotch level.",
    ],
  },
  {
    key: "armCm",
    label: "Arm",
    definition: "Reach length from shoulder area to hand used in cockpit balance.",
    steps: [
      "Hold one arm straight out to the side, relaxed and level.",
      "Measure from the bony shoulder point (acromion) to the center of your clenched fist.",
      "Repeat once and average if the two attempts differ.",
    ],
  },
  {
    key: "shoulderWidthCm",
    label: "Shoulder Width",
    definition: "Distance across shoulders used to estimate handlebar width.",
    steps: [
      "Stand relaxed and find the bony shoulder points on both sides (acromion to acromion).",
      "Measure straight across between those points.",
      "Keep tape level; avoid wrapping around the front of shoulders.",
    ],
  },
  {
    key: "flexibility",
    label: "Flexibility (1-5)",
    definition: "Mobility score used to shift fit toward comfort or aggression.",
    steps: [
      "Use 1 if you are tight (hamstrings/hips/back) and struggle to hinge forward comfortably.",
      "Use 3 for average recreational flexibility.",
      "Use 5 if you are very mobile and can hold low positions comfortably.",
    ],
  },
  {
    key: "posture",
    label: "Riding Posture (1-5)",
    definition: "Preference score for upright vs aggressive riding position.",
    steps: [
      "Use 1 for endurance/upright comfort-first setup.",
      "Use 3 for balanced all-around road position.",
      "Use 5 for aggressive, low front-end race-oriented position.",
    ],
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundHalf(value: number) {
  return Math.round(value * 2) / 2;
}

function toDisplayLength(valueCm: number, unit: RiderLengthUnit) {
  const converted = unit === "cm" ? valueCm : valueCm / CM_PER_INCH;
  return Number(converted.toFixed(unit === "cm" ? 1 : 2));
}

function toCentimeters(value: number, unit: RiderLengthUnit) {
  return unit === "cm" ? value : value * CM_PER_INCH;
}

function sanitizeDimensions(input: Partial<RiderDimensions>): RiderDimensions {
  return {
    heightCm: clamp(input.heightCm ?? defaultDimensions.heightCm, 140, 220),
    inseamCm: clamp(input.inseamCm ?? defaultDimensions.inseamCm, 60, 110),
    torsoCm: clamp(input.torsoCm ?? defaultDimensions.torsoCm, 45, 85),
    armCm: clamp(input.armCm ?? defaultDimensions.armCm, 45, 85),
    shoulderWidthCm: clamp(
      input.shoulderWidthCm ?? defaultDimensions.shoulderWidthCm,
      34,
      52,
    ),
    flexibility: Math.round(
      clamp(input.flexibility ?? defaultDimensions.flexibility, 1, 5),
    ),
    posture: Math.round(clamp(input.posture ?? defaultDimensions.posture, 1, 5)),
  };
}

function getRecommendedMetrics(
  dims: RiderDimensions,
  current: FitRangeCoachProps["current"],
): MetricTarget[] {
  const inseamMm = dims.inseamCm * 10;
  const postureBias = dims.posture - 3;
  const flexBias = dims.flexibility - 3;

  const saddleHeight = clamp(inseamMm * 0.883, 620, 860);
  const saddleSetback = clamp(
    dims.inseamCm * 0.74 + (3 - dims.posture) * 2 + (3 - dims.flexibility) * 1.2,
    35,
    95,
  );
  const stemLength = clamp(
    98 +
      (dims.torsoCm - 60) * 1.1 +
      (dims.armCm - 62) * 0.9 +
      postureBias * 4 +
      flexBias * 2,
    70,
    140,
  );
  const barWidth = clamp(dims.shoulderWidthCm * 10, 360, 460);
  const reachToHoods = clamp(
    475 +
      (dims.torsoCm - 60) * 3 +
      (dims.armCm - 62) * 2 +
      postureBias * 10 +
      flexBias * 6,
    430,
    620,
  );
  const spacerStack = clamp(24 + (3 - dims.posture) * 6 + (3 - dims.flexibility) * 6, 0, 55);

  let crankLength = 172.5;
  if (dims.inseamCm < 76) crankLength = 165;
  else if (dims.inseamCm < 82) crankLength = 170;
  else if (dims.inseamCm < 88) crankLength = 172.5;
  else crankLength = 175;

  return [
    {
      key: "saddle-height",
      label: "Saddle height",
      current: current.saddleHeightMm,
      min: 620,
      max: 860,
      idealMin: roundHalf(saddleHeight - 10),
      idealMax: roundHalf(saddleHeight + 10),
      unit: "mm",
    },
    {
      key: "saddle-setback",
      label: "Saddle setback",
      current: current.saddleSetbackMm,
      min: 35,
      max: 95,
      idealMin: roundHalf(saddleSetback - 8),
      idealMax: roundHalf(saddleSetback + 8),
      unit: "mm",
    },
    {
      key: "stem-length",
      label: "Stem length",
      current: current.stemLengthMm,
      min: 70,
      max: 140,
      idealMin: roundHalf(stemLength - 10),
      idealMax: roundHalf(stemLength + 10),
      unit: "mm",
    },
    {
      key: "bar-width",
      label: "Bar width",
      current: current.handlebarWidthMm,
      min: 360,
      max: 460,
      idealMin: roundHalf(barWidth - 10),
      idealMax: roundHalf(barWidth + 10),
      unit: "mm",
    },
    {
      key: "reach",
      label: "Reach to hoods",
      current: current.reachToHoodsMm,
      min: 430,
      max: 620,
      idealMin: roundHalf(reachToHoods - 20),
      idealMax: roundHalf(reachToHoods + 20),
      unit: "mm",
    },
    {
      key: "crank-length",
      label: "Crank length",
      current: current.crankLengthMm,
      min: 165,
      max: 177.5,
      idealMin: roundHalf(crankLength - 2.5),
      idealMax: roundHalf(crankLength + 2.5),
      unit: "mm",
    },
    {
      key: "spacer-stack",
      label: "Spacer stack",
      current: current.spacerStackMm,
      min: 0,
      max: 55,
      idealMin: roundHalf(spacerStack - 8),
      idealMax: roundHalf(spacerStack + 8),
      unit: "mm",
    },
  ].map((metric) => ({
    ...metric,
    idealMin: clamp(metric.idealMin, metric.min, metric.max),
    idealMax: clamp(metric.idealMax, metric.min, metric.max),
  }));
}

function FitRangeBar({ metric }: { metric: MetricTarget }) {
  const range = metric.max - metric.min;
  const lowEnd = ((metric.idealMin - metric.min) / range) * 100;
  const highStart = ((metric.idealMax - metric.min) / range) * 100;
  const zoneMid = lowEnd + Math.max(0, highStart - lowEnd) / 2;
  const markerPercent =
    typeof metric.current === "number"
      ? clamp(((metric.current - metric.min) / range) * 100, 0, 100)
      : undefined;
  const inGoldilocksZone =
    typeof metric.current === "number" &&
    metric.current >= metric.idealMin &&
    metric.current <= metric.idealMax;

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{metric.label}</p>
        <p className="text-xs text-slate-600">
          Ideal {metric.idealMin.toFixed(1)}-{metric.idealMax.toFixed(1)} {metric.unit}
        </p>
      </div>

      <div className="mt-2">
        <div className="relative h-5 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          <div className="absolute inset-y-0 left-0 bg-rose-200" style={{ width: `${lowEnd}%` }} />
          <div
            className="absolute inset-y-0 bg-emerald-300"
            style={{ left: `${lowEnd}%`, width: `${Math.max(0, highStart - lowEnd)}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 bg-amber-200"
            style={{ width: `${Math.max(0, 100 - highStart)}%` }}
          />
          {typeof markerPercent === "number" ? (
            <div
              className="absolute inset-y-0 w-0.5 bg-slate-900"
              style={{ left: `calc(${markerPercent}% - 1px)` }}
              aria-hidden="true"
            />
          ) : null}
        </div>

        <div className="relative mt-1 h-4 text-[11px] text-slate-500">
          <span className="absolute left-0 top-0">Too low</span>
          <span className="absolute right-0 top-0">Too high</span>
          <span
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap font-medium text-emerald-700"
            style={{ left: `${zoneMid}%` }}
          >
            Goldilocks zone
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-slate-600">
          Current:{" "}
          {typeof metric.current === "number"
            ? `${metric.current.toFixed(1)} ${metric.unit}`
            : "Not set"}
        </p>
        {typeof metric.current === "number" ? (
          <p
            className={
              inGoldilocksZone
                ? "font-semibold text-emerald-700"
                : "font-semibold text-amber-700"
            }
          >
            {inGoldilocksZone ? "In zone" : "Outside zone"}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function FitRangeCoach({ current }: FitRangeCoachProps) {
  const [dimensions, setDimensions] = useState<RiderDimensions>(defaultDimensions);
  const [lengthUnit, setLengthUnit] = useState<RiderLengthUnit>("cm");
  const [showDimensionsHelp, setShowDimensionsHelp] = useState(false);
  const [draftInputs, setDraftInputs] = useState<
    Partial<Record<RiderEditableField, string>>
  >({});

  useEffect(() => {
    if (!showDimensionsHelp) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowDimensionsHelp(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showDimensionsHelp]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dimensions));
  }, [dimensions]);
  useEffect(() => {
    localStorage.setItem(STORAGE_UNIT_KEY, lengthUnit);
  }, [lengthUnit]);

  const metrics = useMemo(
    () => getRecommendedMetrics(dimensions, current),
    [current, dimensions],
  );

  function clearDraft(field: RiderEditableField) {
    setDraftInputs((previous) => {
      if (!(field in previous)) {
        return previous;
      }

      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  function getInputDisplayValue(field: RiderEditableField) {
    const draft = draftInputs[field];
    if (typeof draft === "string") {
      return draft;
    }

    if (LENGTH_FIELDS.includes(field as RiderLengthField)) {
      return String(
        toDisplayLength(dimensions[field as RiderLengthField], lengthUnit),
      );
    }

    return String(dimensions[field as RiderScoreField]);
  }

  function updateLengthField(field: RiderLengthField, rawValue: string) {
    setDraftInputs((previous) => ({
      ...previous,
      [field]: rawValue,
    }));

    if (rawValue.trim() === "") {
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return;
    }

    setDimensions((previous) =>
      sanitizeDimensions({
        ...previous,
        [field]: toCentimeters(parsed, lengthUnit),
      }),
    );
  }

  function updateScoreField(field: RiderScoreField, rawValue: string) {
    setDraftInputs((previous) => ({
      ...previous,
      [field]: rawValue,
    }));

    if (rawValue.trim() === "") {
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return;
    }

    setDimensions((previous) =>
      sanitizeDimensions({
        ...previous,
        [field]: parsed,
      }),
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight text-slate-900">
            Current Fit Metric Stack
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Enter rider dimensions, then compare current bike fit against a target range.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDimensions(defaultDimensions);
            setDraftInputs({});
          }}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Reset defaults
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Rider dimensions
            </p>
            <button
              type="button"
              onClick={() => setShowDimensionsHelp(true)}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
              aria-label="Rider dimensions help"
              title="Rider dimensions help"
            >
              i
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Units
            <select
              value={lengthUnit}
              onChange={(event) => {
                const nextUnit = event.currentTarget.value === "in" ? "in" : "cm";
                setLengthUnit(nextUnit);
                setDraftInputs((previous) => {
                  const next = { ...previous };
                  for (const field of LENGTH_FIELDS) {
                    delete next[field];
                  }
                  return next;
                });
              }}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
            >
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </label>
        </div>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-slate-700">
            Height ({lengthUnit})
            <input
              type="number"
              step={lengthUnit === "cm" ? "0.1" : "0.01"}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
              value={getInputDisplayValue("heightCm")}
              onChange={(event) => updateLengthField("heightCm", event.currentTarget.value)}
              onBlur={() => clearDraft("heightCm")}
            />
          </label>
          <label className="text-xs text-slate-700">
            Inseam ({lengthUnit})
            <input
              type="number"
              step={lengthUnit === "cm" ? "0.1" : "0.01"}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
              value={getInputDisplayValue("inseamCm")}
              onChange={(event) => updateLengthField("inseamCm", event.currentTarget.value)}
              onBlur={() => clearDraft("inseamCm")}
            />
          </label>
          <label className="text-xs text-slate-700">
            Torso ({lengthUnit})
            <input
              type="number"
              step={lengthUnit === "cm" ? "0.1" : "0.01"}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
              value={getInputDisplayValue("torsoCm")}
              onChange={(event) => updateLengthField("torsoCm", event.currentTarget.value)}
              onBlur={() => clearDraft("torsoCm")}
            />
          </label>
          <label className="text-xs text-slate-700">
            Arm ({lengthUnit})
            <input
              type="number"
              step={lengthUnit === "cm" ? "0.1" : "0.01"}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
              value={getInputDisplayValue("armCm")}
              onChange={(event) => updateLengthField("armCm", event.currentTarget.value)}
              onBlur={() => clearDraft("armCm")}
            />
          </label>
          <label className="text-xs text-slate-700">
            Shoulder width ({lengthUnit})
            <input
              type="number"
              step={lengthUnit === "cm" ? "0.1" : "0.01"}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
              value={getInputDisplayValue("shoulderWidthCm")}
              onChange={(event) =>
                updateLengthField("shoulderWidthCm", event.currentTarget.value)
              }
              onBlur={() => clearDraft("shoulderWidthCm")}
            />
          </label>
          <label className="text-xs text-slate-700">
            Flexibility (1-5)
            <input
              type="number"
              min={1}
              max={5}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
              value={getInputDisplayValue("flexibility")}
              onChange={(event) => updateScoreField("flexibility", event.currentTarget.value)}
              onBlur={() => clearDraft("flexibility")}
            />
          </label>
          <label className="text-xs text-slate-700">
            Riding posture (1-5)
            <input
              type="number"
              min={1}
              max={5}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
              value={getInputDisplayValue("posture")}
              onChange={(event) => updateScoreField("posture", event.currentTarget.value)}
              onBlur={() => clearDraft("posture")}
            />
          </label>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {metrics.map((metric) => (
          <FitRangeBar key={metric.key} metric={metric} />
        ))}
      </ul>

      {showDimensionsHelp ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          onClick={() => setShowDimensionsHelp(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="rider-dimensions-help-title"
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4
                  id="rider-dimensions-help-title"
                  className="font-display text-xl font-semibold text-slate-900"
                >
                  Rider Dimensions Guide
                </h4>
                <p className="mt-1 text-sm text-slate-600">
                  These inputs tune your target fit ranges. Expand each section for measurement
                  instructions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDimensionsHelp(false)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {riderMeasurementGuides.map((guide) => (
                <details
                  key={guide.key}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                    {guide.label}
                  </summary>
                  <p className="mt-2 text-xs text-slate-600">{guide.definition}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-700">
                    {guide.steps.map((step, index) => (
                      <li key={`${guide.key}-${index}`}>{step}</li>
                    ))}
                  </ol>
                </details>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-slate-500">
        Fit ranges are guidance, not medical or professional fitting advice.
      </p>
    </section>
  );
}
