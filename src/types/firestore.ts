import type { Timestamp } from "firebase/firestore";

export const TRACKING_MODES = [
  "weight_reps",
  "reps_only",
  "duration_only",
] as const;

export type TrackingMode = (typeof TRACKING_MODES)[number];

export const SESSION_STATUSES = ["active", "completed", "cancelled"] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];
export const SESSION_EXERCISE_STATUSES = [
  "active",
  "completed",
  "cancelled",
] as const;

export type SessionExerciseStatus = (typeof SESSION_EXERCISE_STATUSES)[number];
export type EstimationSource = "formula" | "gemini" | "hybrid" | "formula_fallback";

interface TimestampedDoc {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserProfileDoc extends TimestampedDoc {
  displayName: string;
  email: string;
  defaultRestSec: number;
}

export interface ExerciseDoc extends TimestampedDoc {
  name: string;
  category: string;
  trackingMode: TrackingMode;
  defaultSets: number;
  defaultReps: number | null;
  defaultWeightKg: number | null;
  defaultDurationSec: number | null;
  defaultRestSec: number;
  isActive: boolean;
}

export interface PlanDoc extends TimestampedDoc {
  name: string;
  gymName: string;
  isActive: boolean;
  estimatedDurationMin: number | null;
  estimatedCaloriesKcal: number | null;
  estimationSource: EstimationSource | null;
  estimatedAt: Timestamp | null;
}

export interface PlanItemDoc extends TimestampedDoc {
  order: number;
  exerciseId: string;
  targetSets: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  targetDurationSec: number | null;
  restSec: number;
  notes: string;
}

export interface SessionDoc extends TimestampedDoc {
  planId: string | null;
  gymName: string;
  status: SessionStatus;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  durationSec: number | null;
  estimatedDurationMin: number | null;
  estimatedCaloriesKcal: number | null;
  estimationSource: EstimationSource | null;
  estimatedAt: Timestamp | null;
  notes: string;
}

export interface SessionExerciseDoc extends TimestampedDoc {
  exerciseId: string;
  exerciseNameSnapshot: string;
  status: SessionExerciseStatus;
  completedAt: Timestamp | null;
  order: number;
  trackingMode: TrackingMode;
  targetSets: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  targetDurationSec: number | null;
  restSec: number;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  completedSets: number;
  totalReps: number;
  totalVolumeKg: number;
  totalDurationSec: number;
}

export interface SetEntryDoc extends TimestampedDoc {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  restPlannedSec: number | null;
  restStartAt: Timestamp | null;
  restEndAt: Timestamp | null;
  isWarmup: boolean;
  rpe: number | null;
}

export interface ActiveSessionDoc {
  sessionId: string;
  activeExerciseId: string | null;
  activeSetNumber: number;
  restEndsAt: Timestamp | null;
  updatedAt: Timestamp;
}

export interface BodyMetricDoc extends TimestampedDoc {
  measuredAt: Timestamp;
  weightKg: number;
  bodyFatPct: number | null;
  musclePct: number | null;
  muscleMassKg: number | null;
  note: string;
}

export type ProgressPhotoMediaType = "image" | "video";
export type ProgressPhotoKind = "original" | "fade";

export interface ProgressPhotoDoc extends TimestampedDoc {
  takenAt: Timestamp;
  storagePath: string;
  thumbnailPath: string | null;
  weightKgSnapshot: number | null;
  bodyFatPctSnapshot: number | null;
  note: string;
  mediaType?: ProgressPhotoMediaType;
  kind?: ProgressPhotoKind;
  sourcePhotoIds?: string[] | null;
}

export interface ExerciseStatsDoc {
  bestWeightKg: number;
  bestVolumeKg: number;
  bestEstimated1RM: number;
  lastSessionAt: Timestamp | null;
  totalSessions: number;
  updatedAt: Timestamp;
}

export interface ExerciseTimelinePointDoc extends TimestampedDoc {
  date: Timestamp;
  bestWeightKg: number;
  volumeKg: number;
  totalReps: number;
  estimated1RM: number;
  sessionId: string;
}
