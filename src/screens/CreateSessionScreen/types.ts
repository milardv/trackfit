import type {
  EstimationSource,
  ExerciseDoc,
  TrackingMode,
} from "../../types/firestore.ts";

export interface SessionExerciseSelection {
  id: string;
  name: string;
  trackingMode: TrackingMode;
  defaultSets: number;
  defaultReps: number | null;
  defaultWeightKg: number | null;
  defaultDurationSec: number | null;
  defaultRestSec: number;
}

export interface SessionConfig {
  name: string;
  gymName: string;
  exercises: SessionExerciseSelection[];
  estimatedDurationMin: number | null;
  estimatedCaloriesKcal: number | null;
  estimationSource: EstimationSource | null;
}

export interface SessionEstimate {
  estimatedDurationMin: number;
  estimatedCaloriesKcal: number;
  estimationSource: EstimationSource;
}

export type ExerciseOption = ExerciseDoc & { id: string };

export interface CreateSessionScreenProps {
  userId: string;
  onBack: () => void;
  onSave: (config: SessionConfig) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  mode?: "create" | "edit";
  initialConfig?: SessionConfig | null;
  isSubmitting?: boolean;
  isDeleting?: boolean;
  errorMessage?: string | null;
}
