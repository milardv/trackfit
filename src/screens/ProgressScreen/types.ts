import type { BodyMetricDoc, ProgressPhotoDoc, SessionDoc } from "../../types/firestore.ts";

export interface ProgressScreenProps {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  onSignOut: () => Promise<void>;
}

export type PeriodOption = "3m" | "6m" | "1y";

export type BodyMetricEntry = BodyMetricDoc & { id: string };
export type SessionEntry = SessionDoc & { id: string };

export interface ProgressPhotoEntry extends ProgressPhotoDoc {
  id: string;
  previewUrl: string | null;
}

export interface WeightChartPoint {
  id: string;
  label: string;
  value: number;
  ms: number;
}

export interface WeightChartGeometry {
  linePath: string;
  areaPath: string;
  dots: Array<{ id: string; x: number; y: number }>;
}

export interface WeightSummary {
  currentWeightKg: number | null;
  deltaWeightKg: number | null;
  currentBodyFatPct: number | null;
  deltaBodyFatPct: number | null;
  currentMusclePct: number | null;
  deltaMusclePct: number | null;
}

export interface SessionSummary {
  completedCount: number;
  thisMonthCount: number;
}
