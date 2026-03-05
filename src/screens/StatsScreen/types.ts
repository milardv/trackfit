import type { BodyMetricDoc, SessionExerciseDoc, TrackingMode } from "../../types/firestore.ts";

export type StatsTab = "force" | "volume" | "mesures";
export type MeasureField = "weightKg" | "bodyFatPct" | "musclePct";
export type ForceValueUnit = "pts" | "kg" | "reps" | "sec";

export interface MeasureFieldConfig {
  label: string;
  unit: string;
  min: number;
  max: number;
  required?: boolean;
}

export interface StatsScreenProps {
  userId: string;
}

export interface SessionExerciseRow extends SessionExerciseDoc {
  id: string;
  sessionId: string;
  sessionMs: number;
}

export interface ChartPoint {
  id: string;
  label: string;
  value: number;
}

export interface DetailRow {
  label: string;
  value: string;
}

export interface ForceChartPoint extends ChartPoint {
  sessionId: string;
  sessionMs: number;
  detailTitle: string;
  detailRows: DetailRow[];
}

export interface ForceChartModel {
  title: string;
  subtitle: string;
  yAxisLegend: string;
  valueUnit: ForceValueUnit;
  points: ForceChartPoint[];
}

export interface ExerciseFilterOption {
  id: string;
  name: string;
  trackingMode: TrackingMode;
  count: number;
  lastMs: number;
}

export interface ChartGeometry {
  linePath: string;
  areaPath: string;
  dots: Array<{ x: number; y: number }>;
}

export interface ChartBounds {
  min: number;
  max: number;
}

export interface ChartAxisConfig {
  label: string;
  decimals: number;
  min: number;
  max: number;
  ticks: number[];
}

export interface ForceSummary {
  currentValue: number | null;
  bestValue: number | null;
  monthDelta: number | null;
}

export interface VolumeRecentSummary {
  volumeKg: number;
  reps: number;
  volumeDeltaKg: number;
  repsDelta: number;
}

export interface MeasuresSummary {
  currentWeightKg: number | null;
  currentBodyFatPct: number | null;
  currentMusclePct: number | null;
  deltaWeightKg: number | null;
  deltaBodyFatPct: number | null;
  deltaMusclePct: number | null;
}

export interface MeasureFieldState {
  weightKg: string;
  bodyFatPct: string;
  musclePct: string;
}

export type BodyMetricEntry = BodyMetricDoc & { id: string };
