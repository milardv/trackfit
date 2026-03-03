import type { EstimationSource, TrackingMode } from "./firestore.ts";

export interface SessionEstimationExerciseInput {
  id: string;
  name: string;
  trackingMode: TrackingMode;
  targetSets: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  targetDurationSec: number | null;
  restSec: number;
}

export interface SessionEstimationInput {
  gymName?: string;
  bodyWeightKg?: number | null;
  exercises: SessionEstimationExerciseInput[];
}

export interface SessionEstimationResult {
  estimatedDurationMin: number;
  estimatedCaloriesKcal: number;
  estimationSource: EstimationSource;
}
