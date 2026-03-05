import type { MeasureField, MeasureFieldConfig } from "./types.ts";

export const shortDateTime = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

export const MEASURE_FIELDS: MeasureField[] = [
  "weightKg",
  "bodyFatPct",
  "musclePct",
];

export const MEASURE_FIELD_CONFIG: Record<MeasureField, MeasureFieldConfig> = {
  weightKg: {
    label: "Poids",
    unit: "kg",
    min: 1,
    max: 350,
    required: true,
  },
  bodyFatPct: {
    label: "Masse grasse",
    unit: "%",
    min: 0,
    max: 100,
  },
  musclePct: {
    label: "Muscles",
    unit: "%",
    min: 0,
    max: 100,
  },
};
