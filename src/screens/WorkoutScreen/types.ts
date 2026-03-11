import type {
  EstimationSource,
  SharedExerciseMedia,
  TrackingMode,
} from "../../types/firestore.ts";

export interface WorkoutScreenProps {
  userId: string;
  onCreateSession: () => void;
  onStartPlan: (plan: WorkoutPlanToStart) => void;
  onEditPlan: (plan: WorkoutPlanToStart) => void;
  refreshKey?: number;
}

export interface WorkoutPlanExercise {
  key: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  trackingMode: TrackingMode;
  targetSets: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  targetDurationSec: number | null;
  restSec: number;
  instructions?: string | null;
  isMachine?: boolean;
  hasImage?: boolean;
  hasVideo?: boolean;
  media?: SharedExerciseMedia | null;
  source?: string | null;
  sourceUrl?: string | null;
  sourceId?: string | null;
  license?: string | null;
}

export interface WorkoutPlanToStart {
  id: string;
  name: string;
  gymName: string;
  estimatedDurationMin: number | null;
  estimatedCaloriesKcal: number | null;
  estimationSource: EstimationSource | null;
  exercises: WorkoutPlanExercise[];
}

export interface PlanCard extends WorkoutPlanToStart {
  exerciseCount: number;
  exerciseNames: string[];
}
